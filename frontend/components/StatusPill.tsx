import type { Quote } from '@/types';

export default function StatusPill({ status }: { status: Quote['status'] }) {
  return <span className={`status-pill status-${status}`}>{status}</span>;
}