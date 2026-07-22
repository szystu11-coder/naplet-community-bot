const crypto = require('node:crypto');

const drafts = new Map();
const MAX_AGE_MS = 15 * 60 * 1000;

function cleanExpired() {
  const now = Date.now();
  for (const [key, draft] of drafts) {
    if (draft.expiresAt <= now) drafts.delete(key);
  }
}

function create(interaction, files) {
  cleanExpired();
  const key = crypto.randomBytes(12).toString('hex');
  drafts.set(key, {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    userId: interaction.user.id,
    files,
    expiresAt: Date.now() + MAX_AGE_MS
  });
  return key;
}

function consume(key, interaction) {
  cleanExpired();
  const draft = drafts.get(key);
  if (!draft) return null;
  drafts.delete(key);
  if (
    draft.guildId !== interaction.guildId ||
    draft.channelId !== interaction.channelId ||
    draft.userId !== interaction.user.id
  ) return null;
  return draft;
}

module.exports = { create, consume };
