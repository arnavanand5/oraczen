import type { Catalog, Quote, QuoteCalculation, QuoteDraft, QuoteSummary } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    cache: 'no-store'
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error?.message || 'Request failed.');
  }
  return body as T;
}

export function getCatalog() {
  return request<Catalog>('/catalog');
}

export function calculateQuote(draft: QuoteDraft) {
  return request<QuoteCalculation>('/quotes/calculate', {
    method: 'POST',
    body: JSON.stringify(draft)
  });
}

export function saveQuote(draft: QuoteDraft) {
  return request<Quote>('/quotes', {
    method: 'POST',
    body: JSON.stringify(draft)
  });
}

export function getQuotes() {
  return request<QuoteSummary[]>('/quotes');
}

export function getQuote(id: string) {
  return request<Quote>(`/quotes/${id}`);
}

export function updateQuoteStatus(id: string, status: 'submitted' | 'approved' | 'rejected') {
  return request<Quote>(`/quotes/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}
