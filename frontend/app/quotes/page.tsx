'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { QuoteSummary } from '@/types';
import { getQuotes } from '@/lib/api';
import StatusPill from '@/components/StatusPill';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getQuotes().then(setQuotes).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="shell page-space">
      <section className="hero reveal">
        <div><span className="eyebrow">QUOTE LIBRARY</span><h1>Saved quotes.</h1><p>Open a scenario to review pricing, explain approval, or move its status.</p></div>
        <Link className="primary-button" href="/">+ New quote</Link>
      </section>
      {error && <div className="alert error">{error}</div>}
      <section className="card table-card reveal delay-1">
        {loading ? <div className="loading-inline"><div className="spinner" />Loading quotes…</div> : quotes.length === 0 ? <div className="empty-state"><div className="empty-icon">∅</div><h2>No saved quotes yet</h2><p>Create the first scenario in the quote builder.</p></div> : (
          <div className="quote-table-wrap"><table className="quote-table"><thead><tr><th>Customer</th><th>Seats</th><th>Tier</th><th>Total</th><th>Approval</th><th>Status</th><th /></tr></thead><tbody>
            {quotes.map(quote => <tr key={quote.id}><td><strong>{quote.customer_name}</strong></td><td>{quote.seats}</td><td>{quote.tier}</td><td>{currency.format(quote.total)}</td><td><span className={`mini-approval ${quote.approval_required ? 'warn' : 'ok'}`}>{quote.approval_required ? 'Required' : 'Clear'}</span></td><td><StatusPill status={quote.status} /></td><td><Link className="table-link" href={`/quotes/${quote.id}`}>Review →</Link></td></tr>)}
          </tbody></table></div>
        )}
      </section>
    </div>
  );
}
