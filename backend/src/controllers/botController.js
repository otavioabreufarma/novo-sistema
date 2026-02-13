const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const { getSteamAuthUrl } = require('../services/steamService');
const { addDays } = require('../utils/date');
const { readStore, upsertUser, writeStore } = require('../db/userRepository');

const setServerSchema = Joi.object({
  discordId: Joi.string().trim().min(3).max(64).required(),
  server: Joi.string().valid('solo', 'duo').required()
});

const steamLinkSchema = Joi.object({
  discordId: Joi.string().trim().min(3).max(64).required()
});

const purchaseSchema = Joi.object({
  discordId: Joi.string().trim().min(3).max(64).required(),
  type: Joi.string().valid('vip', 'vip_plus').required()
});

const webhookSchema = Joi.object({
  orderId: Joi.string().trim().min(8).max(128).required(),
  status: Joi.string().valid('approved', 'failed').required(),
  discordId: Joi.string().trim().min(3).max(64).required(),
  type: Joi.string().valid('vip', 'vip_plus').required()
});

const getServerSchema = Joi.object({
  discordId: Joi.string().trim().min(3).max(64).required(),
  server: Joi.string().valid('solo', 'duo').required()
});

const getSteamLinkSchema = Joi.object({
  discordId: Joi.string().trim().min(3).max(64).required()
});

async function saveServer(req, res, next) {
  try {
    const { discordId, server } = req.body;
    await upsertUser(discordId, (user) => {
      user.server = server;
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}

async function createSteamLink(req, res, next) {
  try {
    const { discordId } = req.body;
    await upsertUser(discordId, () => {});

    let url;
    try {
      url = await getSteamAuthUrl();
    } catch {
      url = '/api/auth/steam';
    }

    return res.status(200).json({ url });
  } catch (error) {
    return next(error);
  }
}

async function createVipPurchase(req, res, next) {
  try {
    const { discordId, type } = req.body;
    const orderId = `VIP-${Date.now()}-${uuidv4().slice(0, 8)}`;

    const user = await upsertUser(discordId, () => {});
    if (!user.server) {
      return res.status(400).json({ error: 'server_not_selected', message: 'Selecione o servidor antes da compra.' });
    }

    const store = await readStore();
    store.payments.push({
      orderId,
      discordId,
      type,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await writeStore(store);

    return res.status(201).json({
      paymentUrl: `https://infinitepay.io/checkout/${orderId}`
    });
  } catch (error) {
    return next(error);
  }
}

async function paymentWebhook(req, res, next) {
  try {
    const { orderId, status, discordId, type } = req.body;
    const store = await readStore();

    const payment = store.payments.find((item) => item.orderId === orderId && item.discordId === discordId && item.type === type);
    if (!payment) {
      return res.status(404).json({ error: 'payment_not_found', message: 'Pedido não localizado.' });
    }

    payment.status = status;
    payment.updatedAt = new Date().toISOString();

    if (status === 'approved') {
      await upsertUser(discordId, (user) => {
        user.vip = type;
        user.vipExpiresAt = addDays(new Date().toISOString(), 30);
      });
    }

    await writeStore(store);
    return res.status(200).json({ received: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  setServerSchema,
  steamLinkSchema,
  purchaseSchema,
  webhookSchema,
  getServerSchema,
  getSteamLinkSchema,
  saveServer,
  createSteamLink,
  createVipPurchase,
  paymentWebhook
};
