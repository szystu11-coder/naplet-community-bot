const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'database.json');
const CONFIG_PREFIX = 'NAPLET_CONFIG_STATE:';
const DEFAULT_GUILD_ID = '1520671328636633118';
const DEFAULT_CONFIG = {
  logChannelId: '1529442407119065289',
  welcomeChannelId: '1529117679275737169',
  ticketLogChannelId: '1529442407119065289',
  ticketCategoryId: '1529444630012235936',
  levelUpChannelId: '1529533646233534584',
  verifiedRoleId: '1529117671516278976',
  unverifiedRoleId: '1529434963525505024',
  ticketStaffRoleIds: ['1529117666013478922', '1529117667158528272'],
  ticketStaffRoleId: '1529117666013478922',
  welcomeMessage: 'Witaj {user} na **{server}**! Jesteś naszym {count}. członkiem.'
};

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
  const napletGuild = guildId === DEFAULT_GUILD_ID;
  data.guilds[guildId] ??= {
    logChannelId: null, welcomeChannelId: null,
    welcomeMessage: 'Witaj {user} na **{server}**! Jesteś naszym {count}. członkiem.',
    verifiedRoleId: null, unverifiedRoleId: null, ticketCategoryId: null,
    ticketStaffRoleId: null, ticketStaffRoleIds: [], ticketLogChannelId: null, levelUpChannelId: null
  };
  if (napletGuild) {
    for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
      if (key === 'ticketStaffRoleIds' && Array.isArray(data.guilds[guildId][key]) && !data.guilds[guildId][key].length) {
        data.guilds[guildId][key] = [...value];
      } else cfgFallback(data.guilds[guildId], key, value);
    }
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

