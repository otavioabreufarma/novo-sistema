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

module.exports = { requireServiceToken };
