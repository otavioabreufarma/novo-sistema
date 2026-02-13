const fs = require('fs/promises');
const path = require('path');
const { env } = require('../config/env');

const userFile = path.join(env.dataDir, 'users.json');

async function ensureUserFile() {
  try {
    await fs.access(userFile);
  } catch {
    await fs.mkdir(env.dataDir, { recursive: true });
    await fs.writeFile(userFile, JSON.stringify({ users: [], payments: [] }, null, 2));
  }
}

async function readStore() {
  await ensureUserFile();
  const raw = await fs.readFile(userFile, 'utf-8');
  const parsed = JSON.parse(raw);
  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    payments: Array.isArray(parsed.payments) ? parsed.payments : []
  };
}

async function writeStore(data) {
  await ensureUserFile();
  await fs.writeFile(userFile, JSON.stringify(data, null, 2));
}

async function upsertUser(discordId, mutator) {
  const store = await readStore();
  const now = new Date().toISOString();

  let user = store.users.find((item) => item.discordId === discordId);
  if (!user) {
    user = {
      discordId,
      server: null,
      steamId: null,
      vip: null,
      vipExpiresAt: null,
      createdAt: now,
      updatedAt: now
    };
    store.users.push(user);
  }

  mutator(user, store);
  user.updatedAt = new Date().toISOString();
  await writeStore(store);
  return user;
}

module.exports = {
  readStore,
  writeStore,
  upsertUser
};
