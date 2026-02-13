const Joi = require('joi');
const { readDb } = require('../db/jsonDatabase');
const { getVipStatus } = require('../services/vipService');

const serverParamSchema = Joi.object({
  server: Joi.string().valid('solo', 'duo').required()
});

const steamQuerySchema = Joi.object({
  steamId64: Joi.string().pattern(/^\d{17}$/).required()
});

async function getHealth(_req, res) {
  return res.status(200).json({
    service: 'rust-vip-backend',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}

async function getUserBySteam(req, res, next) {
  try {
    const { server } = req.params;
    const { steamId64 } = req.query;

    const db = await readDb(server);
    const user = db.users.find((item) => item.steamId64 === steamId64);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const vip = await getVipStatus({ serverName: server, steamId64 });
    const purchases = db.purchases.filter((item) => item.steamId64 === steamId64);

    return res.status(200).json({ user, vip, purchases });
  } catch (error) {
    return next(error);
  }
}

async function getPurchaseHistory(req, res, next) {
  try {
    const { server } = req.params;
    const db = await readDb(server);

    return res.status(200).json({
      server,
      total: db.purchases.length,
      purchases: db.purchases
    });
  } catch (error) {
    return next(error);
  }
}

async function getVipForPlugin(req, res, next) {
  try {
    const { server } = req.params;
    const { steamId64 } = req.query;

    const activeVip = await getVipStatus({ serverName: server, steamId64 });

    return res.status(200).json({
      steamId64,
      hasVip: activeVip.length > 0,
      vip: activeVip
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  serverParamSchema,
  steamQuerySchema,
  getHealth,
  getUserBySteam,
  getPurchaseHistory,
  getVipForPlugin
};
