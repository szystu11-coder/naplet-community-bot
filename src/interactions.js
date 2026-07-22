const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle,
  ChannelType, PermissionFlagsBits, AttachmentBuilder, EmbedBuilder
} = require('discord.js');
const store = require('./store');
const sayDrafts = require('./say-drafts');
const { prepareSayFiles, sendSayMessage } = require('./say-files');
const { embed, COLORS, cleanName, formatSayText, sayUploadError } = require('./utils');

const TICKET_STAFF_ROLE_NAMES = new Set([
  'Owner', 'Head Admin', 'Senior Admin', 'Admin', 'Junior Admin',
  'Senior Moderator', 'Moderator', 'Junior Moderator', 'Support'
]);

function ticketStaffRoleIds(guild, cfg) {
  const ids = new Set([...(cfg.ticketStaffRoleIds || []), ...(cfg.ticketStaffRoleId ? [cfg.ticketStaffRoleId] : [])]);
  for (const role of guild.roles.cache.values()) {
    if (!role.managed && TICKET_STAFF_ROLE_NAMES.has(role.name)) ids.add(role.id);
  }
  return [...ids];
}

function isTicketStaff(member, cfg) {
  const allowedRoleIds = new Set(ticketStaffRoleIds(member.guild, cfg));
  return member.roles.cache.some(role => allowedRoleIds.has(role.id))
    || member.permissions.has(PermissionFlagsBits.ManageChannels);
}

function ticketPanel() {
  return {
    embeds: [embed('Centrum pomocy Naplet Community', 'Potrzebujesz pomocy? Kliknij przycisk poniżej i krótko opisz sprawę.\n\nNie twórz ticketów bez powodu.')],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket:create').setLabel('Utwórz ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary)
    )]
  };
}

function verificationPanel() {
  return {
    embeds: [embed('Weryfikacja', 'Kliknij przycisk, aby zaakceptować zasady i uzyskać dostęp do serwera.', COLORS.success)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify').setLabel('Zweryfikuj się').setEmoji('✅').setStyle(ButtonStyle.Success)
    )]
  };
}

async function sendTicketPanel(interaction) {
  const cfg = store.guildConfig(interaction.guildId);
  if (!cfg.ticketCategoryId || !cfg.ticketStaffRoleId) return interaction.reply({ content: 'Najpierw ustaw kategorię ticketów i rolę obsługi przez `/config`.', ephemeral: true });
  const channel = interaction.options.getChannel('kanal');
  await channel.send(ticketPanel());
  return interaction.reply({ content: `Panel wysłano na ${channel}.`, ephemeral: true });
}

async function sendVerificationPanel(interaction) {
  const cfg = store.guildConfig(interaction.guildId);
  if (!cfg.verifiedRoleId) return interaction.reply({ content: 'Najpierw ustaw rolę zweryfikowaną przez `/config role`.', ephemeral: true });
  const channel = interaction.options.getChannel('kanal');
  await channel.send(verificationPanel());
  return interaction.reply({ content: `Panel wysłano na ${channel}.`, ephemeral: true });
}

async function handleComponent(interaction, client) {
  if (interaction.isButton() && interaction.customId === 'verify') return verify(interaction);
  if (interaction.isButton() && interaction.customId === 'ticket:create') return showTicketModal(interaction);
  if (interaction.isModalSubmit() && interaction.customId === 'ticket:create-modal') return createTicket(interaction);
  if (interaction.isModalSubmit() && interaction.customId.startsWith('say:modal')) return sendSayModal(interaction);
  if (interaction.isButton() && interaction.customId.startsWith('ticket:close:')) return closeTicket(interaction);
  if (interaction.isButton() && interaction.customId.startsWith('ticket:claim:')) return claimTicket(interaction);
  if (interaction.isButton() && interaction.customId.startsWith('giveaway:join:')) return joinGiveaway(interaction);
}

async function sendSayModal(interaction) {
  const content = formatSayText(interaction.fields.getTextInputValue('content'));
  const draftKey = interaction.customId.split(':')[2];
  const draft = draftKey ? sayDrafts.consume(draftKey, interaction) : null;
  if (draftKey && !draft) {
    return interaction.reply({ content: 'Edytor wygasł. Uruchom `/say` ponownie.', ephemeral: true });
  }
  const message = new EmbedBuilder().setColor(COLORS.primary).setDescription(content);
  const files = draft?.files ?? [];
  await interaction.reply({
    content: files.length ? `Wysyłam ${files.length} ${files.length === 1 ? 'plik' : files.length < 5 ? 'pliki' : 'plików'}…` : 'Wysyłam wiadomość…',
    ephemeral: true
  });
  try {
    const preparedFiles = await prepareSayFiles(files);
    if (preparedFiles.length) await interaction.editReply(`Pobrano ${preparedFiles.length} ${preparedFiles.length === 1 ? 'plik' : preparedFiles.length < 5 ? 'pliki' : 'plików'}. Przesyłam na kanał…`);
    await sendSayMessage(interaction.channelId, { embeds: [message] }, preparedFiles, async (sent, total) => {
      await interaction.editReply(`Wysłano pliki: **${sent}/${total}**…`);
    });
    return interaction.editReply('Wiadomość została wysłana.');
  } catch (error) {
    console.error('Nie udało się wysłać wiadomości z edytora /say:', error);
    return interaction.editReply(sayUploadError(error));
  }
}

async function verify(interaction) {
  const cfg = store.guildConfig(interaction.guildId);
  if (!cfg.verifiedRoleId) return interaction.reply({ content: 'Weryfikacja nie została jeszcze skonfigurowana.', ephemeral: true });
  const alreadyVerified = interaction.member.roles.cache.has(cfg.verifiedRoleId);
  try {
    if (!alreadyVerified) await interaction.member.roles.add(cfg.verifiedRoleId, 'Weryfikacja przyciskiem');
  } catch (error) {
    console.error('Nie udało się nadać roli weryfikacyjnej:', error);
    return interaction.reply({ content: 'Nie mogę nadać roli weryfikacyjnej. Sprawdź pozycję roli i uprawnienie „Zarządzanie rolami”.', ephemeral: true });
  }

  let warning = '';
  if (cfg.unverifiedRoleId && cfg.unverifiedRoleId !== interaction.guildId && interaction.member.roles.cache.has(cfg.unverifiedRoleId)) {
    try {
      await interaction.member.roles.remove(cfg.unverifiedRoleId, 'Zakończona weryfikacja');
    } catch (error) {
      console.error('Nie udało się usunąć roli niezweryfikowanej:', error);
      warning = '\n\n⚠️ Nadano dostęp, ale nie udało się usunąć roli niezweryfikowanej.';
    }
  }
  const description = alreadyVerified ? `Jesteś już zweryfikowany/a.${warning}` : `Weryfikacja przebiegła pomyślnie. Miłej zabawy!${warning}`;
  return interaction.reply({ embeds: [embed('Gotowe!', description, COLORS.success)], ephemeral: true });
}

async function showTicketModal(interaction) {
  const open = Object.values(store.data.tickets).find(t => t.guildId === interaction.guildId && t.ownerId === interaction.user.id && t.status === 'open');
  if (open) return interaction.reply({ content: `Masz już otwarty ticket: <#${open.channelId}>`, ephemeral: true });
  const modal = new ModalBuilder().setCustomId('ticket:create-modal').setTitle('Nowy ticket');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('reason').setLabel('W czym możemy pomóc?').setStyle(TextInputStyle.Paragraph).setMinLength(5).setMaxLength(800).setRequired(true)
  ));
  return interaction.showModal(modal);
}

async function createTicket(interaction) {
  const cfg = store.guildConfig(interaction.guildId);
  if (!cfg.ticketCategoryId || !cfg.ticketStaffRoleId) return interaction.reply({ content: 'System ticketów nie jest skonfigurowany.', ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  const duplicate = Object.values(store.data.tickets).find(t => t.guildId === interaction.guildId && t.ownerId === interaction.user.id && t.status === 'open');
  if (duplicate) return interaction.editReply(`Masz już otwarty ticket: <#${duplicate.channelId}>`);
  const id = store.nextId('ticket');
  const reason = interaction.fields.getTextInputValue('reason');
  const staffRoleIds = ticketStaffRoleIds(interaction.guild, cfg);
  const channel = await interaction.guild.channels.create({
    name: `ticket-${id}-${cleanName(interaction.user.username)}`,
    type: ChannelType.GuildText,
    parent: cfg.ticketCategoryId,
    topic: `Ticket #${id} | Autor: ${interaction.user.tag} (${interaction.user.id})`,
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
      ...staffRoleIds.map(roleId => ({
        id: roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageMessages]
      }))
    ]
  });
  store.data.tickets[id] = { id, guildId: interaction.guildId, channelId: channel.id, ownerId: interaction.user.id, reason, status: 'open', claimedBy: null, createdAt: Date.now() };
  store.save();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket:claim:${id}`).setLabel('Przejmij').setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ticket:close:${id}`).setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );
  const staffMentions = staffRoleIds.map(roleId => `<@&${roleId}>`).join(' ');
  await channel.send({ content: `${interaction.user} ${staffMentions}`, embeds: [embed(`Ticket #${id}`, `**Autor:** ${interaction.user}\n**Powód:** ${reason}`)], components: [row] });
  await interaction.editReply(`Ticket utworzony: ${channel}`);
}

async function claimTicket(interaction) {
  const id = interaction.customId.split(':')[2];
  const ticket = store.data.tickets[id];
  const cfg = store.guildConfig(interaction.guildId);
  if (!ticket || ticket.status !== 'open') return interaction.reply({ content: 'Ten ticket nie jest już aktywny.', ephemeral: true });
  if (!isTicketStaff(interaction.member, cfg)) return interaction.reply({ content: 'Tylko obsługa może przejąć ticket.', ephemeral: true });
  ticket.claimedBy = interaction.user.id;
  store.save();
  return interaction.reply({ embeds: [embed('Ticket przejęty', `${interaction.user} zajmuje się tym zgłoszeniem.`, COLORS.info)] });
}

async function closeTicket(interaction) {
  const id = interaction.customId.split(':')[2];
  const ticket = store.data.tickets[id];
  const cfg = store.guildConfig(interaction.guildId);
  if (!ticket || ticket.status !== 'open') return interaction.reply({ content: 'Ten ticket nie jest już aktywny.', ephemeral: true });
  const allowed = interaction.user.id === ticket.ownerId || isTicketStaff(interaction.member, cfg);
  if (!allowed) return interaction.reply({ content: 'Nie możesz zamknąć tego ticketu.', ephemeral: true });
  await interaction.deferReply();
  const messages = await fetchAllMessages(interaction.channel);
  const transcript = messages.reverse().map(m => `[${m.createdAt.toISOString()}] ${m.author?.tag ?? 'Nieznany'}: ${m.cleanContent || '(załącznik/embed)'}${m.attachments.size ? ` | ${[...m.attachments.values()].map(a => a.url).join(', ')}` : ''}`).join('\n');
  const attachment = new AttachmentBuilder(Buffer.from(transcript || 'Brak wiadomości', 'utf8'), { name: `ticket-${id}.txt` });
  ticket.status = 'closed'; ticket.closedAt = Date.now(); ticket.closedBy = interaction.user.id;
  store.save();
  const logChannel = cfg.ticketLogChannelId ? await interaction.guild.channels.fetch(cfg.ticketLogChannelId).catch(() => null) : null;
  if (logChannel) await logChannel.send({ embeds: [embed(`Zamknięto ticket #${id}`, `**Autor:** <@${ticket.ownerId}>\n**Zamknął:** ${interaction.user}\n**Powód:** ${ticket.reason}`, COLORS.danger)], files: [attachment] });
  await interaction.editReply('Ticket zamknięty. Kanał zostanie usunięty za 5 sekund.');
  setTimeout(() => interaction.channel.delete(`Ticket #${id} zamknięty przez ${interaction.user.tag}`).catch(() => {}), 5000);
}

async function fetchAllMessages(channel) {
  const all = []; let before;
  while (all.length < 1000) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    all.push(...batch.values()); before = batch.last().id;
    if (batch.size < 100) break;
  }
  return all;
}

async function joinGiveaway(interaction) {
  const id = interaction.customId.split(':')[2];
  const giveaway = store.data.giveaways[id];
  if (!giveaway || giveaway.ended || giveaway.endAt <= Date.now()) return interaction.reply({ content: 'Ten konkurs jest już zakończony.', ephemeral: true });
  const index = giveaway.entrants.indexOf(interaction.user.id);
  if (index >= 0) {
    giveaway.entrants.splice(index, 1); store.save();
    return interaction.reply({ content: 'Wycofano Twój udział w konkursie.', ephemeral: true });
  }
  giveaway.entrants.push(interaction.user.id); store.save();
  return interaction.reply({ content: `Bierzesz udział w konkursie! Aktualna liczba uczestników: **${giveaway.entrants.length}**.`, ephemeral: true });
}

module.exports = { handleComponent, sendTicketPanel, sendVerificationPanel };

