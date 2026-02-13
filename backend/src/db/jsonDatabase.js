const fs = require('fs/promises');
const path = require('path');
const { env } = require('../config/env');

const SERVER_NAMES = ['solo', 'duo'];
const FILES = {
  solo: 'solo.json',
  duo: 'duo.json'
};

const defaultSchema = {
  users: [],
  vips: [],
  purchases: [],
  discordSteamLinks: []
};

function normalizeServer(serverName) {
  const normalized = String(serverName || '').toLowerCase();
  if (!SERVER_NAMES.includes(normalized)) {
    throw new Error('Servidor inválido. Use solo ou duo.');
  }

  return normalized;
}

async function ensureDbFile(serverName) {
  const normalized = normalizeServer(serverName);
  const dbPath = path.join(env.dataDir, FILES[normalized]);

  try {
    await fs.access(dbPath);
  } catch {
    await fs.mkdir(env.dataDir, { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(defaultSchema, null, 2));
  }

  return dbPath;
}

async function readDb(serverName) {
  const dbPath = await ensureDbFile(serverName);
  const content = await fs.readFile(dbPath, 'utf-8');

  const parsed = JSON.parse(content);
  return {
    ...defaultSchema,
    ...parsed
  };
}

async function writeDb(serverName, data) {
  const dbPath = await ensureDbFile(serverName);
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

async function withTransaction(serverName, callback) {
  const db = await readDb(serverName);
  const result = await callback(db);
  await writeDb(serverName, db);
  return result;
}

module.exports = {
  SERVER_NAMES,
  normalizeServer,
  readDb,
  writeDb,
  withTransaction
};
