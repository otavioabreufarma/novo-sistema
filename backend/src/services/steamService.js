const axios = require('axios');
const { RelyingParty } = require('openid');
const { env } = require('../config/env');

const OPENID_PROVIDER = 'https://steamcommunity.com/openid';

function getSafeBaseUrl() {
  const baseUrl = String(env.baseUrl || '').trim();
  if (!baseUrl) {
    throw new Error('BASE_URL não configurada para autenticação Steam.');
  }

  try {
    return new URL(baseUrl).toString().replace(/\/$/, '');
  } catch (_error) {
    throw new Error('BASE_URL inválida. Defina uma URL absoluta (ex: https://api.seudominio.com).');
  }
}

function createRelyingParty() {
  const callbackUrl = `${getSafeBaseUrl()}/api/auth/steam/return`;
  return new RelyingParty(callbackUrl, null, true, true, []);
}

function getSteamAuthUrl() {
  const relyingParty = createRelyingParty();

  return new Promise((resolve, reject) => {
    relyingParty.authenticate(OPENID_PROVIDER, false, (error, authUrl) => {
      if (error || !authUrl) {
        return reject(new Error('Não foi possível iniciar autenticação Steam OpenID.'));
      }

      return resolve(authUrl);
    });
  });
}

function verifySteamAssertion(params) {
  const relyingParty = createRelyingParty();

  return new Promise((resolve, reject) => {
    relyingParty.verifyAssertion(params, (error, result) => {
      if (error || !result?.authenticated) {
        return reject(new Error('Resposta OpenID inválida.'));
      }

      return resolve(result.claimedIdentifier);
    });
  });
}

function extractSteamId64FromClaimedId(claimedId) {
  const match = String(claimedId).match(/\/id\/(\d+)$/) || String(claimedId).match(/\/openid\/id\/(\d+)$/);
  if (!match) {
    throw new Error('Claimed ID não contém SteamID64 válido.');
  }

  return match[1];
}

async function validateSteamId64(steamId64) {
  if (!/^\d{17}$/.test(String(steamId64 || ''))) {
    return false;
  }

  if (!env.steamApiKey) {
    throw new Error('STEAM_API_KEY não configurada.');
  }

  const url = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/';

  const response = await axios.get(url, {
    params: {
      key: env.steamApiKey,
      steamids: steamId64
    },
    timeout: 10000
  });

  const players = response.data?.response?.players || [];
  return players.length > 0;
}

module.exports = {
  getSteamAuthUrl,
  verifySteamAssertion,
  extractSteamId64FromClaimedId,
  validateSteamId64
};
