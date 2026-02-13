const { v4: uuidv4 } = require('uuid');

function createOrderNsu(serverName) {
  const safeServerName = String(serverName || 'unknown').trim();
  const normalizedServer = safeServerName ? safeServerName.toUpperCase() : 'UNKNOWN';
  const timestamp = Date.now();
  const randomSuffix = uuidv4().split('-')[0];
  return `${normalizedServer}-${timestamp}-${randomSuffix}`;
}

module.exports = { createOrderNsu };
