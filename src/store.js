const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'database.json');
const CONFIG_PREFIX = 'NAPLET_CONFIG_STATE:';

const emptyData = () => ({
  guilds: {},
  tickets: {},
  giveaways: {},
  warnings: {},
  adminPoints: null,
  counters: { ticket: 0, giveaway: 0, warning: 0 }
});

let data = emptyData();

function load() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) return save();
  try {
    data = { ...emptyData(), ...JSON.parse(fs.readFileSync(dataFile, 'utf8')) };
  } catch (error) {
    throw new Error(`Nie można odczytać data/database.json: ${error.message}`);
  }
}

function save() {
  fs.mkdirSync(dataDir, { recursive: true });
  const tempFile = `${dataFile}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
  fs.renameSync(tempFile, dataFile);
}

function guildConfig(guildId) {
  const napletGuild = guildId === '1500922225665249351';
  data.guilds[guildId] ??= {
    logChannelId: null,
    welcomeChannelId: napletGuild ? '1520485846808006726' : null,
    welcomeMessage: 'Witaj {user} na **{server}**! Jesteś naszym {count}. członkiem.',
    verifiedRoleId: napletGuild ? '1503117584550068295' : null,
    unverifiedRoleId: napletGuild ? '1500924024270881021' : null,
    ticketCategoryId: napletGuild ? '1526873414999080981' : null,
    ticketStaffRoleId: napletGuild ? '1520822068072022116' : null,
    ticketStaffRoleIds: napletGuild ? ['1520822068072022116'] : [],
    ticketLogChannelId: napletGuild ? '1519834240794234880' : null,
    levelUpChannelId: null
  };
  if (napletGuild) {
    cfgFallback(data.guilds[guildId], 'welcomeChannelId', '1520485846808006726');
    cfgFallback(data.guilds[guildId], 'verifiedRoleId', '1503117584550068295');
    cfgFallback(data.guilds[guildId], 'unverifiedRoleId', '1500924024270881021');
    cfgFallback(data.guilds[guildId], 'ticketCategoryId', '1526873414999080981');
    cfgFallback(data.guilds[guildId], 'ticketStaffRoleId', '1520822068072022116');
    cfgFallback(data.guilds[guildId], 'ticketLogChannelId', '1519834240794234880');
  }
  cfgFallback(data.guilds[guildId], 'levelUpChannelId', null);
  data.guilds[guildId].ticketStaffRoleIds = [...new Set([
    ...(Array.isArray(data.guilds[guildId].ticketStaffRoleIds) ? data.guilds[guildId].ticketStaffRoleIds : []),
    ...(data.guilds[guildId].ticketStaffRoleId ? [data.guilds[guildId].ticketStaffRoleId] : [])
  ])];
  return data.guilds[guildId];
}

function cfgFallback(config, key, value) {
  if (!config[key]) config[key] = value;
}

function nextId(kind) {
  data.counters[kind] = (data.counters[kind] ?? 0) + 1;
  save();
  return data.counters[kind];
}

function configPayload(guildId) {
  const encoded = Buffer.from(JSON.stringify(data.guilds[guildId] || {}), 'utf8').toString('base64url');
  return `${CONFIG_PREFIX}${guildId}:${encoded}`;
}

async function restoreFromDiscord(guild) {
  const channels = guild.channels.cache.filter(channel => channel.isTextBased?.() && channel.viewable);
  for (const channel of channels.values()) {
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    const message = messages?.find(item => item.author.id === guild.client.user.id && item.content.startsWith(`${CONFIG_PREFIX}${guild.id}:`));
    if (!message) continue;
    try {
      const encoded = message.content.slice(`${CONFIG_PREFIX}${guild.id}:`.length);
      data.guilds[guild.id] = { ...data.guilds[guild.id], ...JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) };
      save();
      console.log(`Przywrócono konfigurację serwera ${guild.id} z Discorda.`);
    } catch (error) { console.error('Nie udało się przywrócić konfiguracji:', error.message); }
    return true;
  }
  return false;
}

async function persistToDiscord(guild, preferredChannel) {
  const cfg = guildConfig(guild.id);
  const preferred = [cfg.logChannelId, cfg.levelUpChannelId, cfg.welcomeChannelId].filter(Boolean);
  const channels = [preferredChannel, ...preferred.map(id => guild.channels.cache.get(id))].filter(channel => channel?.isTextBased?.());
  if (!channels.length) {
    const fallback = guild.systemChannel || guild.channels.cache.find(channel => channel.isTextBased?.() && channel.viewable);
    if (fallback) channels.push(fallback);
  }
  const content = configPayload(guild.id);
  for (const channel of channels) {
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    const existing = messages?.find(item => item.author.id === guild.client.user.id && item.content.startsWith(`${CONFIG_PREFIX}${guild.id}:`));
    if (existing) await existing.edit(content).catch(() => {});
    else await channel.send({ content, allowedMentions: { parse: [] } }).then(message => message.pin().catch(() => {})).catch(() => {});
    return true;
  }
  return false;
}

module.exports = { load, save, guildConfig, nextId, restoreFromDiscord, persistToDiscord, get data() { return data; } };

