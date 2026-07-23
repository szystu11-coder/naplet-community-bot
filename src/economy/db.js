const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dbDir = path.join(__dirname, '..', '..', 'data');
const dbPath = process.env.ECONOMY_DB_PATH || path.join(dbDir, 'economy.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS users (guild_id TEXT NOT NULL, user_id TEXT NOT NULL, wallet INTEGER NOT NULL DEFAULT 0, bank INTEGER NOT NULL DEFAULT 0, level INTEGER NOT NULL DEFAULT 0, xp INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0, last_daily INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (guild_id, user_id));
CREATE TABLE IF NOT EXISTS inventory (guild_id TEXT NOT NULL, user_id TEXT NOT NULL, item_id TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (guild_id, user_id, item_id));
CREATE TABLE IF NOT EXISTS cooldowns (guild_id TEXT NOT NULL, user_id TEXT NOT NULL, action TEXT NOT NULL, available_at INTEGER NOT NULL, PRIMARY KEY (guild_id, user_id, action));
CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, actor_id TEXT NOT NULL, target_id TEXT, kind TEXT NOT NULL, amount INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS transactions_guild_time ON transactions(guild_id, created_at DESC);`);

const statements = {
  user: db.prepare('SELECT * FROM users WHERE guild_id = ? AND user_id = ?'),
  createUser: db.prepare('INSERT OR IGNORE INTO users (guild_id, user_id) VALUES (?, ?)'),
  inventory: db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_id = ?'),
  allInventory: db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND quantity > 0'),
  cooldown: db.prepare('SELECT available_at FROM cooldowns WHERE guild_id = ? AND user_id = ? AND action = ?'),
  leaderboard: db.prepare('SELECT * FROM users WHERE guild_id = ? ORDER BY wallet + bank DESC LIMIT 10'),
  names: db.prepare('SELECT user_id FROM users WHERE guild_id = ?')
};
function ensureUser(guildId, userId) { statements.createUser.run(guildId, userId); return statements.user.get(guildId, userId); }
function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } }
module.exports = { db, statements, ensureUser, transaction, dbPath };
