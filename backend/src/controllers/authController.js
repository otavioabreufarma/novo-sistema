const Joi = require('joi');
const { withTransaction } = require('../db/jsonDatabase');
const {
  getSteamAuthUrl,
  verifySteamAssertion,
  extractSteamId64FromClaimedId,
  validateSteamId64
} = require('../services/steamService');

const steamLinkSchema = Joi.object({
  server: Joi.string().valid('solo', 'duo').required(),
  discordId: Joi.string().min(3).max(40).required(),
  steamId64: Joi.string().pattern(/^\d{17}$/).required()
});

function getQueryValue(query, key) {
  const value = query?.[key];

  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }

  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

async function startSteamAuth(req, res, next) {
  try {
    const authUrl = await getSteamAuthUrl();
    return res.status(200).json({ authUrl });
  } catch (error) {
    return next(error);
  }
}

async function steamReturn(req, res, next) {
  try {
    const headers = req.headers || {};
    const callbackContext = {
      forwardedProto: String(headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim(),
      forwardedHost: String(headers['x-forwarded-host'] || headers.host || '').split(',')[0].trim()
    };

    if (!callbackContext.forwardedHost) {
      callbackContext.forwardedHost = 'localhost';
    }

    const openIdParams = {
      'openid.ns': getQueryValue(req.query, 'openid.ns'),
      'openid.mode': getQueryValue(req.query, 'openid.mode'),
      'openid.op_endpoint': getQueryValue(req.query, 'openid.op_endpoint'),
      'openid.claimed_id': getQueryValue(req.query, 'openid.claimed_id'),
      'openid.identity': getQueryValue(req.query, 'openid.identity'),
      'openid.return_to': getQueryValue(req.query, 'openid.return_to'),
      'openid.response_nonce': getQueryValue(req.query, 'openid.response_nonce'),
      'openid.assoc_handle': getQueryValue(req.query, 'openid.assoc_handle'),
      'openid.signed': getQueryValue(req.query, 'openid.signed'),
      'openid.sig': getQueryValue(req.query, 'openid.sig')
    };

    if (!openIdParams['openid.mode']) {
      return res.status(400).json({ error: 'Parâmetros OpenID ausentes no callback da Steam.' });
    }

    const claimedId = await verifySteamAssertion(openIdParams);
    const steamId64 = extractSteamId64FromClaimedId(claimedId);
    const isValid = await validateSteamId64(steamId64);

    if (!isValid) {
      return res.status(400).json({ error: 'SteamID64 inválido de acordo com Steam Web API.' });
    }

    return res.status(200).json({
      message: 'Autenticação Steam concluída com sucesso.',
      steamId64
    });
  } catch (error) {
    return next(error);
  }
}

async function linkDiscordSteam(req, res, next) {
  try {
    const { server, discordId, steamId64 } = req.body;

    const isValid = await validateSteamId64(steamId64);
    if (!isValid) {
      return res.status(400).json({ error: 'SteamID64 inválido.' });
    }

    await withTransaction(server, (db) => {
      const now = new Date().toISOString();
      const existing = db.discordSteamLinks.find((item) => item.discordId === discordId);

      if (existing) {
        existing.steamId64 = steamId64;
        existing.updatedAt = now;
      } else {
        db.discordSteamLinks.push({
          discordId,
          steamId64,
          createdAt: now,
          updatedAt: now
        });
      }

      const user = db.users.find((item) => item.steamId64 === steamId64);
      if (!user) {
        db.users.push({
          steamId64,
          discordId,
          createdAt: now,
          updatedAt: now
        });
      }
    });

    return res.status(200).json({
      message: 'Vínculo Discord ↔ Steam salvo com sucesso.'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  steamLinkSchema,
  startSteamAuth,
  steamReturn,
  linkDiscordSteam
};
