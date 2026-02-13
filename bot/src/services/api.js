const axios = require('axios');

const rawBackendUrl = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
const baseURL = rawBackendUrl.endsWith('/api') ? rawBackendUrl.slice(0, -4) : rawBackendUrl;

const api = axios.create({
  baseURL,
  timeout: Number(process.env.BACKEND_TIMEOUT_MS || 12000),
  headers: {
    Authorization: `Bearer ${process.env.BOT_API_TOKEN}`
  }
});

module.exports = { api };
