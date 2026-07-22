require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SnowflakeUtil } = require('discord.js');

const guildId = process.env.GUILD_ID;
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const id = () => SnowflakeUtil.generate().toString();

const definitions = [
  {
    name: '📢 Ogłoszenia Ping', color: 0x5865f2, emoji: '📢',
    title: 'Ogłoszenia', description: 'Najważniejsze informacje dotyczące serwera.',
    channelId: '1519830695860764732'
  },
  {
    name: '🎉 Konkursy Ping', color: 0xf1c40f, emoji: '🎉',
    title: 'Konkursy', description: 'Powiadomienia o nowych konkursach i wynikach.',
    channelId: '1520320917107118141'
  },
  {
    name: '🥂 Rekrutacja Ping', color: 0x2ecc71, emoji: '🥂',
    title: 'Rekrutacja', description: 'Informacje o nowych naborach do administracji.',
    channelId: '1520824100593991721'
  },
  {
    name: '🤝 Partnerstwa Ping', color: 0xe91e63, emoji: '🤝',
    title: 'Partnerstwa', description: 'Nowe współprace i informacje partnerskie.',
    channelId: '1521613710119145613'
  }
];

function normalizePrompt(prompt) {
  return {
    id: prompt.id,
    type: prompt.type,
    title: prompt.title,
    single_select: prompt.single_select,
    required: prompt.required,
    in_onboarding: prompt.in_onboarding,
    options: prompt.options.map(option => ({
      id: option.id,
      title: option.title,
      description: option.description || '',
      channel_ids: option.channel_ids || [],
      role_ids: option.role_ids || [],
      emoji_id: option.emoji?.id || option.emoji_id || null,
      emoji_name: option.emoji?.name || option.emoji_name || null,
      emoji_animated: option.emoji?.animated || option.emoji_animated || false
    }))
  };
}

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.roles.fetch();
    await guild.channels.fetch();

    for (const definition of definitions) {
      let role = guild.roles.cache.find(candidate => candidate.name === definition.name);
      if (!role) {
        role = await guild.roles.create({
          name: definition.name,
          colors: { primaryColor: definition.color },
          permissions: [],
          mentionable: true,
          hoist: false,
          reason: 'Role powiadomień SQEZZ Onboarding'
        });
        console.log(`Utworzono rolę: ${role.name}`);
      } else {
        await role.edit({ mentionable: true, colors: { primaryColor: definition.color } }, 'Aktualizacja roli powiadomień');
        console.log(`Zaktualizowano rolę: ${role.name}`);
      }
      definition.roleId = role.id;
    }

    const onboarding = await rest.get(Routes.guildOnboarding(guildId));
    const notificationTitle = 'Jakie powiadomienia chcesz otrzymywać?';
    const prompts = onboarding.prompts
      .filter(prompt => prompt.title !== notificationTitle && prompt.title !== 'Co jeszcze chcesz obserwować?')
      .map(normalizePrompt);

    prompts.push({
      id: id(),
      type: 0,
      title: notificationTitle,
      single_select: false,
      required: false,
      in_onboarding: true,
      options: definitions.map(definition => ({
        id: id(),
        title: definition.title,
        description: definition.description,
        channel_ids: [definition.channelId],
        role_ids: [definition.roleId],
        emoji_id: null,
        emoji_name: definition.emoji,
        emoji_animated: false
      }))
    });

    const result = await rest.put(Routes.guildOnboarding(guildId), {
      body: {
        prompts,
        default_channel_ids: onboarding.default_channel_ids,
        enabled: true,
        mode: onboarding.mode
      },
      reason: 'Dodanie opcjonalnych ról powiadomień do onboardingu'
    });
    console.log(`NOTIFICATION_ROLES_OK prompts=${result.prompts.length} enabled=${result.enabled}`);
    client.destroy();
    process.exit(0);
  } catch (error) {
    console.error('NOTIFICATION_ROLES_ERROR', JSON.stringify(error.rawError || { message: error.message }, null, 2));
    client.destroy();
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN);
