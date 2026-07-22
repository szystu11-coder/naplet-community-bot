const { EmbedBuilder } = require('discord.js');

const COLORS = { primary: 0x7c3aed, success: 0x22c55e, danger: 0xef4444, info: 0x3b82f6 };

function embed(title, description, color = COLORS.primary) {
  return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp();
}

function parseDuration(value) {
  const match = /^(\d+)(s|m|h|d|w)$/i.exec(value.trim());
  if (!match) return null;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return Number(match[1]) * multipliers[match[2].toLowerCase()];
}

function cleanName(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 70);
}

function truncate(value, length = 1000) {
  if (!value) return 'brak';
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

function formatSayText(value) {
  return value
    .replace(/\\n/g, '\n')
    .replace(/[ \t]*(▶️?|►|➡️?|➜|➤|→)[ \t]*/g, '\n$1 ')
    .replace(/[ \t]*---[ \t]*(?=#{1,3}\s*\d+\.)/g, '\n\n')
    .replace(/[ \t]*(#{1,3}\s+\d+\.\s*)/g, '\n\n$1')
    .replace(/[ \t]+(?=\d+\.\d+\.\s)/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sayUploadError(error) {
  const message = String(error?.message ?? '');
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || /timeout|timed out/i.test(message)) {
    return 'Pobieranie lub wysyłanie plików trwało ponad 60 sekund i zostało przerwane. Spróbuj wysłać mniej plików naraz albo podziel je na kilka komend `/say`.';
  }
  if (error?.code === 40005 || /too large|maximum.*size|request entity/i.test(message)) {
    return 'Nie udało się wysłać plików, ponieważ razem przekraczają limit wysyłania Discorda. Wyślij je w dwóch lub kilku wiadomościach przez `/say`.';
  }
  return 'Nie udało się wysłać wiadomości lub któregoś z plików. Sprawdź rozmiar plików i spróbuj ponownie.';
}

module.exports = { COLORS, embed, parseDuration, cleanName, truncate, formatSayText, sayUploadError };
