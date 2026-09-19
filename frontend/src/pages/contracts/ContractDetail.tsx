import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import type { Contract } from '../../api/types';
import { formatCurrency } from '../../utils/format';
import { StatusBadge } from '../../components/StatusBadge';

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة',
  ACTIVE: 'نشط',
  RENEWED: 'مجدّد',
  EXPIRED: 'منتهي',
  TERMINATED: 'مفسوخ',
};

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renewDate, setRenewDate] = useState('');

  const load = () => {
    if (!id) return;
    apiClient.get<Contract>(`/contracts/${id}`).then((r) => setContract(r.data));
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

  if (!contract) return <p>جارٍ التحميل...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>
          {contract.title} <span className="muted">({contract.contractNumber})</span>
        </h1>
        <StatusBadge label={CONTRACT_STATUS_LABELS[contract.status] ?? contract.status} status={contract.status} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="detail-grid">
          <div>
            <span className="muted">الطرف الآخر</span>
            <div>{contract.partner?.name}</div>
          </div>
          <div>
            <span className="muted">النوع</span>
            <div>{contract.type}</div>
          </div>
          <div>
            <span className="muted">المدة</span>
            <div>
              {contract.startDate} → {contract.endDate}
            </div>
          </div>
          <div>
            <span className="muted">القيمة الإجمالية</span>
            <div>{formatCurrency(contract.totalValue, contract.currency)}</div>
          </div>
          <div>
            <span className="muted">تكرار الفوترة</span>
            <div>{contract.billingFrequency}</div>
          </div>
        </div>

        <div className="actions-row">
          {contract.status === 'DRAFT' && (
            <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => apiClient.post(`/contracts/${id}/activate`))}>
              تفعيل العقد
            </button>
          )}
          {(contract.status === 'ACTIVE' || contract.status === 'EXPIRED') && (
            <div className="inline-form">
              <input type="date" value={renewDate} onChange={(e) => setRenewDate(e.target.value)} />
              <button
                className="btn btn-secondary"
                disabled={busy || !renewDate}
                onClick={() => runAction(() => apiClient.post(`/contracts/${id}/renew`, { newEndDate: renewDate }))}
              >
                تجديد العقد
              </button>
            </div>
          )}
          {contract.status !== 'TERMINATED' && contract.status !== 'EXPIRED' && (
            <button className="btn btn-danger" disabled={busy} onClick={() => runAction(() => apiClient.post(`/contracts/${id}/terminate`))}>
              فسخ العقد
            </button>
          )}
          <Link to={`/expenses/new?contractId=${contract.id}`} className="btn btn-secondary">
            + إنشاء مصروف من هذا العقد
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>ملاحظات</h2>
        <p>{contract.notes || '—'}</p>
      </div>

      <button className="btn btn-link" onClick={() => navigate('/contracts')}>
        ← العودة لقائمة العقود
      </button>
    </div>
  );
}
