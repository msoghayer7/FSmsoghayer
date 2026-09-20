import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import type { FixedAsset } from '../../api/types';
import { formatCurrency } from '../../utils/format';
import { StatusBadge } from '../../components/StatusBadge';

const ASSET_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'نشط',
  FULLY_DEPRECIATED: 'مستهلك بالكامل',
  DISPOSED: 'مستبعد',
};

const PERIOD_STATUS_LABELS: Record<string, string> = {
  PENDING: 'بانتظار الترحيل',
  AWAITING_APPROVAL: 'قيد بانتظار الاعتماد',
  POSTED: 'مرحّل',
  CANCELLED: 'ملغي',
};

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<FixedAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [disposalDate, setDisposalDate] = useState('');
  const [proceeds, setProceeds] = useState('');

  const load = () => {
    if (!id) return;
    apiClient.get<FixedAsset>(`/assets/${id}`).then((r) => setAsset(r.data));
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

  if (!asset) return <p>جارٍ التحميل...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>
          {asset.name} <span className="muted">({asset.assetNumber})</span>
        </h1>
        <StatusBadge label={ASSET_STATUS_LABELS[asset.status] ?? asset.status} status={asset.status} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="detail-grid">
          <div>
            <span className="muted">الفئة</span>
            <div>{asset.category?.name}</div>
          </div>
          <div>
            <span className="muted">تاريخ الاقتناء</span>
            <div>{asset.acquisitionDate}</div>
          </div>
          <div>
            <span className="muted">تكلفة الاقتناء</span>
            <div>{formatCurrency(asset.acquisitionCost)}</div>
          </div>
          <div>
            <span className="muted">العمر الإنتاجي</span>
            <div>{asset.usefulLifeMonths} شهر</div>
          </div>
        </div>

        {asset.status !== 'DISPOSED' && (
          <div className="actions-row">
            {!asset.acquisitionJournalEntryId && (
              <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => apiClient.post(`/assets/${id}/record-acquisition`, {}))}>
                إنشاء قيد الاقتناء (مسودة)
              </button>
            )}
            {asset.acquisitionJournalEntryId && (
              <Link to={`/journal-entries/${asset.acquisitionJournalEntryId}`} className="btn btn-secondary">
                عرض قيد الاقتناء
              </Link>
            )}
            <div className="inline-form">
              <input type="date" placeholder="تاريخ الاستبعاد" value={disposalDate} onChange={(e) => setDisposalDate(e.target.value)} />
              <input type="number" step="0.01" placeholder="متحصلات الاستبعاد" value={proceeds} onChange={(e) => setProceeds(e.target.value)} />
              <button
                className="btn btn-danger"
                disabled={busy || !disposalDate || !proceeds}
                onClick={() =>
                  runAction(() => apiClient.post(`/assets/${id}/dispose`, { disposalDate, proceeds: Number(proceeds) }))
                }
              >
                استبعاد الأصل
              </button>
            </div>
          </div>
        )}
        {asset.disposalJournalEntryId && (
          <div className="actions-row">
            <Link to={`/journal-entries/${asset.disposalJournalEntryId}`} className="btn btn-secondary">
              عرض قيد الاستبعاد
            </Link>
          </div>
        )}
      </div>

      <div className="card">
        <h2>جدول الإهلاك</h2>
        <table className="table">
          <thead>
            <tr>
              <th>الفترة</th>
              <th>قسط الإهلاك</th>
              <th>مجمع الإهلاك</th>
              <th>القيمة الدفترية</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {asset.schedule.map((s) => (
              <tr key={s.id}>
                <td>{s.periodLabel}</td>
                <td>{formatCurrency(s.depreciationAmount)}</td>
                <td>{formatCurrency(s.accumulatedDepreciation)}</td>
                <td>{formatCurrency(s.bookValue)}</td>
                <td>{PERIOD_STATUS_LABELS[s.status] ?? s.status}</td>
                <td>
                  {s.status === 'PENDING' && asset.acquisitionJournalEntryId && asset.status !== 'DISPOSED' && (
                    <button
                      className="btn btn-small btn-secondary"
                      disabled={busy}
                      onClick={() => runAction(() => apiClient.post(`/assets/${id}/schedule/${s.id}/post-depreciation`))}
                    >
                      ترحيل هذه الفترة
                    </button>
                  )}
                  {s.status === 'AWAITING_APPROVAL' && s.journalEntryId && (
                    <Link to={`/journal-entries/${s.journalEntryId}`} className="btn btn-small btn-secondary">
                      اعتماد القيد
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn btn-link" onClick={() => navigate('/assets')}>
        ← العودة لقائمة الأصول
      </button>
    </div>
  );
}
