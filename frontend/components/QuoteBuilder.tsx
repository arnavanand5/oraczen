'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Catalog, QuoteCalculation, QuoteDraft, QuoteSummary } from '@/types';
import { calculateQuote, getCatalog, getQuotes, saveQuote } from '@/lib/api';

const EMPTY_DRAFT: QuoteDraft = {
  customerName: '',
  seats: 10,
  lines: [{ sku: '', quantity: 1 }],
  discountPct: 0,
  annualCommitment: false
};

const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function currency(value: number) {
  return formatter.format(value);
}

const reasonLabels: Record<string, string> = {
  discount_above_15_percent: 'Discount is above 15%.',
  total_above_25000: 'Final total is above $25,000.',
  annual_commitment_with_discount_above_10_percent: 'Annual commitment + discount above 10% requires approval.'
};

export default function QuoteBuilder() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [draft, setDraft] = useState<QuoteDraft>(EMPTY_DRAFT);
  const [calculation, setCalculation] = useState<QuoteCalculation | null>(null);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [savedQuotes, setSavedQuotes] = useState<QuoteSummary[]>([]);
  const [compareId, setCompareId] = useState('');

  const selectedCompareQuote = useMemo(
    () => savedQuotes.find(quote => quote.id === compareId) || null,
    [compareId, savedQuotes]
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oraczen-quote-draft');
      if (stored) setDraft(JSON.parse(stored));
    } catch {
      localStorage.removeItem('oraczen-quote-draft');
    }

    Promise.all([getCatalog(), getQuotes()])
      .then(([catalogData, quotes]) => {
        setCatalog(catalogData);
        setSavedQuotes(quotes);
      })
      .catch(error => setApiError(error.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('oraczen-quote-draft', JSON.stringify(draft));
    const timer = window.setTimeout(() => {
      if (!catalog) return;
      setCalculating(true);
      calculateQuote(draft)
        .then(result => {
          setCalculation(result);
          setApiError('');
        })
        .catch(error => {
          setCalculation(null);
          setApiError(error.message);
        })
        .finally(() => setCalculating(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft, catalog]);

  const updateLine = (index: number, field: 'sku' | 'quantity', value: string) => {
    setDraft(current => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index
          ? { ...line, [field]: field === 'quantity' ? Number(value) : value }
          : line
      )
    }));
  };

  const addLine = () => {
    setDraft(current => ({ ...current, lines: [...current.lines, { sku: '', quantity: 1 }] }));
  };

  const removeLine = (index: number) => {
    setDraft(current => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setApiError('');
    try {
      const quote = await saveQuote(draft);
      setSavedId(quote.id);
      localStorage.removeItem('oraczen-quote-draft');
      const quotes = await getQuotes();
      setSavedQuotes(quotes);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Could not save quote.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /> Loading the deal desk…</div>;
  }

  return (
    <div className="shell page-space">
      <section className="hero reveal">
        <div>
          <span className="eyebrow">INTERNAL SALES WORKSPACE</span>
          <h1>Build a quote your reviewer can trust.</h1>
          <p>Every number is calculated by the REST API using the supplied catalog and approval rules.</p>
        </div>
        <div className="hero-stat">
          <span>API authority</span>
          <strong>{calculating ? 'Calculating…' : calculation ? 'Synced' : 'Waiting'}</strong>
        </div>
      </section>

      {apiError && <div className="alert error">{apiError}</div>}
      {savedId && (
        <div className="alert success">
          Quote saved successfully. <Link href={`/quotes/${savedId}`}>Open review →</Link>
        </div>
      )}

      <div className="builder-grid">
        <section className="card reveal delay-1">
          <div className="section-heading">
            <div>
              <span className="eyebrow">QUOTE INPUT</span>
              <h2>Customer & pricing</h2>
            </div>
            <span className="live-badge"><i /> live</span>
          </div>

          <label>Customer name<input value={draft.customerName} onChange={e => setDraft({ ...draft, customerName: e.target.value })} placeholder="e.g. Northstar Labs" /></label>
          <div className="field-row">
            <label>Seats<input type="number" min="1" value={draft.seats} onChange={e => setDraft({ ...draft, seats: Number(e.target.value) })} /></label>
            <label>Discount %<input type="number" min="0" max="100" step="0.1" value={draft.discountPct} onChange={e => setDraft({ ...draft, discountPct: Number(e.target.value) })} /></label>
          </div>

          <div className="commitment-row">
            <div>
              <strong>Annual commitment</strong>
              <span>Changes approval logic, not product pricing.</span>
            </div>
            <button
              type="button"
              className={`switch ${draft.annualCommitment ? 'on' : ''}`}
              onClick={() => setDraft({ ...draft, annualCommitment: !draft.annualCommitment })}
              aria-label="Toggle annual commitment"
            ><span /></button>
          </div>

          <div className="section-heading product-head">
            <div><h3>Products</h3><span className="helper">Same SKU cannot be added twice; adjust quantity instead.</span></div>
            <button className="ghost-button" onClick={addLine}>+ Add product</button>
          </div>

          <div className="line-list">
            {draft.lines.map((line, index) => (
              <div className="line-editor" key={`${index}-${line.sku}`}>
                <select value={line.sku} onChange={e => updateLine(index, 'sku', e.target.value)}>
                  <option value="">Select product…</option>
                  {catalog?.products.map(product => <option key={product.sku} value={product.sku}>{product.name} · {currency(product.unit_price)}</option>)}
                </select>
                <input type="number" min="1" step="1" value={line.quantity} onChange={e => updateLine(index, 'quantity', e.target.value)} aria-label={`Quantity for product ${index + 1}`} />
                <button className="icon-button" onClick={() => removeLine(index)} disabled={draft.lines.length === 1} title="Remove product">×</button>
              </div>
            ))}
          </div>

          <button className="primary-button wide" onClick={handleSave} disabled={saving || !calculation}>
            {saving ? 'Saving quote…' : 'Save quote'}
          </button>
        </section>

        <aside className="card preview-card reveal delay-2">
          <div className="preview-top">
            <div><span className="eyebrow">LIVE PREVIEW</span><h2>{draft.customerName || 'Unnamed customer'}</h2></div>
            {calculation && <span className={`approval-chip ${calculation.approval_required ? 'needs-approval' : 'no-approval'}`}>{calculation.approval_required ? 'Approval required' : 'No approval required'}</span>}
          </div>

          {calculation ? (
            <>
              <div className="tier-strip"><strong>{calculation.tier}</strong><span>Max discount {calculation.max_discount_pct}%</span></div>
              <div className="preview-lines">
                {calculation.lines.map(line => (
                  <div className="quote-line" key={line.sku}>
                    <div><strong>{line.name}</strong><span>{line.quantity} × {currency(line.unit_price)}</span></div>
                    <strong>{currency(line.line_total)}</strong>
                  </div>
                ))}
              </div>
              <div className="totals">
                <div><span>Subtotal</span><strong>{currency(calculation.subtotal)}</strong></div>
                <div><span>Discount ({calculation.discount_pct}%)</span><strong className="discount">− {currency(calculation.discount_amount)}</strong></div>
                <div className="total-row"><span>Final total</span><strong>{currency(calculation.total)}</strong></div>
              </div>
              {calculation.approval_required && (
                <div className="approval-box">
                  <strong>Why approval is required</strong>
                  {calculation.approval_reasons.map(reason => <div key={reason}>• {reasonLabels[reason] || reason}</div>)}
                </div>
              )}
              
<div className="explain-box">
  <span>Deterministic pricing explanation</span>
  <div className="explanation-lines">
    {calculation.explanation
      .split(/(?<=\.)\s+/)
      .filter(Boolean)
      .map((line, index) => (
        <p key={index}>{line}</p>
      ))}
  </div>
</div>
            </>
          ) : (
            <div className="empty-preview">Complete the required fields and select a product to calculate the quote.</div>
          )}
        </aside>
      </div>

      <section className="card comparison-card reveal delay-3">
        <div className="section-heading">
          <div><span className="eyebrow">SCENARIO COMPARISON</span><h2>Compare with a saved quote</h2></div>
          <span className="helper">A/B the current scenario against an existing customer quote.</span>
        </div>
        <div className="compare-select-row">
          <select value={compareId} onChange={e => setCompareId(e.target.value)}>
            <option value="">Choose a saved quote…</option>
            {savedQuotes.map(quote => <option key={quote.id} value={quote.id}>{quote.customer_name} · {quote.seats} seats · {currency(quote.total)}</option>)}
          </select>
          {selectedCompareQuote && calculation ? (
            <div className="compare-grid">
              <CompareColumn title="Current scenario" total={calculation.total} discount={calculation.discount_pct} tier={calculation.tier} approval={calculation.approval_required} products={calculation.lines.map(line => `${line.name} × ${line.quantity}`)} />
              <CompareColumn title="Saved quote" total={selectedCompareQuote.total} discount={selectedCompareQuote.discount_pct} tier={selectedCompareQuote.tier} approval={selectedCompareQuote.approval_required} products={selectedCompareQuote.products.map(product => `${product.name} × ${product.quantity}`)} />
            </div>
          ) : <p className="helper">Pick a saved quote after you have at least one stored scenario.</p>}
        </div>
      </section>
    </div>
  );
}

function CompareColumn({ title, total, discount, tier, approval, products }: { title: string; total: number; discount: number | string; tier: string; approval: boolean; products: string[] }) {
  return (
    <div className="compare-column">
      <span className="eyebrow">{title}</span>
      <strong className="compare-total">{currency(total)}</strong>
      <div className="compare-facts"><span>Tier: {tier}</span><span>Discount: {typeof discount === 'number' ? `${discount}%` : discount}</span><span>{approval ? 'Approval required' : 'No approval'}</span></div>
      <div className="compare-products">{products.map(item => <div key={item}>{item}</div>)}</div>
    </div>
  );
}
