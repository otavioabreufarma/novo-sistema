const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeServer } = require('../src/db/jsonDatabase');
const { createOrderNsu } = require('../src/utils/id');

test('normalizeServer aceita solo/duo', () => {
  assert.equal(normalizeServer('solo'), 'solo');
  assert.equal(normalizeServer('DUO'), 'duo');
});

test('createOrderNsu gera prefixo por servidor', () => {
  const value = createOrderNsu('solo');
  assert.match(value, /^SOLO-\d{13}-[a-f0-9]{8}$/);
});
