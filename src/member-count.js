const { Events, ChannelType } = require('discord.js');
const store = require('./store');

async function updateMemberCount(guild) {
  const channelId = store.guildConfig(guild.id).memberCountChannelId;
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) return;
  const count = guild.memberCount;
  const name = `Członkowie: ${count}`;
  if (channel.name !== name) await channel.setName(name, 'Aktualizacja licznika członków').catch(() => {});
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

module.exports = { registerMemberCount, updateMemberCount };
