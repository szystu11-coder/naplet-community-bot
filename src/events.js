const { AuditLogEvent, EmbedBuilder, GuildMemberFlags } = require('discord.js');
const store = require('./store');
const { COLORS, truncate } = require('./utils');

async function sendLog(guild, title, description, color = COLORS.info, fields = []) {
  const cfg = store.guildConfig(guild.id);
  if (!cfg.logChannelId) return;
  const channel = guild.channels.cache.get(cfg.logChannelId) || await guild.channels.fetch(cfg.logChannelId).catch(() => null);
  if (!channel?.isTextBased()) return;
  const message = new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp();
  if (fields.length) message.addFields(fields);
  await channel.send({ embeds: [message] }).catch(() => {});
}

function registerEvents(client) {
  client.on('guildMemberAdd', async member => {
    const cfg = store.guildConfig(member.guild.id);
    if (cfg.unverifiedRoleId) await member.roles.add(cfg.unverifiedRoleId, 'Nowy niezweryfikowany członek').catch(() => {});
    if (cfg.welcomeChannelId) {
      const channel = member.guild.channels.cache.get(cfg.welcomeChannelId);
      const text = cfg.welcomeMessage.replaceAll('{user}', `${member}`).replaceAll('{server}', member.guild.name).replaceAll('{count}', String(member.guild.memberCount));
      if (channel?.isTextBased()) await channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.primary).setTitle('👋 Nowy członek!').setDescription(text).setThumbnail(member.user.displayAvatarURL({ size: 256 })).setTimestamp()] }).catch(() => {});
    }
    await sendLog(member.guild, '📥 Członek dołączył', `${member.user} — **${member.user.tag}**\nID: \`${member.id}\`\nKonto utworzone: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, COLORS.success);
  });

  client.on('guildMemberRemove', member => sendLog(member.guild, '📤 Członek opuścił serwer', `**${member.user.tag}**\nID: \`${member.id}\`\nRole: ${member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r).join(', ') || 'brak'}`, COLORS.danger));
  client.on('guildMemberUpdate', async (oldM, newM) => {
    const completedOnboarding = !oldM.flags.has(GuildMemberFlags.CompletedOnboarding)
      && newM.flags.has(GuildMemberFlags.CompletedOnboarding);
    if (completedOnboarding) {
      await sendLog(newM.guild, '✅ Ukończono onboarding', `${newM.user} ukończył/a konfigurację serwera.`, COLORS.success);
    }
    const added = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id));
    const removed = oldM.roles.cache.filter(r => !newM.roles.cache.has(r.id));
    const changes = [];
    if (added.size) changes.push(`**Dodane role:** ${added.map(r => r).join(', ')}`);
    if (removed.size) changes.push(`**Usunięte role:** ${removed.map(r => r).join(', ')}`);
    if (oldM.nickname !== newM.nickname) changes.push(`**Pseudonim:** ${oldM.nickname || 'brak'} → ${newM.nickname || 'brak'}`);
    if (changes.length) sendLog(newM.guild, '👤 Zmieniono członka', `${newM.user} (${newM.user.tag})\n${changes.join('\n')}`);
  });

  client.on('messageDelete', message => {
    if (!message.guild || message.author?.bot) return;
    sendLog(message.guild, '🗑️ Usunięto wiadomość', `**Autor:** ${message.author || 'nieznany'}\n**Kanał:** ${message.channel}\n**Treść:** ${truncate(message.content, 1500)}`, COLORS.danger);
  });
  client.on('messageUpdate', (oldM, newM) => {
    if (!newM.guild || newM.author?.bot || oldM.content === newM.content) return;
    sendLog(newM.guild, '✏️ Edytowano wiadomość', `**Autor:** ${newM.author}\n**Kanał:** ${newM.channel}\n**[Przejdź do wiadomości](${newM.url})**`, COLORS.info, [
      { name: 'Przed', value: truncate(oldM.content), inline: false }, { name: 'Po', value: truncate(newM.content), inline: false }
    ]);
  });

  client.on('channelCreate', channel => channel.guild && sendLog(channel.guild, '➕ Utworzono kanał', `${channel} — **${channel.name}**\nID: \`${channel.id}\``));
  client.on('channelDelete', channel => channel.guild && sendLog(channel.guild, '➖ Usunięto kanał', `**${channel.name}**\nID: \`${channel.id}\``, COLORS.danger));
  client.on('channelUpdate', (oldC, newC) => {
    const changes = [];
    if (oldC.name !== newC.name) changes.push(`Nazwa: **${oldC.name}** → **${newC.name}**`);
    if (oldC.parentId !== newC.parentId) changes.push('Zmieniono kategorię kanału');
    if (oldC.topic !== newC.topic) changes.push(`Temat: ${truncate(oldC.topic, 400)} → ${truncate(newC.topic, 400)}`);
    if (oldC.permissionOverwrites?.cache.size !== newC.permissionOverwrites?.cache.size) changes.push('Zmieniono nadpisania uprawnień');
    if (changes.length) sendLog(newC.guild, '⚙️ Zmieniono kanał', `${newC}\n${changes.join('\n')}`);
  });

  client.on('roleCreate', role => sendLog(role.guild, '➕ Utworzono rolę', `${role} — **${role.name}**\nID: \`${role.id}\``));
  client.on('roleDelete', role => sendLog(role.guild, '➖ Usunięto rolę', `**${role.name}**\nID: \`${role.id}\``, COLORS.danger));
  client.on('roleUpdate', (oldR, newR) => {
    const changes = [];
    if (oldR.name !== newR.name) changes.push(`Nazwa: **${oldR.name}** → **${newR.name}**`);
    if (oldR.hexColor !== newR.hexColor) changes.push(`Kolor: ${oldR.hexColor} → ${newR.hexColor}`);
    if (!oldR.permissions.equals(newR.permissions)) changes.push('Zmieniono uprawnienia roli');
    if (changes.length) sendLog(newR.guild, '⚙️ Zmieniono rolę', `${newR}\n${changes.join('\n')}`);
  });

  client.on('voiceStateUpdate', (oldS, newS) => {
    if (oldS.channelId === newS.channelId) return;
    let text;
    if (!oldS.channelId) text = `${newS.member} dołączył/a do ${newS.channel}`;
    else if (!newS.channelId) text = `${newS.member} opuścił/a ${oldS.channel}`;
    else text = `${newS.member} przeniósł/przeniosła się z ${oldS.channel} do ${newS.channel}`;
    sendLog(newS.guild, '🔊 Kanał głosowy', text);
  });

  client.on('guildBanAdd', ban => sendLog(ban.guild, '🔨 Zbanowano użytkownika', `**${ban.user.tag}**\nID: \`${ban.user.id}\`\nPowód: ${ban.reason || 'nie podano'}`, COLORS.danger));
  client.on('guildBanRemove', ban => sendLog(ban.guild, '🔓 Odbanowano użytkownika', `**${ban.user.tag}**\nID: \`${ban.user.id}\``, COLORS.success));

  client.on('guildUpdate', (oldG, newG) => {
    const changes = [];
    if (oldG.name !== newG.name) changes.push(`Nazwa: **${oldG.name}** → **${newG.name}**`);
    if (oldG.icon !== newG.icon) changes.push('Zmieniono ikonę serwera');
    if (oldG.verificationLevel !== newG.verificationLevel) changes.push(`Poziom weryfikacji: ${oldG.verificationLevel} → ${newG.verificationLevel}`);
    if (changes.length) sendLog(newG, '🛠️ Zmieniono serwer', changes.join('\n'));
  });
}

module.exports = { registerEvents, sendLog };

