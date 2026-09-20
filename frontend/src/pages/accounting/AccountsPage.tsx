import { useEffect, useMemo, useState } from 'react';
import { apiClient, apiErrorMessage } from '../../api/client';
import type { Account } from '../../api/types';
import { formatNumber } from '../../utils/format';

const TYPE_LABELS: Record<string, string> = {
  ASSET: 'أصول',
  LIABILITY: 'التزامات',
  EQUITY: 'صافي الأصول / حقوق الملكية',
  REVENUE: 'إيرادات',
  EXPENSE: 'مصروفات',
  MIXED: 'مختلط (مدين/دائن)',
  OFF_BALANCE: 'خارج بيان المركز المالي',
  OTHER: 'أخرى',
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    apiClient.get<Account[]>('/accounts').then((r) => setAccounts(r.data));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const term = search.trim();
    return accounts.filter((a) => {
      if (!showInactive && !a.isActive) return false;
      if (!term) return true;
      return a.code.includes(term) || a.name.includes(term);
    });
  }, [accounts, search, showInactive]);

  const toggleActive = async (account: Account) => {
    setError(null);
    setBusyId(account.id);
    try {
      await apiClient.patch(`/accounts/${account.id}/active`, { isActive: !account.isActive });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>دليل الحسابات</h1>
        <span className="muted">{formatNumber(accounts.length)} حساب</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="inline-form" style={{ marginBottom: '1rem' }}>
          <input
            placeholder="ابحث بالكود أو الاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 260 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            إظهار الحسابات الموقوفة
          </label>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>الكود</th>
              <th>اسم الحساب</th>
              <th>المستوى</th>
              <th>النوع</th>
              <th>طبيعة الرصيد</th>
              <th>تفصيلي/تجميعي</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map((a) => (
              <tr key={a.id} style={{ opacity: a.isActive ? 1 : 0.5 }}>
                <td style={{ fontFamily: 'monospace' }}>{a.code}</td>
                <td style={{ paddingRight: `${(a.level - 1) * 1.1}rem` }}>{a.name}</td>
                <td>{a.level}</td>
                <td>{TYPE_LABELS[a.type] ?? a.type}</td>
                <td>{a.balanceSide === 'DEBIT' ? 'مدين' : a.balanceSide === 'CREDIT' ? 'دائن' : a.balanceSide === 'BOTH' ? 'مدين/دائن' : '—'}</td>
                <td>{a.isPostable ? 'تفصيلي' : 'تجميعي'}</td>
                <td>
                  <span className={`badge ${a.isActive ? 'badge-success' : 'badge-danger'}`}>
                    {a.isActive ? 'فعال' : 'موقوف'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-small btn-secondary"
                    disabled={busyId === a.id}
                    onClick={() => toggleActive(a)}
                  >
                    {a.isActive ? 'إيقاف' : 'تفعيل'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 500 && (
          <p className="muted small">تم عرض أول 500 نتيجة من أصل {formatNumber(filtered.length)} — استخدم البحث لتضييق النتائج.</p>
        )}
      </div>
    </div>
  );
}
