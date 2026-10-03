export type CatalogProduct = {
  sku: string;
  name: string;
  unit_price: number;
};

export type DiscountRule = {
  code: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  min_seats: number;
  max_seats: number;
  max_discount_pct: number;
};

export type Catalog = {
  currency: string;
  discount_rules: DiscountRule[];
  products: CatalogProduct[];
};

export type QuoteLineDraft = {
  sku: string;
  quantity: number;
};

export type QuoteDraft = {
  customerName: string;
  seats: number;
  lines: QuoteLineDraft[];
  discountPct: number;
  annualCommitment: boolean;
};

export type CalculatedLine = {
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type QuoteCalculation = {
  tier: string;
  max_discount_pct: number;
  currency: string;
  lines: CalculatedLine[];
  subtotal: number;
  discount_pct: number;
  discount_amount: number;
  total: number;
  annual_commitment: boolean;
  approval_required: boolean;
  approval_reasons: string[];
  explanation: string;
};

export type Quote = {
  id: string;
  customer_name: string;
  seats: number;
  currency: string;
  lines: CalculatedLine[];
  discount_pct: number;
  annual_commitment: boolean;
  calculation: {
    tier: string;
    max_discount_pct: number;
    subtotal: number;
    discount_amount: number;
    total: number;
    approval_required: boolean;
    approval_reasons: string[];
    explanation: string;
  };
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  history: Array<{ status: Quote['status']; at: string }>;
};

export type QuoteSummary = Pick<Quote, 'id' | 'customer_name' | 'seats' | 'status' | 'created_at' | 'updated_at'> & {
  tier: string;
  discount_pct: number;
  products: Array<{ sku: string; name: string; quantity: number }>;
  total: number;
  approval_required: boolean;
};
