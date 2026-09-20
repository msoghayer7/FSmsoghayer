import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import type { PolicyCategory, PolicyDocument } from '../../api/types';

const CATEGORY_LABELS: Record<PolicyCategory, string> = {
  STANDARD: 'المعايير المحاسبية (IPSAS/IAS/RPG)',
  PROCEDURE: 'الإجراءات والتعليمات المالية',
  FORM: 'النماذج المعتمدة',
};

const TABS: { value: PolicyCategory | ''; label: string }[] = [
  { value: '', label: 'الكل' },
  { value: 'STANDARD', label: CATEGORY_LABELS.STANDARD },
  { value: 'PROCEDURE', label: CATEGORY_LABELS.PROCEDURE },
  { value: 'FORM', label: CATEGORY_LABELS.FORM },
];

export default function PolicyLibraryPage() {
  const [rows, setRows] = useState<PolicyDocument[]>([]);
  const [category, setCategory] = useState<PolicyCategory | ''>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    if (search) params.search = search;
    apiClient.get<PolicyDocument[]>('/policy-documents', { params }).then((r) => setRows(r.data));
  }, [category, search]);

  return (
    <div>
      <div className="page-header">
        <h1>مكتبة السياسات والإجراءات والمعايير</h1>
      </div>

      <div className="alert alert-info">
        هذا فهرس مرجعي (عناوين ورموز الوثائق الرسمية) لدليل السياسات المحاسبية ودليل الإجراءات والتعليمات المالية الموحد
        ودليل المعايير (IPSAS/IAS/RPG) والنماذج المعتمدة. الوثائق الكاملة (PDF/Word) غير مخزّنة داخل النظام في هذه المرحلة —
        يُرجى الرجوع للنسخة الرسمية لدى الجهة المختصة.
      </div>

      <div className="card">
        <div className="actions-row" style={{ borderTop: 'none', paddingTop: 0, marginBottom: '1rem', flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button
              key={t.value}
              className={category === t.value ? 'btn btn-primary btn-small' : 'btn btn-secondary btn-small'}
              onClick={() => setCategory(t.value)}
            >
              {t.label}
            </button>
          ))}
          <input placeholder="بحث بالعنوان أو الرمز..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220 }} />
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>التصنيف</th>
              <th>الرمز</th>
              <th>العنوان</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{CATEGORY_LABELS[r.category]}</td>
                <td style={{ fontFamily: 'monospace' }}>{r.code ?? '—'}</td>
                <td>{r.title}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  لا توجد نتائج
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
