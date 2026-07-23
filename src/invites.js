const { Events, EmbedBuilder } = require('discord.js');
const store = require('./store');

const snapshots = new Map();

async function readInvites(guild) {
  const invites = await guild.invites.fetch();
  return new Map(invites.map(invite => [invite.code, { uses: invite.uses || 0, inviterId: invite.inviterId }]));
}

async function refresh(guild) {
  try { snapshots.set(guild.id, await readInvites(guild)); }
  catch (error) { console.error(`Nie udało się odczytać zaproszeń ${guild.id}:`, error.message); }
}

async function handleMemberJoin(member) {
  const before = snapshots.get(member.guild.id) || new Map();
  let after;
  try { after = await readInvites(member.guild); snapshots.set(member.guild.id, after); }
  catch (error) { console.error('Śledzenie zaproszeń:', error.message); return; }
  const used = [...after.entries()].find(([code, current]) => current.uses > (before.get(code)?.uses || 0));
  if (!used) return;
  const inviterId = used[1].inviterId;
  if (!inviterId || inviterId === member.client.user.id) return;
  store.data.invites ??= {};
  store.data.invites[member.guild.id] ??= {};
  const count = (store.data.invites[member.guild.id][inviterId] || 0) + 1;
  store.data.invites[member.guild.id][inviterId] = count;
  store.save();
  const channelId = store.guildConfig(member.guild.id).inviteLogChannelId;
  const channel = channelId && (member.guild.channels.cache.get(channelId) || await member.guild.channels.fetch(channelId).catch(() => null));
  if (!channel?.isTextBased()) return;
  await channel.send({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle('Nowe zaproszenie').setDescription(`${member} dołączył/a na serwer.\nZaprosił/a: <@${inviterId}>\nŁącznie zaproszeń: **${count}**`).setTimestamp()], allowedMentions: { users: [member.id, inviterId] } }).catch(() => {});
}

function registerInvites(client) {
  client.once(Events.ClientReady, async readyClient => {
    for (const guild of readyClient.guilds.cache.values()) await refresh(guild);
  });
  client.on(Events.GuildMemberAdd, member => handleMemberJoin(member));
  client.on(Events.InviteCreate, invite => refresh(invite.guild));
  client.on(Events.InviteDelete, invite => refresh(invite.guild));
}

module.exports = { registerInvites };
