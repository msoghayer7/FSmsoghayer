import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import type { Account, ReconciliationType } from '../../api/types';

const TYPES: { value: ReconciliationType; label: string }[] = [
  { value: 'BANK', label: 'مطابقة بنكية' },
  { value: 'AP_AR', label: 'مطابقة دائنين/مدينين' },
  { value: 'INTER_ENTITY', label: 'مطابقة بين الجهات' },
];

export default function ReconciliationForm() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: 'BANK' as ReconciliationType,
    accountId: '',
    referenceLabel: '',
    periodEnd: '',
    externalBalance: '',
    notes: '',
  });

  useEffect(() => {
    apiClient.get<Account[]>('/accounts/postable').then((r) => setAccounts(r.data));
  }, []);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data } = await apiClient.post('/reconciliations', {
        type: form.type,
        accountId: form.accountId,
        referenceLabel: form.referenceLabel,
        periodEnd: form.periodEnd,
        externalBalance: Number(form.externalBalance),
        notes: form.notes || undefined,
      });
      navigate(`/reconciliations/${data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>مطابقة جديدة</h1>
      <form className="card form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-grid">
          <label>
            نوع المطابقة
            <select value={form.type} onChange={(e) => update('type', e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            الحساب في دفتر الأستاذ
            <select required value={form.accountId} onChange={(e) => update('accountId', e.target.value)}>
              <option value="">اختر...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            اسم الطرف الآخر (البنك / المورد / الجهة)
            <input required value={form.referenceLabel} onChange={(e) => update('referenceLabel', e.target.value)} />
          </label>
          <label>
            حتى تاريخ
            <input type="date" required value={form.periodEnd} onChange={(e) => update('periodEnd', e.target.value)} />
          </label>
          <label>
            الرصيد الخارجي (كشف البنك / مصادقة الطرف الآخر)
            <input type="number" step="0.01" required value={form.externalBalance} onChange={(e) => update('externalBalance', e.target.value)} />
          </label>
        </div>
        <label>
          ملاحظات
          <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} />
        </label>
        <p className="muted small">سيُحتسب رصيد دفتر الأستاذ لهذا الحساب حتى التاريخ المحدد تلقائيًا عند الحفظ.</p>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'جارٍ الحفظ...' : 'إنشاء المطابقة'}
        </button>
      </form>
    </div>
  );
}
