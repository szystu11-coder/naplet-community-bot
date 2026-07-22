const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'database.json');

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
    ticketLogChannelId: napletGuild ? '1519834240794234880' : null
  };
  if (napletGuild) {
    cfgFallback(data.guilds[guildId], 'welcomeChannelId', '1520485846808006726');
    cfgFallback(data.guilds[guildId], 'verifiedRoleId', '1503117584550068295');
    cfgFallback(data.guilds[guildId], 'unverifiedRoleId', '1500924024270881021');
    cfgFallback(data.guilds[guildId], 'ticketCategoryId', '1526873414999080981');
    cfgFallback(data.guilds[guildId], 'ticketStaffRoleId', '1520822068072022116');
    cfgFallback(data.guilds[guildId], 'ticketLogChannelId', '1519834240794234880');
  }
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

module.exports = { load, save, guildConfig, nextId, get data() { return data; } };

