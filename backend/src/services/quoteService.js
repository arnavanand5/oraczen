const { v4: uuidv4 } = require('uuid');
const { getCatalog, getProductMap } = require('../repositories/catalogRepository');
const quoteRepository = require('../repositories/quoteRepository');
const { AppError } = require('../utils/errors');
const { dollarsToCents, centsToDollars, roundPercentAmount } = require('../utils/money');
const { buildExplanation } = require('../utils/explanation');

function getTier(catalog, seats) {
  const rule = catalog.discount_rules.find(item => seats >= item.min_seats && seats <= item.max_seats);
  if (!rule) {
    throw new AppError(422, 'INVALID_SEATS', 'Seat count is outside the supported pricing tiers.');
  }
  return rule;
}

function validateDuplicateProducts(lines) {
  const seen = new Set();
  const duplicates = [];
  for (const line of lines) {
    if (seen.has(line.sku)) duplicates.push(line.sku);
    seen.add(line.sku);
  }
  if (duplicates.length) {
    throw new AppError(422, 'DUPLICATE_SKU', 'The same product cannot be added twice. Adjust its quantity instead.', { skus: duplicates });
  }
}

function calculateApproval({ total, discountPct, annualCommitment }) {
  const reasons = [];
  if (discountPct > 15) reasons.push('discount_above_15_percent');
  if (total > 25000) reasons.push('total_above_25000');
  if (annualCommitment && discountPct > 10) reasons.push('annual_commitment_with_discount_above_10_percent');
  return { approvalRequired: reasons.length > 0, approvalReasons: reasons };
}

async function calculateQuote(draft) {
  const catalog = await getCatalog();
  const productMap = await getProductMap();
  const tierRule = getTier(catalog, draft.seats);

  validateDuplicateProducts(draft.lines);

  const unknownSkus = draft.lines.filter(line => !productMap.has(line.sku)).map(line => line.sku);
  if (unknownSkus.length) {
    throw new AppError(422, 'UNKNOWN_SKU', 'One or more product SKUs do not exist in the catalog.', { skus: unknownSkus });
  }

  if (draft.discountPct > tierRule.max_discount_pct) {
    throw new AppError(422, 'DISCOUNT_LIMIT_EXCEEDED', `Discount exceeds the ${tierRule.code} tier maximum of ${tierRule.max_discount_pct}%.`, {
      tier: tierRule.code,
      maxDiscountPct: tierRule.max_discount_pct
    });
  }

  const lineResults = draft.lines.map(line => {
    const product = productMap.get(line.sku);
    const unitPriceCents = dollarsToCents(product.unit_price);
    const lineTotalCents = unitPriceCents * line.quantity;
    return {
      sku: product.sku,
      name: product.name,
      quantity: line.quantity,
      unit_price: product.unit_price,
      line_total: centsToDollars(lineTotalCents)
    };
  });

  const subtotalCents = lineResults.reduce((sum, line) => sum + dollarsToCents(line.line_total), 0);
  const discountAmountCents = roundPercentAmount(subtotalCents, draft.discountPct);
  const totalCents = subtotalCents - discountAmountCents;
  const subtotal = centsToDollars(subtotalCents);
  const discountAmount = centsToDollars(discountAmountCents);
  const total = centsToDollars(totalCents);
  const approval = calculateApproval({ total, discountPct: draft.discountPct, annualCommitment: draft.annualCommitment });

  return {
    tier: tierRule.code,
    max_discount_pct: tierRule.max_discount_pct,
    currency: catalog.currency,
    lines: lineResults,
    subtotal,
    discount_pct: draft.discountPct,
    discount_amount: discountAmount,
    total,
    annual_commitment: draft.annualCommitment,
    approval_required: approval.approvalRequired,
    approval_reasons: approval.approvalReasons,
    explanation: buildExplanation({
      seats: draft.seats,
      tier: tierRule.code,
      maxDiscountPct: tierRule.max_discount_pct,
      subtotal,
      discountPct: draft.discountPct,
      discountAmount,
      total,
      annualCommitment: draft.annualCommitment,
      approvalRequired: approval.approvalRequired,
      approvalReasons: approval.approvalReasons
    })
  };
}

async function saveQuote(draft) {
  const calculation = await calculateQuote(draft);
  const now = new Date().toISOString();
  const quote = {
    id: uuidv4(),
    customer_name: draft.customerName,
    seats: draft.seats,
    currency: calculation.currency,
    lines: calculation.lines.map(line => ({
      sku: line.sku,
      name: line.name,
      quantity: line.quantity,
      unit_price: line.unit_price,
      line_total: line.line_total
    })),
    discount_pct: draft.discountPct,
    annual_commitment: draft.annualCommitment,
    calculation: {
      tier: calculation.tier,
      max_discount_pct: calculation.max_discount_pct,
      subtotal: calculation.subtotal,
      discount_amount: calculation.discount_amount,
      total: calculation.total,
      approval_required: calculation.approval_required,
      approval_reasons: calculation.approval_reasons,
      explanation: calculation.explanation
    },
    status: 'draft',
    created_at: now,
    updated_at: now,
    history: [{ status: 'draft', at: now }]
  };

  return quoteRepository.create(quote);
}

async function getQuoteOrThrow(id) {
  const quote = await quoteRepository.findById(id);
  if (!quote) throw new AppError(404, 'QUOTE_NOT_FOUND', 'Quote not found.');
  return quote;
}

const allowedTransitions = {
  draft: new Set(['submitted']),
  submitted: new Set(['approved', 'rejected']),
  approved: new Set(),
  rejected: new Set()
};

async function changeStatus(id, nextStatus) {
  const quote = await getQuoteOrThrow(id);
  if (!allowedTransitions[quote.status].has(nextStatus)) {
    throw new AppError(409, 'INVALID_STATUS_TRANSITION', `Cannot move a ${quote.status} quote to ${nextStatus}.`, {
      currentStatus: quote.status,
      requestedStatus: nextStatus
    });
  }

  const now = new Date().toISOString();
  return quoteRepository.updateById(id, existing => ({
    ...existing,
    status: nextStatus,
    updated_at: now,
    history: [...existing.history, { status: nextStatus, at: now }]
  }));
}

module.exports = { calculateQuote, saveQuote, getQuoteOrThrow, changeStatus };
