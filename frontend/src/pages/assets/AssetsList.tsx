import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import type { FixedAsset } from '../../api/types';
import { formatCurrency } from '../../utils/format';
import { StatusBadge } from '../../components/StatusBadge';

const ASSET_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'نشط',
  FULLY_DEPRECIATED: 'مستهلك بالكامل',
  DISPOSED: 'مستبعد',
};

export default function AssetsList() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);

  useEffect(() => {
    apiClient.get<FixedAsset[]>('/assets').then((r) => setAssets(r.data));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>الأصول الثابتة</h1>
        <Link to="/assets/new" className="btn btn-primary">
          + أصل جديد
        </Link>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>رقم الأصل</th>
              <th>الاسم</th>
              <th>الفئة</th>
              <th>تكلفة الاقتناء</th>
              <th>العمر الإنتاجي</th>
              <th>الإهلاك المرحّل</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const posted = a.schedule.filter((s) => s.status === 'POSTED');
              const accDep = posted.length ? posted[posted.length - 1].accumulatedDepreciation : 0;
              return (
                <tr key={a.id}>
                  <td>
                    <Link to={`/assets/${a.id}`}>{a.assetNumber}</Link>
                  </td>
                  <td>{a.name}</td>
                  <td>{a.category?.name}</td>
                  <td>{formatCurrency(a.acquisitionCost)}</td>
                  <td>{a.usefulLifeMonths} شهر</td>
                  <td>{formatCurrency(accDep)}</td>
                  <td>
                    <StatusBadge label={ASSET_STATUS_LABELS[a.status] ?? a.status} status={a.status} />
                  </td>
                </tr>
              );
            })}
            {assets.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  لا توجد أصول بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
