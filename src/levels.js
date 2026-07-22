const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder, Events } = require('discord.js');
const store = require('./store');

const dataFile = path.join(__dirname, '..', 'data', 'levels.json');
const state = { guilds: {} };
let saveTimer;

function load() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  if (!fs.existsSync(dataFile)) return save();
  try { Object.assign(state, JSON.parse(fs.readFileSync(dataFile, 'utf8'))); }
  catch (error) { console.error(`Nie można odczytać levels.json: ${error.message}`); }
}

function save() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  const temporary = `${dataFile}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2));
  fs.renameSync(temporary, dataFile);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 5000);
  saveTimer.unref?.();
}

function memberRecord(guildId, userId) {
  state.guilds[guildId] ??= {};
  state.guilds[guildId][userId] ??= { xp: 0, messages: 0 };
  return state.guilds[guildId][userId];
}

function levelForXp(xp) { return Math.floor(Math.sqrt(xp / 100)); }
function xpForLevel(level) { return level * level * 100; }

async function addMessage(message) {
  if (!message.guildId || message.author?.bot) return;
  const record = memberRecord(message.guildId, message.author.id);
  const oldLevel = levelForXp(record.xp);
  record.xp += 10 + Math.floor(Math.random() * 11);
  record.messages += 1;
  const newLevel = levelForXp(record.xp);
  scheduleSave();
  const configuredChannelId = store.guildConfig(message.guildId).levelUpChannelId;
  const channel = configuredChannelId
    ? message.guild.channels.cache.get(configuredChannelId) || await message.guild.channels.fetch(configuredChannelId).catch(() => null)
    : message.channel;
  if (newLevel > oldLevel && channel?.isTextBased()) {
    channel.send({
      content: `${message.author}, gratulacje! Osiągasz **poziom ${newLevel}** w Naplet Community.`,
      allowedMentions: { users: [message.author.id] }
    }).catch(() => {});
  }
}

function registerLevels(client) {
  load();
  client.on(Events.MessageCreate, message => addMessage(message).catch(error => console.error('Naliczanie poziomów:', error)));
}

function profile(guildId, userId) {
  const record = memberRecord(guildId, userId);
  const level = levelForXp(record.xp);
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { ...record, level, current, next, progress: Math.max(0, record.xp - current), needed: next - current };
}

function profileEmbed(member) {
  const data = profile(member.guild.id, member.id);
  return new EmbedBuilder().setColor(0xe74c3c).setTitle(`Poziom użytkownika ${member.displayName}`)
    .setThumbnail(member.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'Poziom', value: `**${data.level}**`, inline: true },
      { name: 'XP', value: `**${data.xp}**`, inline: true },
      { name: 'Wiadomości', value: `**${data.messages}**`, inline: true },
      { name: 'Postęp', value: `**${data.progress}/${data.needed} XP** do poziomu ${data.level + 1}` }
    ).setFooter({ text: 'Naplet Community' });
}

function rankingEmbed(guild) {
  const entries = Object.entries(state.guilds[guild.id] ?? {})
    .map(([userId]) => ({ userId, ...profile(guild.id, userId) }))
    .sort((a, b) => b.xp - a.xp).slice(0, 10);
  const description = entries.length
    ? entries.map((entry, index) => `**${index + 1}.** <@${entry.userId}> â€” poziom **${entry.level}**, **${entry.xp} XP**`).join('\n')
    : 'Ranking jest jeszcze pusty.';
  return new EmbedBuilder().setColor(0xe74c3c).setTitle('Ranking poziomów Naplet Community').setDescription(description);
}

module.exports = { registerLevels, profile, profileEmbed, rankingEmbed };
