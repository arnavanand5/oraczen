const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

test('POST /api/quotes/calculate rejects missing line items', async () => {
  const response = await request(app)
    .post('/api/quotes/calculate')
    .send({ customerName: 'Acme', seats: 10, lines: [], discountPct: 0, annualCommitment: false });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/quotes/calculate rejects an unknown SKU', async () => {
  const response = await request(app)
    .post('/api/quotes/calculate')
    .send({
      customerName: 'Acme',
      seats: 10,
      lines: [{ sku: 'DOES-NOT-EXIST', quantity: 1 }],
      discountPct: 0,
      annualCommitment: false
    });

  assert.equal(response.status, 422);
  assert.equal(response.body.error.code, 'UNKNOWN_SKU');
});
