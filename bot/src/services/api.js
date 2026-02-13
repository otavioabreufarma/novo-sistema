const axios = require('axios');

const api = axios.create({
  baseURL: process.env.BACKEND_URL,
  timeout: Number(process.env.BACKEND_TIMEOUT_MS || 12000),
  headers: {
    Authorization: `Bearer ${process.env.BOT_API_TOKEN}`
  }
});

module.exports = { api };
