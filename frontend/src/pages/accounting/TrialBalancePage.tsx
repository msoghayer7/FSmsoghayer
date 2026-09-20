import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import type { TrialBalanceRow } from '../../api/types';
import { formatCurrency } from '../../utils/format';

const LEVELS = [1, 2, 3, 4, 5, 6, 7];

export default function TrialBalancePage() {
  const [level, setLevel] = useState(7);
  const [hideZero, setHideZero] = useState(true);
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<TrialBalanceRow[]>('/reports/trial-balance', { params: { level, hideZero } })
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false));
  }, [level, hideZero]);

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <div>
      <div className="page-header">
        <h1>ميزان المراجعة</h1>
      </div>

      <div className="card">
        <div className="inline-form" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            مستوى العرض
            <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  المستوى {l}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} />
            إخفاء الحسابات ذات الرصيد الصفري
          </label>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>الكود</th>
              <th>اسم الحساب</th>
              <th>مدين</th>
              <th>دائن</th>
              <th>الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td style={{ fontFamily: 'monospace' }}>{r.code}</td>
                <td>{r.name}</td>
                <td>{r.debit ? formatCurrency(r.debit) : '—'}</td>
                <td>{r.credit ? formatCurrency(r.credit) : '—'}</td>
                <td>{formatCurrency(r.balance)}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  لا توجد بيانات مرحّلة بعد
                </td>
              </tr>
            )}
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
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
