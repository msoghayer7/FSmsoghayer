import { useEffect, useState } from 'react';
import { apiClient, apiErrorMessage } from '../../api/client';
import type { FiscalYear } from '../../api/types';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../auth/AuthContext';

export default function FiscalYearsPage() {
  const { user } = useAuth();
  const [years, setYears] = useState<FiscalYear[]>([]);
  const [newYear, setNewYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    apiClient.get<FiscalYear[]>('/fiscal-years').then((r) => setYears(r.data));
  };

  useEffect(load, []);

  const canManage = user?.role === 'ADMIN' || user?.role === 'FINANCE_MANAGER';
  const canReopen = user?.role === 'ADMIN';

  const nextYearSuggestion = years.length ? Math.max(...years.map((y) => y.yearNumber)) + 1 : 2026;

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

  const createYear = () => {
    const yearNumber = Number(newYear || nextYearSuggestion);
    runAction(() => apiClient.post('/fiscal-years', { yearNumber })).then(() => setNewYear(''));
  };

  return (
    <div>
      <div className="page-header">
        <h1>السنوات المالية</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {canManage && (
          <div className="inline-form" style={{ marginBottom: '1rem' }}>
            <input
              type="number"
              placeholder={String(nextYearSuggestion)}
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              style={{ width: 140 }}
            />
            <button className="btn btn-primary" disabled={busy} onClick={createYear}>
              + إنشاء سنة مالية جديدة
            </button>
          </div>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>السنة</th>
              <th>من</th>
              <th>إلى</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.id}>
                <td>{y.yearNumber}</td>
                <td>{y.startDate}</td>
                <td>{y.endDate}</td>
                <td>
                  <StatusBadge label={y.status === 'OPEN' ? 'مفتوحة' : 'مقفلة'} status={y.status} />
                </td>
                <td>
                  {canManage && y.status === 'OPEN' && (
                    <button
                      className="btn btn-small btn-danger"
                      disabled={busy}
                      onClick={() => runAction(() => apiClient.post(`/fiscal-years/${y.id}/close`))}
                    >
                      إقفال السنة
                    </button>
                  )}
                  {canReopen && y.status === 'CLOSED' && (
                    <button
                      className="btn btn-small btn-secondary"
                      disabled={busy}
                      onClick={() => runAction(() => apiClient.post(`/fiscal-years/${y.id}/reopen`))}
                    >
                      إعادة فتح السنة
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {years.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  لا توجد سنوات مالية بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
