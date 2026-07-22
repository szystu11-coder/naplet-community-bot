require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const names = {
  // Kategorie
  '1519830699283185865': '✨・START',
  '1519830688986042388': '📚・INFORMACJE',
  '1519830704786116639': '💬・COMMUNITY',
  '1519830716408397836': '🔊・STREFY GŁOSOWE',
  '1519830752991252570': '🛟・POMOC I SUPPORT',
  '1526873414999080981': '🎟️・AKTYWNE TICKETY',
  '1519830762352935092': '🔒・ADMINISTRACJA',

  // Start
  '1520485846808006726': '👋・powitania',
  '1519830702122729632': '✅・weryfikacja',

  // Informacje
  '1519830695860764732': '📢・ogłoszenia',
  '1519830692609917070': '📜・regulamin',
  '1520824100593991721': '🛡️・rekrutacja',
  '1520476783516844213': '📸・media',
  '1521602539257073897': '🎨・txt-i-paczki',
  '1521602092668551389': '🧩・mody',
  '1521613710119145613': '🤝・partnerstwa',

  // Community
  '1524125645578436639': '💬・ogólny',
  '1519830713313005680': '😂・memy',
  '1520320917107118141': '🎉・konkursy',
  '1519830710415003668': '🤖・komendy',
  '1522066189914865814': '🔢・liczenie',

  // Kanały głosowe i pomoc
  '1519830721609597019': '🔊・Ogólny',
  '1519830727506788483': '👥・Duo 1',
  '1519830733718552600': '👥・Trio',
  '1519830740492353747': '👥・Squad',
  '1523745339125796895': '👥・Duo 2',
  '1522062739860885504': '🛟・Pomoc',
  '1519830756283650071': '🎫・otwórz-ticket',

  // Administracja
  '1519830765079236610': '🤖・boty',
  '1522061822784704602': '⚙️・komendy-botów',
  '1519834240794234880': '📋・logi',
  '1522048881289068754': '📘・wytyczne-adm',
  '1522052009690271865': '⭐・punkty-adm',
  '1521101567846256822': '📣・ogłoszenia-adm',
  '1519830768074096695': '💬・admin-chat',
  '1524549875658915922': '💜・naplet-client'
};

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();
    let changed = 0;
    for (const [channelId, newName] of Object.entries(names)) {
      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        console.warn(`Pominięto brakujący kanał: ${channelId}`);
        continue;
      }
      if (channel.name === newName) continue;
      const oldName = channel.name;
      await channel.setName(newName, 'Ujednolicenie wyglądu Naplet Community');
      console.log(`${oldName} -> ${newName}`);
      changed++;
    }
    console.log(`BEAUTIFY_OK changed=${changed}`);
    client.destroy();
    process.exit(0);
  } catch (error) {
    console.error('BEAUTIFY_ERROR', error);
    client.destroy();
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN);
