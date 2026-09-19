const POSITIVE = new Set(['ACTIVE', 'RENEWED', 'POSTED', 'APPROVED']);
const NEGATIVE = new Set(['TERMINATED', 'EXPIRED', 'CANCELLED', 'DISPOSED']);

export function StatusBadge({ label, status }: { label: string; status: string }) {
  const tone = POSITIVE.has(status) ? 'success' : NEGATIVE.has(status) ? 'danger' : 'neutral';
  return <span className={`badge badge-${tone}`}>{label}</span>;
}
