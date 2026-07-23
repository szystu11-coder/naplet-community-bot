const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const service = require('./service');
const config = require('./config');
const { db } = require('./db');
const WORK_TEXT = ['Pracujesz przy projekcie.', 'Dostarczasz paczkę.', 'Pomagasz w kawiarni.', 'Naprawiasz komputer.'];
const embed = (title, description, color = 0xe74c3c) => new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setFooter({ text: 'Naplet Community Economy' });
const economyCommandData = [
  new SlashCommandBuilder().setName('balance').setDescription('Pokaż portfel i bank').addUserOption(o => o.setName('uzytkownik').setDescription('Użytkownik').setRequired(false)),
  new SlashCommandBuilder().setName('daily').setDescription('Odbierz dzienną nagrodę'),
  new SlashCommandBuilder().setName('work').setDescription('Pracuj i zarób pieniądze'),
  new SlashCommandBuilder().setName('crime').setDescription('Spróbuj popełnić przestępstwo'),
  new SlashCommandBuilder().setName('deposit').setDescription('Wpłać pieniądze do banku').addStringOption(o => o.setName('kwota').setDescription('Liczba albo all').setRequired(true)),
  new SlashCommandBuilder().setName('withdraw').setDescription('Wypłać pieniądze z banku').addStringOption(o => o.setName('kwota').setDescription('Liczba albo all').setRequired(true)),
  new SlashCommandBuilder().setName('pay').setDescription('Przelej pieniądze').addUserOption(o => o.setName('uzytkownik').setDescription('Odbiorca').setRequired(true)).addIntegerOption(o => o.setName('kwota').setDescription('Kwota').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Ranking majątku'),
  new SlashCommandBuilder().setName('shop').setDescription('Pokaż sklep'),
  new SlashCommandBuilder().setName('buy').setDescription('Kup przedmiot').addStringOption(o => o.setName('przedmiot').setDescription('ID przedmiotu').setRequired(true)),
  new SlashCommandBuilder().setName('inventory').setDescription('Pokaż ekwipunek').addUserOption(o => o.setName('uzytkownik').setDescription('Użytkownik').setRequired(false)),
  new SlashCommandBuilder().setName('use').setDescription('Użyj przedmiotu').addStringOption(o => o.setName('przedmiot').setDescription('ID przedmiotu').setRequired(true)),
  new SlashCommandBuilder().setName('rob').setDescription('Spróbuj okraść użytkownika').addUserOption(o => o.setName('uzytkownik').setDescription('Ofiara').setRequired(true))
].map(command => command.toJSON());
function cooldownText(error) { return `Spróbuj ponownie za <t:${Math.ceil(Date.now() / 1000 + Number(error.message.split(':')[1]) / 1000)}:R>.`; }
function respond(interaction, title, description, color) { return interaction.reply({ embeds: [embed(title, description, color)], flags: MessageFlags.Ephemeral }); }
function xpText(result) { return result?.xp?.advanced ? `\nAwans! Osiągasz poziom **${result.xp.level}** i otrzymujesz **${result.xp.reward} ${config.currency}**.` : result?.xp ? `\nXP: **+${result.xp.gained}**.` : ''; }
async function handleEconomy(interaction) {
  const guildId = interaction.guildId; const userId = interaction.user.id; const name = interaction.commandName;
  try {
    if (name === 'balance') { const target = interaction.options.getUser('uzytkownik') || interaction.user; const user = service.balance(guildId, target.id); return interaction.reply({ embeds: [embed(`Saldo: ${target.displayName || target.username}`, `Portfel: **${user.wallet} ${config.currency}**\nBank: **${user.bank} ${config.currency}**\nPoziom: **${user.level}**\nXP: **${user.xp}**`)] }); }
    if (name === 'daily') { const result = service.daily(guildId, userId); return respond(interaction, 'Dzienna nagroda', `Otrzymujesz **${result.amount} ${config.currency}**. Seria: **${result.streak} dni**.\nNastępna nagroda: <t:${Math.floor(result.nextAt / 1000)}:R>.${xpText(result)}`); }
    if (name === 'work') { const result = service.work(guildId, userId); return respond(interaction, 'Praca wykonana', `${WORK_TEXT[Math.floor(Math.random() * WORK_TEXT.length)]}\nZarobiono **${result.amount} ${config.currency}**.${xpText(result)}`); }
    if (name === 'crime') { const result = service.crime(guildId, userId); return respond(interaction, result.won ? 'Udany skok' : 'Wpadka', result.won ? `Zyskujesz **${result.amount} ${config.currency}**.` : `Tracisz **${result.amount} ${config.currency}**.`, result.won ? 0x2ecc71 : 0xe74c3c); }
    if (name === 'deposit' || name === 'withdraw') return respond(interaction, name === 'deposit' ? 'Wpłata wykonana' : 'Wypłata wykonana', JSON.stringify(service.move(guildId, userId, interaction.options.getString('kwota'), name))); 
    if (name === 'pay') { const target = interaction.options.getUser('uzytkownik'); if (target.bot || target.id === userId) return respond(interaction, 'Nie można wykonać przelewu', 'Wybierz innego użytkownika, który nie jest botem.', 0xe74c3c); const result = service.transfer(guildId, userId, target.id, interaction.options.getInteger('kwota')); return respond(interaction, 'Przelew wykonany', `Przelano **${interaction.options.getInteger('kwota')} ${config.currency}** użytkownikowi ${target}.${xpText(result)}`); }
    if (name === 'leaderboard') { const rows = service.leaderboard(guildId); return interaction.reply({ embeds: [embed('Ranking majątku', rows.length ? rows.map((row, i) => `**${i + 1}.** <@${row.user_id}> — **${row.wallet + row.bank} ${config.currency}**`).join('\n') : 'Brak danych.')] }); }
    if (name === 'shop') return interaction.reply({ embeds: [embed('Sklep', config.shop.map(item => `**${item.id}** — ${item.name}\n${item.description}\nCena: **${item.price} ${config.currency}**`).join('\n\n'))] });
    if (name === 'buy') { const item = config.shop.find(item => item.id === interaction.options.getString('przedmiot')); if (!item) return respond(interaction, 'Nie znaleziono przedmiotu', 'Sprawdź `/shop`.'); const result = service.buy(guildId, userId, item); return respond(interaction, 'Zakup udany', `Kupiono **${item.name}**.${xpText(result)}`); }
    if (name === 'inventory') { const target = interaction.options.getUser('uzytkownik') || interaction.user; const rows = service.inventory(guildId, target.id); return interaction.reply({ embeds: [embed(`Ekwipunek: ${target.displayName || target.username}`, rows.length ? rows.map(row => `**${row.item_id}** × ${row.quantity}`).join('\n') : 'Ekwipunek jest pusty.')] }); }
    if (name === 'use') { const item = config.shop.find(item => item.id === interaction.options.getString('przedmiot')); if (!item) return respond(interaction, 'Nie znaleziono przedmiotu', 'Sprawdź `/shop`.'); const result = service.useItem(guildId, userId, item); return respond(interaction, 'Przedmiot użyty', result.message); }
    if (name === 'rob') { const target = interaction.options.getUser('uzytkownik'); if (target.bot || target.id === userId) return respond(interaction, 'Nie można wykonać napadu', 'Wybierz innego użytkownika, który nie jest botem.', 0xe74c3c); const result = service.rob(guildId, userId, target.id); return respond(interaction, result.won ? 'Napad udany' : 'Napad nieudany', result.won ? `Zgarniasz **${result.amount} ${config.currency}**.` : `Płacisz karę **${result.amount} ${config.currency}**.`, result.won ? 0x2ecc71 : 0xe74c3c); }
  } catch (error) { if (String(error.message).startsWith('COOLDOWN:')) return respond(interaction, 'Cooldown', cooldownText(error), 0xf1c40f); console.error(`Ekonomia ${name}:`, error); return respond(interaction, 'Nie udało się wykonać operacji', error.message, 0xe74c3c); }
}
module.exports = { economyCommandData, handleEconomy };
