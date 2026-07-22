const { Events, ChannelType } = require('discord.js');
const store = require('./store');

async function updateMemberCount(guild) {
  if (!store.guildConfig(guild.id).memberCountEnabled) return;
  const channel = await ensureMemberCountChannel(guild);
  if (!channel) return;
  const count = guild.memberCount;
  const name = `${store.guildConfig(guild.id).memberCountName || 'Ilość członków'}: ${count}`;
  if (channel.name !== name) await channel.setName(name, 'Aktualizacja licznika członków').catch(() => {});
}

async function ensureMemberCountChannel(guild) {
  const cfg = store.guildConfig(guild.id);
  if (!cfg.memberCountEnabled || !cfg.memberCountCategoryId) return null;
  let channel = cfg.memberCountChannelId
    ? guild.channels.cache.get(cfg.memberCountChannelId) || await guild.channels.fetch(cfg.memberCountChannelId).catch(() => null)
    : null;
  if (channel && [ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) return channel;
  channel = await guild.channels.create({ name: `${cfg.memberCountName || 'Ilość członków'}: ${guild.memberCount}`, type: ChannelType.GuildVoice, parent: cfg.memberCountCategoryId, reason: 'Kanał licznika członków Naplet Community' }).catch(error => {
    console.error('Nie udało się utworzyć kanału licznika:', error.message);
    return null;
  });
  if (!channel) return null;
  cfg.memberCountChannelId = channel.id;
  store.save();
  await store.persistToDiscord(guild, channel);
  return channel;
}

function registerMemberCount(client) {
  client.once(Events.ClientReady, readyClient => {
    const guild = readyClient.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) return;
    updateMemberCount(guild).catch(error => console.error('Licznik członków:', error));
    const interval = setInterval(() => updateMemberCount(guild).catch(error => console.error('Licznik członków:', error)), 60000);
    interval.unref?.();
  });
  client.on(Events.GuildMemberAdd, member => updateMemberCount(member.guild));
  client.on(Events.GuildMemberRemove, member => updateMemberCount(member.guild));
}

module.exports = { registerMemberCount, updateMemberCount, ensureMemberCountChannel };
