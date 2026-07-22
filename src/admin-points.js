const { AttachmentBuilder, EmbedBuilder, Events } = require('discord.js');
const store = require('./store');
const { COLORS } = require('./utils');

const GUILD_ID = '1500922225665249351';
const POINTS_CHANNEL_ID = '1522052009690271865';
const ANNOUNCEMENTS_CHANNEL_ID = '1521101567846256822';
const TIME_ZONE = 'Europe/Warsaw';
const STATE_PREFIX = 'NAPLET_ADMIN_POINTS_STATE:';
const STATE_FILENAME = 'SPOILER_admin-points-state.json';
const MESSAGES_PER_POINT = 20;

const PROGRESSION = [
  { name: 'Support', required2: 16 },
  { name: 'Junior Moderator', required2: 10 },
  { name: 'Moderator', required2: 16 },
  { name: 'Senior Moderator', required2: 10 },
  { name: 'Junior Admin', required2: 10 },
  { name: 'Admin', required2: 16 },
  { name: 'Senior Admin', required2: 0 }
];
const TOP_STAFF_ROLES = ['Head Admin'];
const STAFF_ROLE_NAMES = new Set([...PROGRESSION.map(rank => rank.name), ...TOP_STAFF_ROLES]);

let state = null;
let stateMessage = null;
let guild = null;
let initialized = false;
let saveTimer = null;
let saveChain = Promise.resolve();

function emptyState() {
  const now = warsawTime();
  return {
    version: 2,
    members: {},
    lastReportDate: now.hour >= 20 ? now.date : null
  };
}

function warsawTime(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

function roleRank(member) {
  if (member.roles.cache.some(role => role.name === 'Owner')) return null;
  if (member.roles.cache.some(role => role.name === 'Head Admin')) return { name: 'Head Admin', required2: 0, top: true };
  for (let index = PROGRESSION.length - 1; index >= 0; index--) {
    if (member.roles.cache.some(role => role.name === PROGRESSION[index].name)) {
      return { ...PROGRESSION[index], index, top: index === PROGRESSION.length - 1 };
    }
  }
  return null;
}

function ensureMember(member) {
  const rank = roleRank(member);
  if (!rank) return null;
  state.members[member.id] ??= { points2: 0, totalPoints2: 0, messages: 0, rankName: rank.name };
  const record = state.members[member.id];
  record.points2 = Math.max(0, Number(record.points2) || 0);
  record.totalPoints2 = Math.max(record.points2, Number(record.totalPoints2) || 0);
  record.messages = Math.max(0, Number(record.messages) || 0);
  if (!record.rankName) {
    record.rankName = rank.name;
  } else if (record.rankName !== rank.name) {
    record.points2 = 0;
    record.messages = 0;
    record.rankName = rank.name;
    record.rankChangedAt = Date.now();
  }
  return record;
}

function earnedPoints2(messageCount) {
  return Math.max(1, Math.floor(messageCount / MESSAGES_PER_POINT) * 2);
}

function formatPoints(points2) {
  const value = points2 / 2;
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

function nextRankProgress(member, points2) {
  const rank = roleRank(member);
  if (!rank || rank.top || rank.index === undefined || rank.index >= PROGRESSION.length - 1) {
    return { current: rank?.name ?? 'brak', next: null, missing2: 0 };
  }
  const next = PROGRESSION[rank.index + 1];
  return { current: rank.name, next: next.name, missing2: Math.max(0, rank.required2 - points2) };
}

function decodeState(content) {
  const start = content.indexOf(STATE_PREFIX);
  if (start < 0) return null;
  const encoded = content.slice(start + STATE_PREFIX.length).replace(/\|\|.*$/s, '').trim();
  const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || typeof parsed.members !== 'object') return null;
  return parsed;
}

async function readState(message) {
  const attachment = message.attachments.find(file => file.name?.endsWith('admin-points-state.json'));
  if (attachment) {
    const response = await fetch(attachment.url);
    if (!response.ok) throw new Error(`Nie udało się pobrać stanu punktów (${response.status}).`);
    const parsed = JSON.parse(await response.text());
    if (parsed && typeof parsed === 'object' && typeof parsed.members === 'object') return parsed;
  }
  return decodeState(message.content);
}

function statePayload(forEdit = false) {
  const file = new AttachmentBuilder(Buffer.from(JSON.stringify(state), 'utf8'), {
    name: STATE_FILENAME,
    description: 'Automatyczna kopia stanu punktów administracji'
  });
  const payload = {
    content: '',
    embeds: [new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('⚙️ SYSTEM PUNKTÓW ADMINISTRACJI')
      .setDescription('Ta przypięta wiadomość przechowuje kopię stanu systemu. Punkty oraz dzienne wiadomości są aktualizowane automatycznie.')
      .addFields(
        { name: 'Przelicznik', value: '**20 wiadomości = 1 pkt**', inline: true },
        { name: 'Minimum dzienne', value: '**0,5 pkt**', inline: true },
        { name: 'Raport', value: '**Codziennie o 20:00**', inline: true }
      )
      .setFooter({ text: 'Nie usuwaj tej wiadomości ani załącznika.' })],
    files: [file],
    allowedMentions: { parse: [] }
  };
  if (forEdit) payload.attachments = [];
  return payload;
}

function isStateMessage(message, botId) {
  return message.author.id === botId && (
    message.content.includes(STATE_PREFIX)
    || message.attachments.some(file => file.name?.endsWith('admin-points-state.json'))
    || message.embeds.some(item => item.title === '⚙️ SYSTEM PUNKTÓW ADMINISTRACJI')
  );
}

async function findStateMessage(channel) {
  const pinned = await channel.messages.fetchPins({ limit: 50 }).catch(() => null);
  const pinnedMessage = pinned?.items
    ?.map(item => item.message)
    .find(message => isStateMessage(message, channel.client.user.id));
  if (pinnedMessage) return pinnedMessage;
  const recent = await channel.messages.fetch({ limit: 100 });
  return recent.find(message => isStateMessage(message, channel.client.user.id)) ?? null;
}

async function persistState() {
  if (!initialized || !stateMessage) return;
  saveChain = saveChain.then(async () => {
    try {
      stateMessage = await stateMessage.edit(statePayload(true));
    } catch (error) {
      console.error('Nie udało się zapisać punktów w wiadomości stanu:', error.message);
    }
  });
  return saveChain;
}

function saveLocallyAndScheduleRemote() {
  store.data.adminPoints = state;
  store.save();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => persistState(), 10000);
  saveTimer.unref?.();
}

async function initialize(client) {
  guild = client.guilds.cache.get(GUILD_ID) || await client.guilds.fetch(GUILD_ID);
  const pointsChannel = await guild.channels.fetch(POINTS_CHANNEL_ID);
  if (!pointsChannel?.isTextBased()) throw new Error('Kanał staff-points nie jest kanałem tekstowym.');

  stateMessage = await findStateMessage(pointsChannel);
  let remoteState = null;
  if (stateMessage) {
    try { remoteState = await readState(stateMessage); }
    catch (error) { console.error('Nie udało się odczytać zapisanego stanu punktów:', error.message); }
  }
  state = remoteState || store.data.adminPoints || emptyState();
  state.version = 2;
  state.members ??= {};
  delete state.members[guild.ownerId];
  store.data.adminPoints = state;
  store.save();

  if (!stateMessage) {
    stateMessage = await pointsChannel.send(statePayload());
    await stateMessage.pin('Trwały stan automatycznego systemu punktów administracji').catch(() => {});
  } else if (!stateMessage.pinned) {
    await stateMessage.pin('Trwały stan automatycznego systemu punktów administracji').catch(() => {});
  }
  initialized = true;
  await persistState();
  await checkDailyReport();
  console.log('System punktów administracji został uruchomiony.');
}

async function countMessage(message) {
  if (!initialized || message.guildId !== GUILD_ID || message.author.bot) return;
  const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
  if (!member || !member.roles.cache.some(role => STAFF_ROLE_NAMES.has(role.name))) return;
  const record = ensureMember(member);
  if (!record) return;
  record.messages++;
  saveLocallyAndScheduleRemote();
}

async function checkDailyReport() {
  if (!initialized || !guild) return;
  const now = warsawTime();
  if (now.hour < 20 || state.lastReportDate === now.date) return;
  await createDailyReport(now.date);
}

async function createDailyReport(reportDate) {
  await guild.members.fetch();
  const members = guild.members.cache
    .filter(member => !member.user.bot && member.roles.cache.some(role => STAFF_ROLE_NAMES.has(role.name)))
    .sort((a, b) => b.roles.highest.position - a.roles.highest.position);

  const rows = [];
  for (const member of members.values()) {
    const record = ensureMember(member);
    const messages = record.messages;
    const gained2 = earnedPoints2(messages);
    record.points2 += gained2;
    record.totalPoints2 += gained2;
    record.messages = 0;
    const progress = nextRankProgress(member, record.points2);
    const promotion = progress.next
      ? progress.missing2 > 0
        ? `Do **${progress.next}** brakuje: **${formatPoints(progress.missing2)} pkt**`
        : `Próg na **${progress.next}** został osiągnięty ✅`
      : 'Najwyższa ranga w systemie punktowym';
    rows.push(
      `${member} • **${progress.current}**\n` +
      `Wiadomości: **${messages}** • Dzisiaj: **+${formatPoints(gained2)} pkt**\n` +
      `Na obecnej randze: **${formatPoints(record.points2)} pkt** • Łącznie: **${formatPoints(record.totalPoints2)} pkt**\n` +
      promotion
    );
  }

  state.lastReportDate = reportDate;
  store.data.adminPoints = state;
  store.save();
  await persistState();

  const announcements = await guild.channels.fetch(ANNOUNCEMENTS_CHANNEL_ID);
  if (!announcements?.isTextBased()) throw new Error('Kanał staff-announcements nie jest kanałem tekstowym.');
  const description = rows.length ? rows.join('\n\n') : 'Brak osób z rangą administracyjną.';
  await announcements.send({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('📊 DZIENNY RAPORT PUNKTÓW ADMINISTRACJI')
      .setDescription(description)
      .addFields({
        name: 'Zasady naliczania',
        value: `Każde pełne **${MESSAGES_PER_POINT} wiadomości = 1 pkt**. Minimalna dzienna nagroda za posiadanie rangi administracyjnej wynosi **0,5 pkt**.`
      })
      .setFooter({ text: `Raport za okres zakończony ${reportDate} o 20:00 • Naplet Community` })
      .setTimestamp()],
    allowedMentions: { parse: [] }
  });
}

function registerAdminPoints(client) {
  client.on(Events.MessageCreate, message => countMessage(message).catch(error => console.error('Liczenie punktów:', error)));
  client.once(Events.ClientReady, () => initialize(client).catch(error => console.error('System punktów:', error)));
  const interval = setInterval(() => checkDailyReport().catch(error => console.error('Raport punktów:', error)), 30000);
  interval.unref?.();
}

module.exports = { registerAdminPoints, earnedPoints2, formatPoints };

