const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateQuote } = require('../src/services/quoteService');

const base = {
  customerName: 'Acme Corp',
  seats: 10,
  lines: [{ sku: 'AGENT-CORE', quantity: 10 }],
  discountPct: 0,
  annualCommitment: false
};

test('9 seats use STARTER tier and cap discount at 10%', async () => {
  const result = await calculateQuote({ ...base, seats: 9, discountPct: 10 });
  assert.equal(result.tier, 'STARTER');
  assert.equal(result.max_discount_pct, 10);
  assert.equal(result.total, 1080);
});

test('10 seats cross into GROWTH tier and allow 20%', async () => {
  const result = await calculateQuote({ ...base, seats: 10, discountPct: 20 });
  assert.equal(result.tier, 'GROWTH');
  assert.equal(result.max_discount_pct, 20);
  assert.equal(result.total, 960);
});

test('49 and 50 seats fall into GROWTH and ENTERPRISE respectively', async () => {
  const growth = await calculateQuote({ ...base, seats: 49, discountPct: 20 });
  const enterprise = await calculateQuote({ ...base, seats: 50, discountPct: 30 });
  assert.equal(growth.tier, 'GROWTH');
  assert.equal(enterprise.tier, 'ENTERPRISE');
});

test('approval is required for discount above 15%', async () => {
  const result = await calculateQuote({ ...base, seats: 50, discountPct: 20 });
  assert.equal(result.approval_required, true);
  assert.deepEqual(result.approval_reasons, ['discount_above_15_percent']);
});

test('annual commitment plus discount above 10% requires approval', async () => {
  const result = await calculateQuote({ ...base, seats: 10, discountPct: 11, annualCommitment: true });
  assert.equal(result.approval_required, true);
  assert.ok(result.approval_reasons.includes('annual_commitment_with_discount_above_10_percent'));
});


test('discount above the tier maximum is rejected', async () => {
  await assert.rejects(
    calculateQuote({ ...base, seats: 9, discountPct: 11 }),
    error => error.code === 'DISCOUNT_LIMIT_EXCEEDED'
  );
});

test('approval is required when final total exceeds $25,000', async () => {
  const result = await calculateQuote({
    ...base,
    seats: 50,
    lines: [{ sku: 'ONBOARDING', quantity: 11 }],
    discountPct: 0
  });
  assert.ok(result.total > 25000);
  assert.equal(result.approval_required, true);
  assert.ok(result.approval_reasons.includes('total_above_25000'));
});
