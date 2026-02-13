const crypto = require('crypto');
const axios = require('axios');
const { env } = require('../config/env');

const BASE_URL = 'https://api.infinitepay.io';

async function createCheckoutLink(payload) {
  if (!env.infinitePayApiToken) {
    throw new Error('INFINITEPAY_API_TOKEN não configurado.');
  }

  const response = await axios.post(
    `${BASE_URL}/invoices/public/checkout/links`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${env.infinitePayApiToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );

  return response.data;
}

function verifyWebhookSignature(rawBody, signature) {
  if (!env.infinitePayWebhookSecret) {
    return true;
  }

  const computed = crypto
    .createHmac('sha256', env.infinitePayWebhookSecret)
    .update(rawBody)
    .digest('hex');

  return computed === signature;
}

module.exports = {
  createCheckoutLink,
  verifyWebhookSignature
};
