import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Contract, Expense, FixedAsset, JournalEntry } from '../api/types';
import { formatCurrency } from '../utils/format';

export default function Dashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    apiClient.get<Contract[]>('/contracts').then((r) => setContracts(r.data));
    apiClient.get<Expense[]>('/expenses').then((r) => setExpenses(r.data));
    apiClient.get<FixedAsset[]>('/assets').then((r) => setAssets(r.data));
    apiClient.get<JournalEntry[]>('/journal-entries').then((r) => setEntries(r.data.slice(0, 8)));
  }, []);

  const activeContractsValue = contracts
    .filter((c) => c.status === 'ACTIVE' || c.status === 'RENEWED')
    .reduce((sum, c) => sum + Number(c.totalValue), 0);

  const pendingAccrualAmount = expenses
    .flatMap((e) => e.schedule)
    .filter((s) => s.status === 'PENDING')
    .reduce((sum, s) => sum + Number(s.amount), 0);

  const activeAssetsBookValue = assets
    .filter((a) => a.status !== 'DISPOSED')
    .reduce((sum, a) => {
      const posted = a.schedule.filter((s) => s.status === 'POSTED');
      const accDep = posted.length ? posted[posted.length - 1].accumulatedDepreciation : 0;
      return sum + (Number(a.acquisitionCost) - Number(accDep));
    }, 0);

  return (
    <div>
      <h1>لوحة التحكم</h1>
      <div className="cards-grid">
        <div className="card stat-card">
          <div className="stat-label">قيمة العقود النشطة</div>
          <div className="stat-value">{formatCurrency(activeContractsValue)}</div>
          <Link to="/contracts">عرض العقود ←</Link>
        </div>
        <div className="card stat-card">
          <div className="stat-label">مصروفات مستحقة لم تُرحّل بعد</div>
          <div className="stat-value">{formatCurrency(pendingAccrualAmount)}</div>
          <Link to="/expenses">عرض المصروفات ←</Link>
        </div>
        <div className="card stat-card">
          <div className="stat-label">صافي القيمة الدفترية للأصول</div>
          <div className="stat-value">{formatCurrency(activeAssetsBookValue)}</div>
          <Link to="/assets">عرض الأصول ←</Link>
        </div>
      </div>

      <div className="card">
        <h2>آخر القيود المحاسبية</h2>
        <table className="table">
          <thead>
            <tr>
              <th>رقم القيد</th>
              <th>التاريخ</th>
              <th>البيان</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.entryNumber}</td>
                <td>{e.entryDate}</td>
                <td>{e.description}</td>
                <td>{formatCurrency(e.lines.reduce((s, l) => s + Number(l.debit), 0))}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  لا توجد قيود بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
