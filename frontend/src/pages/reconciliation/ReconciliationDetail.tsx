import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import type { Reconciliation } from '../../api/types';
import { formatCurrency } from '../../utils/format';
import { StatusBadge } from '../../components/StatusBadge';

const TYPE_LABELS: Record<string, string> = {
  BANK: 'مطابقة بنكية',
  AP_AR: 'مطابقة دائنين/مدينين',
  INTER_ENTITY: 'مطابقة بين الجهات',
};
const STATUS_LABELS: Record<string, string> = { DRAFT: 'قيد المطابقة', COMPLETED: 'مكتملة' };

export default function ReconciliationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rec, setRec] = useState<Reconciliation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [itemDesc, setItemDesc] = useState('');
  const [itemAmount, setItemAmount] = useState('');

  const load = () => {
    if (!id) return;
    apiClient.get<Reconciliation>(`/reconciliations/${id}`).then((r) => setRec(r.data));
  };

  useEffect(load, [id]);

  const runAction = async (action: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addItem = () => {
    if (!itemDesc || !itemAmount) return;
    runAction(() => apiClient.post(`/reconciliations/${id}/items`, { description: itemDesc, amount: Number(itemAmount) })).then(() => {
      setItemDesc('');
      setItemAmount('');
    });
  };

  if (!rec) return <p>جارٍ التحميل...</p>;

  const isBalanced = Math.abs(rec.difference) < 0.01;

  return (
    <div>
      <div className="page-header">
        <h1>
          {rec.reconciliationNumber} <span className="muted">({TYPE_LABELS[rec.type] ?? rec.type})</span>
        </h1>
        <StatusBadge label={STATUS_LABELS[rec.status] ?? rec.status} status={rec.status} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="detail-grid">
          <div>
            <span className="muted">الحساب</span>
            <div>
              {rec.account?.code} - {rec.account?.name}
            </div>
          </div>
          <div>
            <span className="muted">الطرف الآخر</span>
            <div>{rec.referenceLabel}</div>
          </div>
          <div>
            <span className="muted">حتى تاريخ</span>
            <div>{rec.periodEnd}</div>
          </div>
          <div>
            <span className="muted">رصيد دفتر الأستاذ</span>
            <div>{formatCurrency(rec.glBalance)}</div>
          </div>
          <div>
            <span className="muted">الرصيد الخارجي</span>
            <div>{formatCurrency(rec.externalBalance)}</div>
          </div>
          <div>
            <span className="muted">الرصيد المعدّل (دفتر الأستاذ + بنود التسوية)</span>
            <div>{formatCurrency(rec.adjustedBalance)}</div>
          </div>
          <div>
            <span className="muted">الفرق المتبقي</span>
            <div style={{ color: isBalanced ? '#1e7e34' : '#b3261e', fontWeight: 700 }}>{formatCurrency(rec.difference)}</div>
          </div>
        </div>
        {rec.notes && <p className="muted">{rec.notes}</p>}

        {rec.status === 'DRAFT' ? (
          <div className="actions-row">
            <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => apiClient.post(`/reconciliations/${id}/complete`))}>
              {isBalanced ? 'اعتماد المطابقة (متطابقة)' : 'اعتماد المطابقة رغم وجود فرق'}
            </button>
          </div>
        ) : (
          <div className="actions-row">
            <button className="btn btn-secondary" disabled={busy} onClick={() => runAction(() => apiClient.post(`/reconciliations/${id}/reopen`))}>
              إعادة فتح المطابقة
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>بنود التسوية</h2>
        <table className="table">
          <thead>
            <tr>
              <th>البيان</th>
              <th>المبلغ</th>
              {rec.status === 'DRAFT' && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rec.items.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{formatCurrency(item.amount)}</td>
                {rec.status === 'DRAFT' && (
                  <td>
                    <button
                      className="btn btn-small btn-secondary"
                      disabled={busy}
                      onClick={() => runAction(() => apiClient.delete(`/reconciliations/${id}/items/${item.id}`))}
                    >
                      حذف
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rec.items.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  لا توجد بنود تسوية
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {rec.status === 'DRAFT' && (
          <div className="inline-form" style={{ marginTop: '1rem' }}>
            <input placeholder="البيان (مثال: شيكات معلقة)" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} style={{ minWidth: 240 }} />
            <input type="number" step="0.01" placeholder="المبلغ" value={itemAmount} onChange={(e) => setItemAmount(e.target.value)} style={{ width: 140 }} />
            <button className="btn btn-secondary" disabled={busy} onClick={addItem}>
              + إضافة بند
            </button>
          </div>
        )}
      </div>

      <button className="btn btn-link" onClick={() => navigate('/reconciliations')}>
        ← العودة لقائمة المطابقات
      </button>
    </div>
  );
}
