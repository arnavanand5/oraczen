import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import QuoteBuilder from '@/components/QuoteBuilder';

vi.mock('@/lib/api', () => ({
  getCatalog: vi.fn().mockResolvedValue({
    currency: 'USD',
    discount_rules: [{ code: 'STARTER', min_seats: 1, max_seats: 9, max_discount_pct: 10 }],
    products: [{ sku: 'AGENT-CORE', name: 'Agent Core', unit_price: 120 }]
  }),
  getQuotes: vi.fn().mockResolvedValue([]),
  calculateQuote: vi.fn().mockResolvedValue({
    tier: 'STARTER', max_discount_pct: 10, currency: 'USD',
    lines: [{ sku: 'AGENT-CORE', name: 'Agent Core', quantity: 1, unit_price: 120, line_total: 120 }],
    subtotal: 120, discount_pct: 0, discount_amount: 0, total: 120,
    annual_commitment: false, approval_required: false, approval_reasons: [],
    explanation: '1 seat → STARTER tier → maximum discount 10%. Subtotal $120.00 → 0% discount ($0.00) → final $120.00.'
  }),
  saveQuote: vi.fn()
}));

describe('QuoteBuilder', () => {
  it('renders the quote input and live preview headings', async () => {
    render(<QuoteBuilder />);
    expect(await screen.findByText('Customer & pricing')).toBeInTheDocument();
    expect(screen.getByText('LIVE PREVIEW')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
  });
});
