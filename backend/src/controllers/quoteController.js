const { getCatalog } = require('../repositories/catalogRepository');
const quoteRepository = require('../repositories/quoteRepository');
const { calculateQuote, saveQuote, getQuoteOrThrow, changeStatus } = require('../services/quoteService');
const { quoteDraftSchema, statusSchema } = require('../validators/quoteSchemas');
const { AppError } = require('../utils/errors');

async function catalog(req, res, next) {
  try {
    res.json(await getCatalog());
  } catch (error) {
    next(error);
  }
}

async function calculate(req, res, next) {
  try {
    const parsed = quoteDraftSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid quote draft.', parsed.error.flatten());
    res.json(await calculateQuote(parsed.data));
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const parsed = quoteDraftSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid quote draft.', parsed.error.flatten());
    const quote = await saveQuote(parsed.data);
    res.status(201).json(quote);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    res.json(await getQuoteOrThrow(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const quotes = await quoteRepository.list();
    const summaries = quotes
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(quote => ({
        id: quote.id,
        customer_name: quote.customer_name,
        seats: quote.seats,
        tier: quote.calculation.tier,
        discount_pct: quote.discount_pct,
        products: quote.lines.map(line => ({ sku: line.sku, name: line.name, quantity: line.quantity })),
        total: quote.calculation.total,
        approval_required: quote.calculation.approval_required,
        status: quote.status,
        created_at: quote.created_at,
        updated_at: quote.updated_at
      }));
    res.json(summaries);
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Status must be submitted, approved, or rejected.', parsed.error.flatten());
    res.json(await changeStatus(req.params.id, parsed.data.status));
  } catch (error) {
    next(error);
  }
}

module.exports = { catalog, calculate, create, getById, list, updateStatus };
