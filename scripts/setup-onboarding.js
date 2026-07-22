require('dotenv').config();
const {
  Client, GatewayIntentBits, PermissionFlagsBits, REST, Routes, SnowflakeUtil
} = require('discord.js');

const guildId = process.env.GUILD_ID;
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const CHANNELS = {
  welcome: '1520485846808006726',
  rules: '1519830692609917070',
  announcements: '1519830695860764732',
  general: '1524125645578436639',
  memes: '1519830713313005680',
  giveaways: '1520320917107118141',
  commands: '1519830710415003668',
  counting: '1522066189914865814',
  media: '1520476783516844213',
  recruitment: '1520824100593991721',
  mods: '1521602092668551389',
  txt: '1521602539257073897',
  partnerships: '1521613710119145613'
};

const ROLES = {
  member: '1503117584550068295',
  media: '1520478999925751848',
  age10to12: '1521133664916865044',
  age13to14: '1521133717693923378',
  age15to16: '1521133773390090260',
  age17to18: '1521133826154434652',
  age18plus: '1521133913353748580'
};

const id = () => SnowflakeUtil.generate().toString();
const option = (title, description, emojiName, channelIds = [], roleIds = []) => ({
  id: id(), title, description, emoji_name: emojiName, emoji_id: null,
  emoji_animated: false, channel_ids: channelIds, role_ids: roleIds
});

const prompts = [
  {
    id: id(), type: 0, title: 'Co chcesz znaleźć w SQEZZ Community?',
    single_select: false, required: true, in_onboarding: true,
    options: [
      option('Rozmowy z community', 'Poznaj ludzi i dołącz do głównego czatu.', '💬', [CHANNELS.general], []),
      option('Memy i luźny content', 'Najlepsze memy oraz codzienna dawka humoru.', '😂', [CHANNELS.memes], []),
      option('Konkursy i nagrody', 'Nie przegap nowych konkursów społeczności.', '🎉', [CHANNELS.giveaways], []),
      option('Boty i komendy', 'Korzystaj z komend i serwerowych botów.', '🤖', [CHANNELS.commands], []),
      option('Media i twórczość', 'Zdjęcia, klipy i twórczość członków.', '📸', [CHANNELS.media], [])
    ]
  },
  {
    id: id(), type: 0, title: 'Wybierz swój przedział wiekowy',
    single_select: true, required: true, in_onboarding: true,
    options: [
      option('10–12 lat', 'Wybierz zgodnie z prawdą.', '🌱', [], [ROLES.age10to12]),
      option('13–14 lat', 'Wybierz zgodnie z prawdą.', '🎮', [], [ROLES.age13to14]),
      option('15–16 lat', 'Wybierz zgodnie z prawdą.', '⚡', [], [ROLES.age15to16]),
      option('17–18 lat', 'Wybierz zgodnie z prawdą.', '🔥', [], [ROLES.age17to18]),
      option('18+ lat', 'Dla pełnoletnich członków community.', '🔞', [], [ROLES.age18plus])
    ]
  },
  {
    id: id(), type: 0, title: 'Tworzysz filmy, TikToki lub inne materiały?',
    single_select: true, required: false, in_onboarding: true,
    options: [
      option('Tak — jestem twórcą', 'Otrzymasz rolę Media i dostęp do kanału twórców.', '🎥', [CHANNELS.media], [ROLES.media]),
      option('Nie — ale lubię oglądać', 'Zobacz materiały publikowane przez community.', '🍿', [CHANNELS.media], [])
    ]
  },
  {
    id: id(), type: 0, title: 'Co jeszcze chcesz obserwować?',
    single_select: false, required: false, in_onboarding: true,
    options: [
      option('Rekrutacja', 'Informacje o naborach i współpracy.', '🥂', [CHANNELS.recruitment], []),
      option('Mody', 'Modyfikacje polecane przez community.', '🧩', [CHANNELS.mods], []),
      option('TXT i paczki', 'Tekstury, paczki i materiały do pobrania.', '🎨', [CHANNELS.txt], []),
      option('Partnerstwa', 'Poznaj partnerów SQEZZ Community.', '🤝', [CHANNELS.partnerships], [])
    ]
  }
];

const defaultChannelIds = [
  CHANNELS.rules, CHANNELS.announcements, CHANNELS.welcome, CHANNELS.general,
  CHANNELS.memes, CHANNELS.commands, CHANNELS.counting, CHANNELS.media
];

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.channels.fetch();
    await guild.roles.fetch();

    const allIds = [...new Set([...defaultChannelIds, ...Object.values(CHANNELS), ...Object.values(ROLES)])];
    const missing = allIds.filter(itemId => !guild.channels.cache.has(itemId) && !guild.roles.cache.has(itemId));
    if (missing.length) throw new Error(`Brakuje kanałów lub ról: ${missing.join(', ')}`);

    const draft = { prompts, default_channel_ids: defaultChannelIds, enabled: false, mode: 1 };
    const readOnly = [CHANNELS.rules, CHANNELS.announcements, CHANNELS.welcome];
    const writable = [CHANNELS.general, CHANNELS.memes, CHANNELS.commands, CHANNELS.counting, CHANNELS.media];
    for (const channelId of readOnly) {
      const channel = guild.channels.cache.get(channelId);
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: true, ReadMessageHistory: true, SendMessages: false
      }, { reason: 'Kanał startowy Discord Onboarding' });
    }
    for (const channelId of writable) {
      const channel = guild.channels.cache.get(channelId);
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: true, ReadMessageHistory: true, SendMessages: true,
        AddReactions: true, EmbedLinks: true, AttachFiles: true
      }, { reason: 'Kanał startowy Discord Onboarding' });
    }
    console.log('Ustawiono 8 kanałów startowych, w tym 5 dostępnych do pisania.');

    await rest.put(Routes.guildOnboarding(guildId), { body: draft, reason: 'Nowy onboarding SQEZZ Community' });
    console.log('Zapisano i zweryfikowano nowy onboarding jako wersję roboczą.');

    const result = await rest.put(Routes.guildOnboarding(guildId), {
      body: { ...draft, enabled: true }, reason: 'Włączenie nowego onboardingu SQEZZ Community'
    });
    console.log(`ONBOARDING_OK enabled=${result.enabled} prompts=${result.prompts.length} defaults=${result.default_channel_ids.length} mode=${result.mode}`);
    client.destroy();
    process.exit(0);
  } catch (error) {
    console.error('ONBOARDING_ERROR', JSON.stringify(error.rawError || { message: error.message, stack: error.stack }, null, 2));
    client.destroy();
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN);
