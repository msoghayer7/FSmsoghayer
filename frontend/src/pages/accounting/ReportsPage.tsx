import { useEffect, useState } from 'react';
import { apiClient, apiErrorMessage } from '../../api/client';
import type { Account, JournalEntryStatus } from '../../api/types';

type ReportType = 'trial-balance' | 'account-statement' | 'journal-entries';

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'trial-balance', label: 'ميزان المراجعة' },
  { value: 'account-statement', label: 'كشف حساب' },
  { value: 'journal-entries', label: 'سجل القيود اليومية' },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('trial-balance');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [level, setLevel] = useState(7);
  const [hideZero, setHideZero] = useState(true);
  const [accountId, setAccountId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [jeStatus, setJeStatus] = useState<JournalEntryStatus | ''>('');

  useEffect(() => {
    apiClient.get<Account[]>('/accounts/postable').then((r) => setAccounts(r.data));
  }, []);

  const download = async (format: 'xlsx' | 'pdf') => {
    setError(null);
    let url = '';
    const params: Record<string, string | number | boolean> = { format };

    if (reportType === 'trial-balance') {
      url = '/reports/trial-balance/export';
      params.level = level;
      params.hideZero = hideZero;
    } else if (reportType === 'account-statement') {
      if (!accountId) {
        setError('اختر حسابًا أولاً');
        return;
      }
      url = '/reports/account-statement/export';
      params.accountId = accountId;
      if (from) params.from = from;
      if (to) params.to = to;
    } else {
      url = '/journal-entries/export';
      if (jeStatus) params.status = jeStatus;
    }

    setBusy(true);
    try {
      const response = await apiClient.get(url, { params, responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${reportType}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>التقارير</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="form-grid">
          <label>
            نوع التقرير
            <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          {reportType === 'trial-balance' && (
            <>
              <label>
                مستوى العرض
                <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7].map((l) => (
                    <option key={l} value={l}>
                      المستوى {l}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
                <input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} />
                إخفاء الحسابات ذات الرصيد الصفري
              </label>
            </>
          )}

          {reportType === 'account-statement' && (
            <>
              <label>
                الحساب
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  <option value="">اختر...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                من تاريخ
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                إلى تاريخ
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
            </>
          )}

          {reportType === 'journal-entries' && (
            <label>
              الحالة
              <select value={jeStatus} onChange={(e) => setJeStatus(e.target.value as JournalEntryStatus | '')}>
                <option value="">الكل</option>
                <option value="DRAFT">مسودات</option>
                <option value="POSTED">مرحّلة</option>
              </select>
            </label>
          )}
        </div>

        <div className="actions-row">
          <button className="btn btn-primary" disabled={busy} onClick={() => download('xlsx')}>
            تصدير Excel
          </button>
          <button className="btn btn-secondary" disabled={busy} onClick={() => download('pdf')}>
            تصدير PDF
          </button>
        </div>
      </div>
    </div>
  );
}
