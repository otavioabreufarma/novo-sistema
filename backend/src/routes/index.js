const express = require('express');
const Joi = require('joi');
const { validate } = require('../middleware/validation');
const { requireServiceToken, requireBotBearerToken } = require('../middleware/authToken');
const { startSteamAuth, steamReturn, linkDiscordSteam, steamLinkSchema: legacySteamLinkSchema } = require('../controllers/authController');
const { createCheckoutSchema, createCheckout, infinitePayWebhook } = require('../controllers/purchaseController');
const {
  serverParamSchema,
  steamQuerySchema,
  getHealth,
  getUserBySteam,
  getPurchaseHistory,
  getVipForPlugin
} = require('../controllers/serverController');
const {
  setServerSchema,
  steamLinkSchema,
  purchaseSchema,
  webhookSchema,
  saveServer,
  createSteamLink,
  createVipPurchase,
  paymentWebhook
} = require('../controllers/botController');

const router = express.Router();

router.get('/health', getHealth);

router.post('/user/server', requireBotBearerToken, validate(setServerSchema), saveServer);
router.post('/steam/link', requireBotBearerToken, validate(steamLinkSchema), createSteamLink);
router.post('/vip/purchase', requireBotBearerToken, validate(purchaseSchema), createVipPurchase);
router.post('/vip/webhook', validate(webhookSchema), paymentWebhook);

router.get('/auth/steam', startSteamAuth);
router.get('/auth/steam/return', steamReturn);
router.post('/auth/link-discord-steam', validate(legacySteamLinkSchema), linkDiscordSteam);

router.post('/checkout', validate(createCheckoutSchema), createCheckout);
router.post('/webhooks/infinitepay', infinitePayWebhook);

router.get('/servers/:server/users', validate(serverParamSchema, 'params'), validate(steamQuerySchema, 'query'), getUserBySteam);
router.get('/servers/:server/purchases', validate(serverParamSchema, 'params'), getPurchaseHistory);

const pluginQuerySchema = Joi.object({
  steamId64: Joi.string().pattern(/^\d{17}$/).required()
});

router.get('/plugin/:server/vip-status', requireServiceToken('rust'), validate(serverParamSchema, 'params'), validate(pluginQuerySchema, 'query'), getVipForPlugin);

router.get('/discord/:server/users', requireServiceToken('discord'), validate(serverParamSchema, 'params'), validate(steamQuerySchema, 'query'), getUserBySteam);

module.exports = { router };
