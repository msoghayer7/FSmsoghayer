import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import type { JournalEntry, JournalEntryStatus } from '../../api/types';
import { formatCurrency } from '../../utils/format';
import { StatusBadge } from '../../components/StatusBadge';

const STATUS_LABELS: Record<string, string> = { DRAFT: 'مسودة', POSTED: 'مرحّل' };
const TABS: { value: JournalEntryStatus | ''; label: string }[] = [
  { value: '', label: 'الكل' },
  { value: 'DRAFT', label: 'مسودات بانتظار الاعتماد' },
  { value: 'POSTED', label: 'مرحّلة' },
];

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [tab, setTab] = useState<JournalEntryStatus | ''>('');

  useEffect(() => {
    apiClient.get<JournalEntry[]>('/journal-entries', { params: tab ? { status: tab } : {} }).then((r) => setEntries(r.data));
  }, [tab]);

  return (
    <div>
      <div className="page-header">
        <h1>القيود اليومية</h1>
      </div>

      <div className="card">
        <div className="actions-row" style={{ borderTop: 'none', paddingTop: 0, marginBottom: '1rem' }}>
          {TABS.map((t) => (
            <button
              key={t.value}
              className={tab === t.value ? 'btn btn-primary btn-small' : 'btn btn-secondary btn-small'}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>رقم القيد</th>
              <th>التاريخ</th>
              <th>البيان</th>
              <th>الإجمالي</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link to={`/journal-entries/${e.id}`}>{e.entryNumber}</Link>
                </td>
                <td>{e.entryDate}</td>
                <td>{e.description}</td>
                <td>{formatCurrency(e.lines.reduce((s, l) => s + Number(l.debit), 0))}</td>
                <td>
                  <StatusBadge label={STATUS_LABELS[e.status] ?? e.status} status={e.status} />
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  لا توجد قيود
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
