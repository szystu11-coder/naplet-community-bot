require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');

const guildId = process.env.GUILD_ID;
const memberRoleId = '1503117584550068295';
const unverifiedRoleId = '1500924024270881021';
const channelsToLock = [
  '1519830695860764732', // ogłoszenia
  '1524125645578436639', // ogólny
  '1519830713313005680', // memy
  '1519830710415003668', // komendy
  '1522066189914865814', // liczenie
  '1520476783516844213'  // media
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function normalizePrompt(prompt) {
  return {
    id: prompt.id, type: prompt.type, title: prompt.title,
    single_select: prompt.single_select, required: prompt.required,
    in_onboarding: prompt.in_onboarding,
    options: prompt.options.map(option => ({
      id: option.id,
      title: option.title,
      description: option.description || '',
      channel_ids: option.channel_ids || [],
      role_ids: (option.role_ids || []).filter(roleId => roleId !== memberRoleId),
      emoji_id: option.emoji?.id || option.emoji_id || null,
      emoji_name: option.emoji?.name || option.emoji_name || null,
      emoji_animated: option.emoji?.animated || option.emoji_animated || false
    }))
  };
}

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.channels.fetch();
    await guild.roles.fetch();
    const unverifiedRole = guild.roles.cache.get(unverifiedRoleId);
    if (!unverifiedRole) throw new Error('Nie znaleziono roli Unverified.');

    const onboarding = await rest.get(Routes.guildOnboarding(guildId));
    const prompts = onboarding.prompts.map(normalizePrompt);
    await rest.put(Routes.guildOnboarding(guildId), {
      body: {
        prompts,
        default_channel_ids: onboarding.default_channel_ids,
        enabled: onboarding.enabled,
        mode: onboarding.mode
      },
      reason: 'Weryfikacja wymagana po ukończeniu onboardingu'
    });
    console.log('Usunięto automatyczne nadawanie roli Członek z onboardingu.');

    for (const channelId of channelsToLock) {
      const channel = guild.channels.cache.get(channelId);
      if (!channel) throw new Error(`Nie znaleziono kanału ${channelId}.`);
      await channel.permissionOverwrites.edit(unverifiedRole, {
        ViewChannel: false
      }, { reason: 'Kanał dostępny dopiero po weryfikacji' });
    }
    console.log(`VERIFICATION_FLOW_OK locked=${channelsToLock.length} onboarding=${onboarding.enabled}`);
    client.destroy();
    process.exit(0);
  } catch (error) {
    console.error('VERIFICATION_FLOW_ERROR', JSON.stringify(error.rawError || { message: error.message }, null, 2));
    client.destroy();
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN);
