import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import type { Expense } from '../../api/types';
import { formatCurrency } from '../../utils/format';
import { StatusBadge } from '../../components/StatusBadge';

const PERIOD_STATUS_LABELS: Record<string, string> = {
  PENDING: 'بانتظار الترحيل',
  POSTED: 'مرحّل',
  CANCELLED: 'ملغي',
};

export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!id) return;
    apiClient.get<Expense>(`/expenses/${id}`).then((r) => setExpense(r.data));
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

  if (!expense) return <p>جارٍ التحميل...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>
          {expense.description} <span className="muted">({expense.expenseNumber})</span>
        </h1>
        <StatusBadge label={expense.status} status={expense.status} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="detail-grid">
          <div>
            <span className="muted">المورّد</span>
            <div>{expense.partner?.name}</div>
          </div>
          <div>
            <span className="muted">المبلغ الإجمالي</span>
            <div>{formatCurrency(expense.totalAmount, expense.currency)}</div>
          </div>
          <div>
            <span className="muted">فترة الاستحقاق</span>
            <div>
              {expense.accrualStartDate} → {expense.accrualEndDate}
            </div>
          </div>
          <div>
            <span className="muted">طريقة الاعتراف</span>
            <div>{expense.recognitionMethod === 'IMMEDIATE' ? 'فوري' : 'قسط ثابت شهري'}</div>
          </div>
          <div>
            <span className="muted">حساب المصروف</span>
            <div>
              {expense.expenseAccount?.code} - {expense.expenseAccount?.name}
            </div>
          </div>
        </div>

        {expense.status === 'DRAFT' && (
          <div className="actions-row">
            <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => apiClient.post(`/expenses/${id}/approve`))}>
              اعتماد وترحيل القيد الأولي
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>جدول الاستحقاق</h2>
        <table className="table">
          <thead>
            <tr>
              <th>الفترة</th>
              <th>من - إلى</th>
              <th>المبلغ</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expense.schedule.map((s) => (
              <tr key={s.id}>
                <td>{s.periodLabel}</td>
                <td>
                  {s.periodStart} → {s.periodEnd}
                </td>
                <td>{formatCurrency(s.amount, expense.currency)}</td>
                <td>{PERIOD_STATUS_LABELS[s.status] ?? s.status}</td>
                <td>
                  {s.status === 'PENDING' && expense.status === 'APPROVED' && (
                    <button
                      className="btn btn-small btn-secondary"
                      disabled={busy}
                      onClick={() => runAction(() => apiClient.post(`/expenses/${id}/schedule/${s.id}/recognize`))}
                    >
                      ترحيل هذه الفترة
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn btn-link" onClick={() => navigate('/expenses')}>
        ← العودة لقائمة المصروفات
      </button>
    </div>
  );
}
