const { v4: uuidv4 } = require('uuid');

function createOrderNsu(serverName) {
  const timestamp = Date.now();
  const randomSuffix = uuidv4().split('-')[0];
  return `${serverName.toUpperCase()}-${timestamp}-${randomSuffix}`;
}

module.exports = { createOrderNsu };
