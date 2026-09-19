import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
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

export default function ContractsList() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiClient
      .get<Contract[]>('/contracts')
      .then((r) => setContracts(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <div className="page-header">
        <h1>العقود</h1>
        <Link to="/contracts/new" className="btn btn-primary">
          + عقد جديد
        </Link>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>رقم العقد</th>
              <th>العنوان</th>
              <th>الطرف الآخر</th>
              <th>النوع</th>
              <th>القيمة</th>
              <th>من - إلى</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/contracts/${c.id}`}>{c.contractNumber}</Link>
                </td>
                <td>{c.title}</td>
                <td>{c.partner?.name}</td>
                <td>{c.type}</td>
                <td>{formatCurrency(c.totalValue, c.currency)}</td>
                <td>
                  {c.startDate} → {c.endDate}
                </td>
                <td>
                  <StatusBadge label={CONTRACT_STATUS_LABELS[c.status] ?? c.status} status={c.status} />
                </td>
              </tr>
            ))}
            {!loading && contracts.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  لا توجد عقود بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
