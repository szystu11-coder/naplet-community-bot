require('dotenv').config();
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {
  Client, GatewayIntentBits, Partials, REST, Routes, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, EmbedBuilder, Events
} = require('discord.js');
const store = require('./store');
const { commandData, handleCommand } = require('./commands');
const interactions = require('./interactions');
const { registerEvents } = require('./events');
const { registerAdminPoints } = require('./admin-points');
const { COLORS } = require('./utils');

for (const variable of ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID']) {
  if (!process.env[variable]) {
    console.error(`Brak ${variable} w pliku .env`);
    process.exit(1);
  }
}

const pidFile = path.join(__dirname, '..', 'data', 'bot.pid');
if (!process.env.RENDER) {
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });
  if (fs.existsSync(pidFile)) {
    const existingPid = Number(fs.readFileSync(pidFile, 'utf8'));
    if (Number.isInteger(existingPid) && existingPid > 0) {
      try {
        process.kill(existingPid, 0);
        console.error(`Bot już działa (PID ${existingPid}). Druga instancja nie zostanie uruchomiona.`);
        process.exit(1);
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
  }
  fs.writeFileSync(pidFile, String(process.pid));
  process.on('exit', () => {
    try {
      if (fs.readFileSync(pidFile, 'utf8') === String(process.pid)) fs.unlinkSync(pidFile);
    } catch {}
  });
}

store.load();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User]
});

const port = Number(process.env.PORT) || 3000;
const healthServer = http.createServer((request, response) => {
  if (request.url === '/health') {
    const ready = client.isReady();
    response.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json; charset=utf-8' });
    return response.end(JSON.stringify({ status: ready ? 'ok' : 'starting', discord: ready ? client.user.tag : null, uptime: Math.floor(process.uptime()) }));
  }
  response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  return response.end('SQEZZ Community Bot działa.');
});
healthServer.listen(port, '0.0.0.0', () => console.log(`Health check działa na porcie ${port}.`));

const helpers = {
  ...interactions,
  drawWinners(entrants, count) {
    const pool = [...new Set(entrants)]; const result = [];
    while (pool.length && result.length < count) result.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return result;
  },
  async startGiveaway(interaction, duration) {
    await interaction.deferReply({ ephemeral: true });
    const id = store.nextId('giveaway');
    const prize = interaction.options.getString('nagroda');
    const winnerCount = interaction.options.getInteger('zwyciezcy') ?? 1;
    const channel = interaction.options.getChannel('kanal') ?? interaction.channel;
    const endAt = Date.now() + duration;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway:join:${id}`).setLabel('Weź udział').setEmoji('🎉').setStyle(ButtonStyle.Success));
    const message = await channel.send({
      embeds: [new EmbedBuilder().setColor(COLORS.primary).setTitle(`🎉 KONKURS: ${prize}`).setDescription(`Kliknij przycisk, aby wziąć udział!\n\n**Zwycięzców:** ${winnerCount}\n**Koniec:** <t:${Math.floor(endAt / 1000)}:R>\n**Organizator:** ${interaction.user}\n**ID:** \`${id}\``).setTimestamp(endAt)],
      components: [row]
    });
    store.data.giveaways[id] = { id, guildId: interaction.guildId, channelId: channel.id, messageId: message.id, hostId: interaction.user.id, prize, winnerCount, endAt, entrants: [], ended: false };
    store.save();
    return interaction.editReply(`Konkurs #${id} rozpoczęty na ${channel}.`);
  },
  async finishGiveaway(giveaway) {
    if (giveaway.ended) return;
    giveaway.ended = true;
    const winners = helpers.drawWinners(giveaway.entrants, giveaway.winnerCount);
    giveaway.winners = winners; giveaway.endedAt = Date.now(); store.save();
    const guild = client.guilds.cache.get(giveaway.guildId);
    const channel = guild && await guild.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    const disabled = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway:ended:${giveaway.id}`).setLabel(`Zakończony • ${giveaway.entrants.length} osób`).setEmoji('🎉').setStyle(ButtonStyle.Secondary).setDisabled(true));
    if (message) await message.edit({ components: [disabled], embeds: [new EmbedBuilder().setColor(COLORS.danger).setTitle(`🎉 KONKURS ZAKOŃCZONY: ${giveaway.prize}`).setDescription(`**Zwycięzcy:** ${winners.length ? winners.map(id => `<@${id}>`).join(', ') : 'brak uczestników'}\n**Uczestników:** ${giveaway.entrants.length}\n**ID:** \`${giveaway.id}\``).setTimestamp()] }).catch(() => {});
    await channel.send(winners.length ? `Gratulacje ${winners.map(id => `<@${id}>`).join(', ')}! Wygrywacie **${giveaway.prize}**! 🎉` : `Konkurs **${giveaway.prize}** zakończył się bez uczestników.`).catch(() => {});
  }
};

registerEvents(client);
registerAdminPoints(client);

client.once(Events.ClientReady, async readyClient => {
  console.log(`Zalogowano jako ${readyClient.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commandData });
    console.log(`Zarejestrowano ${commandData.length} komendy na serwerze.`);
  } catch (error) {
    console.error('Nie udało się zarejestrować komend:', error);
  }
  setInterval(async () => {
    const due = Object.values(store.data.giveaways).filter(g => !g.ended && g.endAt <= Date.now());
    for (const giveaway of due) await helpers.finishGiveaway(giveaway).catch(error => console.error(`Konkurs #${giveaway.id}:`, error));
  }, 15000);
  const overdue = Object.values(store.data.giveaways).filter(g => !g.ended && g.endAt <= Date.now());
  for (const giveaway of overdue) await helpers.finishGiveaway(giveaway).catch(() => {});
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) await handleCommand(interaction, helpers);
    else await interactions.handleComponent(interaction, client);
  } catch (error) {
    console.error('Błąd interakcji:', error);
    const response = { content: 'Wystąpił nieoczekiwany błąd. Sprawdź uprawnienia bota i konsolę.', ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.followUp(response).catch(() => {});
    else await interaction.reply(response).catch(() => {});
  }
});

client.on(Events.Error, error => console.error('Discord client error:', error));
process.on('unhandledRejection', error => console.error('Unhandled rejection:', error));
client.login(process.env.DISCORD_TOKEN);
