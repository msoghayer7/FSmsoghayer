import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import type { Reconciliation } from '../../api/types';
import { formatCurrency } from '../../utils/format';
import { StatusBadge } from '../../components/StatusBadge';

const TYPE_LABELS: Record<string, string> = {
  BANK: 'مطابقة بنكية',
  AP_AR: 'مطابقة دائنين/مدينين',
  INTER_ENTITY: 'مطابقة بين الجهات',
};

const STATUS_LABELS: Record<string, string> = { DRAFT: 'قيد المطابقة', COMPLETED: 'مكتملة' };

export default function ReconciliationsList() {
  const [rows, setRows] = useState<Reconciliation[]>([]);

  useEffect(() => {
    apiClient.get<Reconciliation[]>('/reconciliations').then((r) => setRows(r.data));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>المطابقات</h1>
        <Link to="/reconciliations/new" className="btn btn-primary">
          + مطابقة جديدة
        </Link>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>الرقم</th>
              <th>النوع</th>
              <th>الحساب</th>
              <th>الطرف الآخر</th>
              <th>حتى تاريخ</th>
              <th>الفرق</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link to={`/reconciliations/${r.id}`}>{r.reconciliationNumber}</Link>
                </td>
                <td>{TYPE_LABELS[r.type] ?? r.type}</td>
                <td>
                  {r.account?.code} - {r.account?.name}
                </td>
                <td>{r.referenceLabel}</td>
                <td>{r.periodEnd}</td>
                <td style={{ color: Math.abs(r.difference) > 0.01 ? '#b3261e' : undefined }}>{formatCurrency(r.difference)}</td>
                <td>
                  <StatusBadge label={STATUS_LABELS[r.status] ?? r.status} status={r.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  لا توجد مطابقات بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
