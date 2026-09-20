import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import type { JournalEntry } from '../../api/types';
import { formatCurrency } from '../../utils/format';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../auth/AuthContext';

const STATUS_LABELS: Record<string, string> = { DRAFT: 'مسودة', POSTED: 'مرحّل' };

export default function JournalEntryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!id) return;
    apiClient.get<JournalEntry>(`/journal-entries/${id}`).then((r) => setEntry(r.data));
  };

  useEffect(load, [id]);

  const canApprove = user?.role === 'ADMIN' || user?.role === 'FINANCE_MANAGER';

  const approve = async () => {
    setError(null);
    setBusy(true);
    try {
      await apiClient.post(`/journal-entries/${id}/approve`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!entry) return <p>جارٍ التحميل...</p>;

  const totalDebit = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
  const totalCredit = entry.lines.reduce((s, l) => s + Number(l.credit), 0);

  return (
    <div>
      <div className="page-header">
        <h1>
          قيد {entry.entryNumber} <span className="muted">({entry.entryDate})</span>
        </h1>
        <StatusBadge label={STATUS_LABELS[entry.status] ?? entry.status} status={entry.status} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <p>{entry.description}</p>
        <div className="detail-grid">
          <div>
            <span className="muted">مصدر القيد</span>
            <div>{entry.sourceType}</div>
          </div>
          {entry.approvedBy && (
            <div>
              <span className="muted">اعتُمد بواسطة</span>
              <div>{entry.approvedBy}</div>
            </div>
          )}
        </div>

        {entry.status === 'DRAFT' && (
          <div className="actions-row">
            {canApprove ? (
              <button className="btn btn-primary" disabled={busy} onClick={approve}>
                اعتماد وترحيل القيد
              </button>
            ) : (
              <span className="muted">هذا القيد بانتظار اعتماد صاحب الصلاحية (مدير مالي/مسؤول النظام)</span>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>الحساب</th>
              <th>البيان</th>
              <th>مدين</th>
              <th>دائن</th>
            </tr>
          </thead>
          <tbody>
            {entry.lines.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.account.code} - {l.account.name}
                </td>
                <td>{l.description}</td>
                <td>{Number(l.debit) > 0 ? formatCurrency(l.debit) : '—'}</td>
                <td>{Number(l.credit) > 0 ? formatCurrency(l.credit) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>
                <strong>الإجمالي</strong>
              </td>
              <td>
                <strong>{formatCurrency(totalDebit)}</strong>
              </td>
              <td>
                <strong>{formatCurrency(totalCredit)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button className="btn btn-link" onClick={() => navigate('/journal-entries')}>
        ← العودة لقائمة القيود
      </button>
    </div>
  );
}
