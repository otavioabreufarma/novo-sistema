const Joi = require('joi');
const { withTransaction, readDb } = require('../db/jsonDatabase');
const { createOrderNsu } = require('../utils/id');
const { createCheckoutLink, verifyWebhookSignature } = require('../services/infinitePayService');
const { validateSteamId64 } = require('../services/steamService');
const { VIP_RULES, activateVip } = require('../services/vipService');

const createCheckoutSchema = Joi.object({
  server: Joi.string().valid('solo', 'duo').required(),
  steamId64: Joi.string().pattern(/^\d{17}$/).required(),
  discordId: Joi.string().min(3).max(40).required(),
  vipType: Joi.string().valid('vip', 'vip+').required(),
  customer: Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().min(8).required()
  }).required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().min(5).max(255).required()
});

const webhookSchema = Joi.object({
  event: Joi.string().required(),
  data: Joi.object({
    status: Joi.string().required(),
    external_reference: Joi.string().required(),
    id: Joi.alternatives(Joi.string(), Joi.number()).required(),
    amount: Joi.number().optional()
  }).required()
}).unknown(true);

async function createCheckout(req, res, next) {
  try {
    const { server, steamId64, discordId, vipType, customer, amount, description } = req.body;

    const isValidSteam = await validateSteamId64(steamId64);
    if (!isValidSteam) {
      return res.status(400).json({ error: 'SteamID64 inválido.' });
    }

    const orderNsu = createOrderNsu(server);

    await withTransaction(server, (db) => {
      const now = new Date().toISOString();

      const existingUser = db.users.find((item) => item.steamId64 === steamId64);
      if (existingUser) {
        existingUser.discordId = discordId;
        existingUser.updatedAt = now;
      } else {
        db.users.push({ steamId64, discordId, createdAt: now, updatedAt: now });
      }

      db.purchases.push({
        orderNsu,
        steamId64,
        discordId,
        vipType,
        amount,
        description,
        status: 'pending_payment',
        provider: 'infinitepay',
        createdAt: now,
        updatedAt: now
      });
    });

    const payload = {
      external_reference: orderNsu,
      amount,
      description,
      customer,
      metadata: {
        server,
        steamId64,
        discordId,
        vipType,
        vipDurationDays: VIP_RULES[vipType].days
      }
    };

    const checkout = await createCheckoutLink(payload);

    return res.status(201).json({
      message: 'Checkout criado com sucesso.',
      orderNsu,
      checkout
    });
  } catch (error) {
    return next(error);
  }
}

async function infinitePayWebhook(req, res, next) {
  try {
    const signature = req.headers['x-infinitepay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const validSignature = verifyWebhookSignature(rawBody, signature);

    if (!validSignature) {
      return res.status(401).json({ error: 'Assinatura de webhook inválida.' });
    }

    const { error } = webhookSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Payload de webhook inválido.' });
    }

    const orderNsu = req.body.data.external_reference;
    const status = String(req.body.data.status).toLowerCase();

    for (const server of ['solo', 'duo']) {
      const db = await readDb(server);
      const purchase = db.purchases.find((item) => item.orderNsu === orderNsu);

      if (!purchase) {
        continue;
      }

      if (status === 'paid' || status === 'approved' || status === 'confirmed') {
        await withTransaction(server, (txDb) => {
          const target = txDb.purchases.find((item) => item.orderNsu === orderNsu);
          target.status = 'paid';
          target.updatedAt = new Date().toISOString();
          target.providerPaymentId = String(req.body.data.id);
        });

        await activateVip({
          serverName: server,
          steamId64: purchase.steamId64,
          vipType: purchase.vipType,
          orderNsu
        });

        return res.status(200).json({ message: 'Pagamento confirmado e VIP liberado.' });
      }

      await withTransaction(server, (txDb) => {
        const target = txDb.purchases.find((item) => item.orderNsu === orderNsu);
        target.status = status;
        target.updatedAt = new Date().toISOString();
      });

      return res.status(200).json({ message: 'Webhook processado sem liberação de VIP.' });
    }

    return res.status(404).json({ error: 'order_nsu não encontrado.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createCheckoutSchema,
  createCheckout,
  infinitePayWebhook
};
