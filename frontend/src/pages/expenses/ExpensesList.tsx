import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import type { Expense } from '../../api/types';
import { formatCurrency } from '../../utils/format';
import { StatusBadge } from '../../components/StatusBadge';

const EXPENSE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة',
  APPROVED: 'معتمد (تحت التوزيع)',
  POSTED: 'مرحّل بالكامل',
  CANCELLED: 'ملغي',
};

export default function ExpensesList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    apiClient.get<Expense[]>('/expenses').then((r) => setExpenses(r.data));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>المصروفات وفق أساس الاستحقاق</h1>
        <Link to="/expenses/new" className="btn btn-primary">
          + مصروف جديد
        </Link>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>رقم المصروف</th>
              <th>الوصف</th>
              <th>المورّد</th>
              <th>المبلغ</th>
              <th>طريقة الاعتراف</th>
              <th>الفترات المرحّلة</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => {
              const posted = e.schedule.filter((s) => s.status === 'POSTED').length;
              return (
                <tr key={e.id}>
                  <td>
                    <Link to={`/expenses/${e.id}`}>{e.expenseNumber}</Link>
                  </td>
                  <td>{e.description}</td>
                  <td>{e.partner?.name}</td>
                  <td>{formatCurrency(e.totalAmount, e.currency)}</td>
                  <td>{e.recognitionMethod === 'IMMEDIATE' ? 'فوري' : 'قسط ثابت'}</td>
                  <td>
                    {posted} / {e.schedule.length}
                  </td>
                  <td>
                    <StatusBadge label={EXPENSE_STATUS_LABELS[e.status] ?? e.status} status={e.status} />
                  </td>
                </tr>
              );
            })}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  لا توجد مصروفات بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
