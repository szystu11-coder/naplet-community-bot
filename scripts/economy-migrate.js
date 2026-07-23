require('dotenv').config();
const { dbPath } = require('../src/economy/db');
console.log(`Baza ekonomii jest gotowa: ${dbPath}`);
