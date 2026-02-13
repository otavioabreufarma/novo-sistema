const { env } = require('../config/env');

function requireServiceToken(type) {
  const expected = type === 'discord' ? env.discordBotToken : env.rustPluginToken;

  return (req, res, next) => {
    const token = req.headers['x-service-token'];

    if (!expected) {
      return res.status(500).json({ error: 'Token do serviço não configurado no backend.' });
    }

    if (!token || token !== expected) {
      return res.status(401).json({ error: 'Token de serviço inválido.' });
    }

    return next();
  };
}

function requireBotBearerToken(req, res, next) {
  const expected = env.botApiToken;
  const authHeader = req.headers.authorization || '';

  if (!expected || expected.length < 16) {
    return res.status(500).json({ error: 'Token BOT_API_TOKEN ausente ou fraco no backend.' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization inválido.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (token !== expected) {
    return res.status(401).json({ error: 'Token de autenticação inválido.' });
  }

  return next();
}

module.exports = { requireServiceToken, requireBotBearerToken };
