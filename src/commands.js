const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder,
  ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const store = require('./store');
const sayDrafts = require('./say-drafts');
const { prepareSayFiles, sendSayMessage } = require('./say-files');
const { embed, COLORS, parseDuration, truncate, formatSayText, sayUploadError } = require('./utils');
const { sendLog } = require('./events');

const sayAttachmentOptionNames = Array.from(
  { length: 10 },
  (_, index) => index === 0 ? 'plik' : `plik_${index + 1}`
);

function addSayAttachmentOptions(command) {
  for (const [index, name] of sayAttachmentOptionNames.entries()) {
    command.addAttachmentOption(option => option
      .setName(name)
      .setDescription(index === 0 ? 'Opcjonalny plik lub obraz' : `Opcjonalny plik nr ${index + 1}`)
      .setRequired(false));
  }
  return command;
}

const commandData = [
  new SlashCommandBuilder()
    .setName('config').setDescription('Konfiguracja bota')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('channel').setDescription('Ustaw kanał')
      .addStringOption(o => o.setName('typ').setDescription('Przeznaczenie').setRequired(true).addChoices(
        { name: 'Logi serwera', value: 'logChannelId' }, { name: 'Powitania', value: 'welcomeChannelId' },
        { name: 'Logi ticketów', value: 'ticketLogChannelId' }
      )).addChannelOption(o => o.setName('kanal').setDescription('Kanał').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s => s.setName('role').setDescription('Ustaw rolę')
      .addStringOption(o => o.setName('typ').setDescription('Przeznaczenie').setRequired(true).addChoices(
        { name: 'Zweryfikowany', value: 'verifiedRoleId' }, { name: 'Niezweryfikowany', value: 'unverifiedRoleId' },
        { name: 'Obsługa ticketów', value: 'ticketStaffRoleId' }
      )).addRoleOption(o => o.setName('rola').setDescription('Rola').setRequired(true)))
    .addSubcommand(s => s.setName('category').setDescription('Ustaw kategorię ticketów')
      .addChannelOption(o => o.setName('kategoria').setDescription('Kategoria').addChannelTypes(ChannelType.GuildCategory).setRequired(true)))
    .addSubcommand(s => s.setName('welcome').setDescription('Ustaw treść powitania')
      .addStringOption(o => o.setName('tekst').setDescription('Zmienne: {user}, {server}, {count}').setRequired(true).setMaxLength(1000)))
    .addSubcommand(s => s.setName('show').setDescription('Pokaż aktualną konfigurację')),
  new SlashCommandBuilder()
    .setName('ticket-panel').setDescription('Wyślij panel tworzenia ticketów')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName('kanal').setDescription('Kanał panelu').addChannelTypes(ChannelType.GuildText).setRequired(true)),
  new SlashCommandBuilder()
    .setName('verification-panel').setDescription('Wyślij panel weryfikacji')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addChannelOption(o => o.setName('kanal').setDescription('Kanał panelu').addChannelTypes(ChannelType.GuildText).setRequired(true)),
  new SlashCommandBuilder()
    .setName('usun').setDescription('Usuwanie zawartości kanału')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(s => s.setName('wiadomosci').setDescription('Usuń wiadomości z kanału, również starsze niż 14 dni')
      .addIntegerOption(o => o.setName('ilosc').setDescription('Liczba wiadomości do usunięcia').setRequired(true).setMinValue(1))),
  new SlashCommandBuilder()
    .setName('warn').setDescription('Nadaj użytkownikowi ostrzeżenie')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('uzytkownik').setDescription('Użytkownik, którego chcesz ostrzec').setRequired(true))
    .addStringOption(o => o.setName('powod').setDescription('Powód ostrzeżenia').setRequired(true).setMinLength(2).setMaxLength(1000)),
  new SlashCommandBuilder()
    .setName('warny').setDescription('Pokaż aktywne ostrzeżenia użytkownika')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('uzytkownik').setDescription('Użytkownik, którego ostrzeżenia chcesz sprawdzić').setRequired(true)),
  new SlashCommandBuilder()
    .setName('unwarn').setDescription('Usuń ostrzeżenie po jego ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption(o => o.setName('id').setDescription('ID ostrzeżenia').setRequired(true).setMinValue(1))
    .addStringOption(o => o.setName('powod').setDescription('Powód usunięcia ostrzeżenia').setRequired(false).setMaxLength(500)),
  new SlashCommandBuilder()
    .setName('przekieruj').setDescription('Przekieruj aktualny ticket do SQEZZ')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  addSayAttachmentOptions(new SlashCommandBuilder()
    .setName('say').setDescription('Wyślij wiadomość jako bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(o => o.setName('tekst').setDescription('Krótka treść; pomiń, aby otworzyć edytor wieloliniowy').setRequired(false).setMaxLength(4000))),
  new SlashCommandBuilder()
    .setName('giveaway').setDescription('Zarządzaj konkursami')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('start').setDescription('Rozpocznij konkurs')
      .addStringOption(o => o.setName('nagroda').setDescription('Nagroda').setRequired(true).setMaxLength(200))
      .addStringOption(o => o.setName('czas').setDescription('Np. 30m, 2h, 3d').setRequired(true))
      .addIntegerOption(o => o.setName('zwyciezcy').setDescription('Liczba zwycięzców').setMinValue(1).setMaxValue(20))
      .addChannelOption(o => o.setName('kanal').setDescription('Kanał konkursu').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(s => s.setName('end').setDescription('Zakończ konkurs wcześniej')
      .addIntegerOption(o => o.setName('id').setDescription('ID konkursu').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('reroll').setDescription('Wylosuj ponownie')
      .addIntegerOption(o => o.setName('id').setDescription('ID konkursu').setRequired(true).setMinValue(1)))
].map(command => command.toJSON());

async function handleCommand(interaction, helpers) {
  if (interaction.commandName === 'config') return configCommand(interaction);
  if (interaction.commandName === 'ticket-panel') return helpers.sendTicketPanel(interaction);
  if (interaction.commandName === 'verification-panel') return helpers.sendVerificationPanel(interaction);
  if (interaction.commandName === 'usun') return deleteMessagesCommand(interaction);
  if (interaction.commandName === 'warn') return warnCommand(interaction);
  if (interaction.commandName === 'warny') return warningsCommand(interaction);
  if (interaction.commandName === 'unwarn') return unwarnCommand(interaction);
  if (interaction.commandName === 'przekieruj') return redirectTicketCommand(interaction);
  if (interaction.commandName === 'say') return sayCommand(interaction);
  if (interaction.commandName === 'giveaway') return giveawayCommand(interaction, helpers);
}

async function warnCommand(interaction) {
  const user = interaction.options.getUser('uzytkownik');
  const member = interaction.options.getMember('uzytkownik');
  const reason = interaction.options.getString('powod').trim();

  if (user.id === interaction.user.id) {
    return interaction.reply({ content: 'Nie możesz nadać ostrzeżenia samemu sobie.', ephemeral: true });
  }
  if (user.bot) {
    return interaction.reply({ content: 'Nie można ostrzegać botów.', ephemeral: true });
  }
  if (!member) {
    return interaction.reply({ content: 'Ten użytkownik nie znajduje się już na serwerze.', ephemeral: true });
  }
  if (member.id === interaction.guild.ownerId || member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: 'Nie można nadać ostrzeżenia właścicielowi ani administratorowi serwera.', ephemeral: true });
  }
  if (interaction.member.id !== interaction.guild.ownerId && member.roles.highest.position >= interaction.member.roles.highest.position) {
    return interaction.reply({ content: 'Nie możesz ostrzec osoby z rolą równą lub wyższą od Twojej.', ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const id = store.nextId('warning');
  const warning = {
    id,
    guildId: interaction.guildId,
    userId: user.id,
    moderatorId: interaction.user.id,
    reason,
    createdAt: Date.now(),
    active: true
  };
  store.data.warnings[id] = warning;
  store.save();

  const activeCount = activeWarnings(interaction.guildId, user.id).length;
  const dmSent = await user.send({ embeds: [
    new EmbedBuilder()
      .setColor(COLORS.danger)
      .setTitle(`⚠️ Ostrzeżenie na ${interaction.guild.name}`)
      .setDescription(`**Powód:** ${reason}\n\n**Moderator:** ${interaction.user.tag}\n**ID ostrzeżenia:** \`${id}\`\n**Aktywne ostrzeżenia:** ${activeCount}`)
      .setTimestamp()
  ] }).then(() => true).catch(() => false);

  await sendLog(
    interaction.guild,
    '⚠️ Nadano ostrzeżenie',
    `**Użytkownik:** ${user} (${user.tag})\n**Moderator:** ${interaction.user}\n**Powód:** ${reason}\n**ID:** \`${id}\`\n**Aktywne ostrzeżenia:** ${activeCount}`,
    COLORS.danger
  );

  return interaction.editReply({
    embeds: [embed('⚠️ Ostrzeżenie nadane', `${user} otrzymał/a ostrzeżenie.\n\n**Powód:** ${reason}\n**ID:** \`${id}\`\n**Aktywne ostrzeżenia:** ${activeCount}${dmSent ? '' : '\n\n*Nie udało się wysłać użytkownikowi wiadomości prywatnej.*'}`, COLORS.danger)],
  });
}

async function warningsCommand(interaction) {
  const user = interaction.options.getUser('uzytkownik');
  const warnings = activeWarnings(interaction.guildId, user.id);
  if (!warnings.length) {
    return interaction.reply({ content: `${user} nie ma żadnych aktywnych ostrzeżeń.`, ephemeral: true });
  }

  const description = warnings
    .slice(0, 10)
    .map(warning => `**#${warning.id}** • <t:${Math.floor(warning.createdAt / 1000)}:f>\n${truncate(warning.reason, 250)}\nModerator: <@${warning.moderatorId}>`)
    .join('\n\n');
  const hidden = warnings.length > 10 ? `\n\n*Pokazano 10 z ${warnings.length} ostrzeżeń.*` : '';
  return interaction.reply({
    embeds: [new EmbedBuilder().setColor(COLORS.primary).setTitle(`⚠️ Ostrzeżenia: ${user.tag}`).setDescription(description + hidden).setFooter({ text: `Łącznie aktywnych: ${warnings.length}` }).setTimestamp()],
    ephemeral: true
  });
}

async function unwarnCommand(interaction) {
  const id = interaction.options.getInteger('id');
  const reason = interaction.options.getString('powod')?.trim() || 'Nie podano';
  const warning = store.data.warnings[id];
  if (!warning || warning.guildId !== interaction.guildId) {
    return interaction.reply({ content: `Nie znaleziono ostrzeżenia o ID \`${id}\` na tym serwerze.`, ephemeral: true });
  }
  if (!warning.active) {
    return interaction.reply({ content: `Ostrzeżenie \`${id}\` zostało już wcześniej usunięte.`, ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  warning.active = false;
  warning.removedAt = Date.now();
  warning.removedBy = interaction.user.id;
  warning.removalReason = reason;
  store.save();

  await sendLog(
    interaction.guild,
    '✅ Usunięto ostrzeżenie',
    `**Użytkownik:** <@${warning.userId}>\n**Moderator:** ${interaction.user}\n**ID:** \`${id}\`\n**Pierwotny powód:** ${warning.reason}\n**Powód usunięcia:** ${reason}`,
    COLORS.success
  );
  return interaction.editReply({
    embeds: [embed('✅ Ostrzeżenie usunięte', `Usunięto ostrzeżenie \`${id}\` użytkownika <@${warning.userId}>.\n\n**Powód usunięcia:** ${reason}`, COLORS.success)],
  });
}

function activeWarnings(guildId, userId) {
  return Object.values(store.data.warnings)
    .filter(warning => warning.guildId === guildId && warning.userId === userId && warning.active)
    .sort((a, b) => b.createdAt - a.createdAt);
}

async function redirectTicketCommand(interaction) {
  const cfg = store.guildConfig(interaction.guildId);
  const ticket = Object.values(store.data.tickets)
    .find(item => item.guildId === interaction.guildId && item.channelId === interaction.channelId && item.status === 'open');
  const isTicketChannel = ticket || (cfg.ticketCategoryId && interaction.channel?.parentId === cfg.ticketCategoryId);

  if (!isTicketChannel) {
    return interaction.reply({ content: 'Komendy `/przekieruj` można użyć tylko w aktywnym tickecie.', ephemeral: true });
  }
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({ content: 'Nie masz uprawnień do przekierowania tego ticketu.', ephemeral: true });
  }
  if (!interaction.channel?.isTextBased() || typeof interaction.channel.setName !== 'function') {
    return interaction.reply({ content: 'Nie udało się rozpoznać kanału tego ticketu.', ephemeral: true });
  }

  await interaction.deferReply();
  await interaction.channel.setName('do-sqezz', `Ticket przekierowany przez ${interaction.user.tag}`);

  if (ticket) {
    ticket.redirectedTo = 'sqezz';
    ticket.redirectedBy = interaction.user.id;
    ticket.redirectedAt = Date.now();
    store.save();
  }

  const ticketLabel = ticket ? `#${ticket.id}` : interaction.channel.id;
  await sendLog(
    interaction.guild,
    '➡️ Ticket przekierowany do SQEZZ',
    `**Ticket:** ${ticketLabel}\n**Kanał:** ${interaction.channel}\n**Przekierował:** ${interaction.user}`,
    COLORS.info
  );
  return interaction.editReply({
    embeds: [embed('➡️ Przekierowano do SQEZZ', `${interaction.user} przekierował/a ten ticket do **SQEZZ**. Nazwa kanału została zmieniona na \`do-sqezz\`.`, COLORS.info)]
  });
}

async function sayCommand(interaction) {
  const text = interaction.options.getString('tekst');
  const files = sayAttachmentOptionNames
    .map(name => interaction.options.getAttachment(name))
    .filter(Boolean)
    .map(file => ({ attachment: file.url, name: file.name, description: file.description ?? undefined, size: file.size }));
  if (!text && !files.length) {
    const draftKey = sayDrafts.create(interaction, files);
    const modal = new ModalBuilder().setCustomId(`say:modal:${draftKey}`).setTitle('Wiadomość bota');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('content')
        .setLabel('Treść wiadomości')
        .setPlaceholder('Wklej tutaj tekst z zachowaniem nowych linii...')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(1)
        .setMaxLength(4000)
        .setRequired(true)
    ));
    return interaction.showModal(modal);
  }
  const embeds = text
    ? [new EmbedBuilder().setColor(COLORS.primary).setDescription(formatSayText(text))]
    : [];
  await interaction.reply({
    content: files.length ? `Wysyłam ${files.length} ${files.length === 1 ? 'plik' : files.length < 5 ? 'pliki' : 'plików'}…` : 'Wysyłam wiadomość…',
    ephemeral: true
  });
  try {
    const preparedFiles = await prepareSayFiles(files);
    if (preparedFiles.length) await interaction.editReply(`Pobrano ${preparedFiles.length} ${preparedFiles.length === 1 ? 'plik' : preparedFiles.length < 5 ? 'pliki' : 'plików'}. Przesyłam na kanał…`);
    await sendSayMessage(interaction.channelId, { embeds }, preparedFiles, async (sent, total) => {
      await interaction.editReply(`Wysłano pliki: **${sent}/${total}**…`);
    });
    return interaction.editReply(text ? 'Wiadomość została wysłana.' : 'Pliki zostały wysłane.');
  } catch (error) {
    console.error('Nie udało się wysłać wiadomości przez /say:', error);
    return interaction.editReply(sayUploadError(error));
  }
}

async function deleteMessagesCommand(interaction) {
  if (!interaction.channel?.isTextBased() || !('bulkDelete' in interaction.channel)) {
    return interaction.reply({ content: 'Tej komendy można użyć tylko na zwykłym kanale tekstowym.', ephemeral: true });
  }
  const amount = interaction.options.getInteger('ilosc');
  await interaction.deferReply({ ephemeral: true });
  let deletedCount = 0;
  let failedCount = 0;
  let processedCount = 0;
  let before;
  let lastProgressUpdate = Date.now();
  const bulkDeleteCutoff = Date.now() - (13 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000);

  while (processedCount < amount) {
    const batch = await interaction.channel.messages.fetch({
      limit: Math.min(100, amount - processedCount),
      before
    });
    if (!batch.size) break;
    before = batch.last().id;
    processedCount += batch.size;

    const recent = batch.filter(message => message.createdTimestamp > bulkDeleteCutoff);
    const old = batch.filter(message => message.createdTimestamp <= bulkDeleteCutoff);

    if (recent.size) {
      const deleted = await interaction.channel.bulkDelete(recent, true);
      deletedCount += deleted.size;
      failedCount += recent.size - deleted.size;
    }

    for (const message of old.values()) {
      try {
        await message.delete();
        deletedCount++;
      } catch (error) {
        failedCount++;
        console.error(`Nie udało się usunąć starej wiadomości ${message.id}:`, error.message);
      }
      if (Date.now() - lastProgressUpdate >= 4000) {
        await interaction.editReply(`Usuwanie wiadomości… **${deletedCount}/${amount}**`).catch(() => {});
        lastProgressUpdate = Date.now();
      }
    }
  }
  const notes = [];
  if (processedCount < amount) notes.push('Na kanale nie było więcej wiadomości.');
  if (failedCount) notes.push(`Nie udało się usunąć: **${failedCount}**.`);
  return interaction.editReply(`Usunięto **${deletedCount}** wiadomości.${notes.length ? ` ${notes.join(' ')}` : ''}`);
}

async function configCommand(interaction) {
  const cfg = store.guildConfig(interaction.guildId);
  const sub = interaction.options.getSubcommand();
  if (sub === 'channel') cfg[interaction.options.getString('typ')] = interaction.options.getChannel('kanal').id;
  if (sub === 'role') {
    const type = interaction.options.getString('typ');
    const role = interaction.options.getRole('rola');
    if (role.id === interaction.guildId) {
      return interaction.reply({ content: 'Nie można ustawić roli `@everyone`. Utwórz osobną rolę, np. „Niezweryfikowany”.', ephemeral: true });
    }
    if (role.managed) {
      return interaction.reply({ content: 'Nie można użyć roli zarządzanej przez Discorda lub inną integrację.', ephemeral: true });
    }
    if (['verifiedRoleId', 'unverifiedRoleId'].includes(type) && role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ content: `Rola ${role} musi znajdować się niżej niż najwyższa rola bota.`, ephemeral: true });
    }
    cfg[type] = role.id;
  }
  if (sub === 'category') cfg.ticketCategoryId = interaction.options.getChannel('kategoria').id;
  if (sub === 'welcome') cfg.welcomeMessage = interaction.options.getString('tekst');
  store.save();

  if (sub === 'show') {
    const fields = [
      ['Logi', cfg.logChannelId && `<#${cfg.logChannelId}>`], ['Powitania', cfg.welcomeChannelId && `<#${cfg.welcomeChannelId}>`],
      ['Logi ticketów', cfg.ticketLogChannelId && `<#${cfg.ticketLogChannelId}>`], ['Kategoria ticketów', cfg.ticketCategoryId && `<#${cfg.ticketCategoryId}>`],
      ['Rola zweryfikowana', cfg.verifiedRoleId && `<@&${cfg.verifiedRoleId}>`], ['Rola niezweryfikowana', cfg.unverifiedRoleId && `<@&${cfg.unverifiedRoleId}>`],
      ['Obsługa ticketów', cfg.ticketStaffRoleId && `<@&${cfg.ticketStaffRoleId}>`]
    ];
    const result = new EmbedBuilder().setColor(COLORS.primary).setTitle('Konfiguracja SQEZZ Bot')
      .addFields(fields.map(([name, value]) => ({ name, value: value || 'Nie ustawiono', inline: true })))
      .addFields({ name: 'Powitanie', value: cfg.welcomeMessage });
    return interaction.reply({ embeds: [result], ephemeral: true });
  }
  return interaction.reply({ embeds: [embed('Zapisano', 'Konfiguracja została zaktualizowana.', COLORS.success)], ephemeral: true });
}

async function giveawayCommand(interaction, helpers) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'start') {
    const duration = parseDuration(interaction.options.getString('czas'));
    if (!duration || duration < 10000 || duration > 2592000000) {
      return interaction.reply({ content: 'Podaj czas od 10s do 30d, np. `30m`, `2h` albo `3d`.', ephemeral: true });
    }
    return helpers.startGiveaway(interaction, duration);
  }
  const giveaway = store.data.giveaways[interaction.options.getInteger('id')];
  if (!giveaway || giveaway.guildId !== interaction.guildId) return interaction.reply({ content: 'Nie znaleziono konkursu o takim ID.', ephemeral: true });
  if (sub === 'end') {
    if (giveaway.ended) return interaction.reply({ content: 'Ten konkurs jest już zakończony.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    await helpers.finishGiveaway(giveaway);
    return interaction.editReply('Konkurs został zakończony.');
  }
  if (!giveaway.ended) return interaction.reply({ content: 'Najpierw zakończ konkurs.', ephemeral: true });
  const winners = helpers.drawWinners(giveaway.entrants, giveaway.winnerCount);
  const channel = await interaction.guild.channels.fetch(giveaway.channelId).catch(() => null);
  if (channel) await channel.send(winners.length ? `🔁 Nowi zwycięzcy konkursu **${giveaway.prize}**: ${winners.map(id => `<@${id}>`).join(', ')}` : 'Brak uczestników do ponownego losowania.');
  return interaction.reply({ content: 'Ponowne losowanie wykonane.', ephemeral: true });
}

module.exports = { commandData, handleCommand };
