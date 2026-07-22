const { AttachmentBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const store = require('./store');

function serializeOverwrites(channel) {
  return channel.permissionOverwrites.cache.map(overwrite => ({
    id: overwrite.id,
    type: overwrite.type,
    allow: overwrite.allow.bitfield.toString(),
    deny: overwrite.deny.bitfield.toString()
  }));
}

function createBackup(guild) {
  return {
    format: 1,
    createdAt: new Date().toISOString(),
    guild: { id: guild.id, name: guild.name },
    config: store.guildConfig(guild.id),
    roles: guild.roles.cache.filter(role => role.id !== guild.id).sort((a, b) => a.position - b.position).map(role => ({
      id: role.id, name: role.name, color: role.color, hoist: role.hoist,
      position: role.position, mentionable: role.mentionable, permissions: role.permissions.bitfield.toString()
    })),
    channels: guild.channels.cache.sort((a, b) => a.rawPosition - b.rawPosition).map(channel => ({
      id: channel.id, name: channel.name, type: channel.type, parentId: channel.parentId,
      position: channel.rawPosition, topic: channel.topic || null, nsfw: channel.nsfw || false,
      bitrate: channel.bitrate || null, userLimit: channel.userLimit || 0,
      overwrites: serializeOverwrites(channel)
    }))
  };
}

function backupAttachment(guild) {
  const json = JSON.stringify(createBackup(guild), null, 2);
  return new AttachmentBuilder(Buffer.from(json, 'utf8'), { name: `naplet-backup-${guild.id}-${Date.now()}.json` });
}

async function downloadBackup(attachment) {
  if (!attachment?.name?.toLowerCase().endsWith('.json')) throw new Error('Wybierz plik JSON backupu.');
  const response = await fetch(attachment.url);
  if (!response.ok) throw new Error(`Nie udało się pobrać pliku (${response.status}).`);
  const backup = JSON.parse(await response.text());
  if (backup.format !== 1 || !Array.isArray(backup.roles) || !Array.isArray(backup.channels)) throw new Error('Nieprawidłowy format backupu Naplet Community.');
  return backup;
}

async function restoreBackup(guild, backup) {
  const roleMap = new Map([[guild.id, guild.id]]);
  for (const saved of backup.roles) {
    let role = guild.roles.cache.find(item => item.name === saved.name);
    if (!role) role = await guild.roles.create({ name: saved.name, color: saved.color || 0, hoist: saved.hoist, mentionable: saved.mentionable, permissions: BigInt(saved.permissions || '0'), reason: 'Przywracanie backupu Naplet Community' });
    else await role.edit({ color: saved.color || 0, hoist: saved.hoist, mentionable: saved.mentionable, permissions: BigInt(saved.permissions || '0'), reason: 'Przywracanie backupu Naplet Community' });
    roleMap.set(saved.id, role.id);
  }

  const channelMap = new Map();
  const ordered = [...backup.channels].sort((a, b) => a.position - b.position);
  for (const saved of ordered) {
    const existing = guild.channels.cache.find(channel => channel.name === saved.name && channel.type === saved.type);
    const parent = saved.parentId ? channelMap.get(saved.parentId) || guild.channels.cache.get(saved.parentId)?.id : null;
    const overwrites = saved.overwrites.map(overwrite => ({
      id: roleMap.get(overwrite.id) || overwrite.id,
      type: overwrite.type,
      allow: BigInt(overwrite.allow || '0'),
      deny: BigInt(overwrite.deny || '0')
    }));
    const options = { name: saved.name, parent, permissionOverwrites: overwrites, reason: 'Przywracanie backupu Naplet Community' };
    if (saved.type === ChannelType.GuildText) Object.assign(options, { topic: saved.topic || undefined, nsfw: saved.nsfw });
    if (saved.type === ChannelType.GuildVoice) Object.assign(options, { bitrate: saved.bitrate || undefined, userLimit: saved.userLimit || 0 });
    const channel = existing || await guild.channels.create({ ...options, type: saved.type });
    if (existing) await channel.edit(options);
    channelMap.set(saved.id, channel.id);
  }
  if (backup.config) {
    const current = store.guildConfig(guild.id);
    Object.assign(current, backup.config);
    store.save();
    await store.persistToDiscord(guild);
  }
  return { roles: backup.roles.length, channels: backup.channels.length };
}

module.exports = { backupAttachment, downloadBackup, restoreBackup };
