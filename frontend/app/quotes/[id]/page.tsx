'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Quote } from '@/types';
import { getQuote, updateQuoteStatus } from '@/lib/api';
import StatusPill from '@/components/StatusPill';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const reasonLabels: Record<string, string> = {
  discount_above_15_percent: 'Discount is above 15%.',
  total_above_25000: 'Final total is above $25,000.',
  annual_commitment_with_discount_above_10_percent: 'Annual commitment + discount above 10% requires approval.'
};

export default function QuoteReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    getQuote(params.id).then(setQuote).catch(e => setError(e.message));
  }, [params.id]);

  async function setStatus(status: 'submitted' | 'approved' | 'rejected') {
    setUpdating(true);
    setError('');
    try {
      setQuote(await updateQuoteStatus(params.id, status));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update status.');
    } finally {
      setUpdating(false);
    }
  }

  if (!quote && !error) return <div className="loading-screen"><div className="spinner" />Loading quote…</div>;
  if (error && !quote) return <div className="shell page-space"><div className="alert error">{error}</div><Link className="table-link" href="/quotes">← Back to saved quotes</Link></div>;
  if (!quote) return null;

  const nextActions = quote.status === 'draft' ? ['submitted'] as const : quote.status === 'submitted' ? ['approved', 'rejected'] as const : [];

  return (
    <div className="shell page-space">
      <div className="back-row"><Link href="/quotes">← Saved quotes</Link><span>Quote {quote.id.slice(0, 8)}</span></div>
      {error && <div className="alert error">{error}</div>}

      <section className="review-header card reveal">
        <div><span className="eyebrow">QUOTE REVIEW</span><h1>{quote.customer_name}</h1><p>{quote.seats} seats · {quote.calculation.tier} tier · Created {new Date(quote.created_at).toLocaleString()}</p></div>
        <div className="review-status"><StatusPill status={quote.status} /><span className={quote.calculation.approval_required ? 'text-warn' : 'text-ok'}>{quote.calculation.approval_required ? 'Approval required' : 'No approval required'}</span></div>
      </section>

      <div className="review-grid">
        <section className="card reveal delay-1">
          <div className="section-heading"><div><span className="eyebrow">COMMERCIALS</span><h2>What the customer buys</h2></div></div>
          <div className="preview-lines">{quote.lines.map(line => <div className="quote-line" key={line.sku}><div><strong>{line.name}</strong><span>{line.quantity} × {currency.format(line.unit_price)}</span></div><strong>{currency.format(line.line_total)}</strong></div>)}</div>
          <div className="totals"><div><span>Subtotal</span><strong>{currency.format(quote.calculation.subtotal)}</strong></div><div><span>Discount ({quote.discount_pct}%)</span><strong className="discount">− {currency.format(quote.calculation.discount_amount)}</strong></div><div className="total-row"><span>Final total</span><strong>{currency.format(quote.calculation.total)}</strong></div></div>
        </section>

        <section className="card reveal delay-2">
          <div className="section-heading"><div><span className="eyebrow">DECISION CONTEXT</span><h2>Why this quote is in review</h2></div></div>
          <div className="tier-strip"><strong>{quote.calculation.tier}</strong><span>Maximum discount {quote.calculation.max_discount_pct}%</span></div>
          <div className="explain-box large"><span>Calculation explanation</span><p>{quote.calculation.explanation}</p></div>
          {quote.calculation.approval_required && <div className="approval-box"><strong>Approval reasons</strong>{quote.calculation.approval_reasons.map(reason => <div key={reason}>• {reasonLabels[reason] || reason}</div>)}</div>}
          {!quote.calculation.approval_required && <div className="success-panel">Pricing is inside the approval thresholds.</div>}
          <div className="status-actions"><span className="helper">Allowed next state</span>{nextActions.length ? nextActions.map(action => <button key={action} className={action === 'rejected' ? 'danger-button' : 'primary-button'} disabled={updating} onClick={() => setStatus(action)}>{updating ? 'Updating…' : action === 'submitted' ? 'Submit for approval' : action === 'approved' ? 'Approve quote' : 'Reject quote'}</button>) : <span className="locked-state">Final status — no further transitions</span>}</div>
        </section>
      </div>

      <section className="card audit-card reveal delay-3"><div className="section-heading"><div><span className="eyebrow">AUDIT TRAIL</span><h2>Status history</h2></div></div><div className="audit-list">{quote.history.map((entry, index) => <div className="audit-item" key={`${entry.status}-${entry.at}`}><span className="audit-dot" /><div><strong>{entry.status}</strong><span>{new Date(entry.at).toLocaleString()}</span></div>{index < quote.history.length - 1 && <span className="audit-line" />}</div>)}</div></section>
    </div>
  );
}
