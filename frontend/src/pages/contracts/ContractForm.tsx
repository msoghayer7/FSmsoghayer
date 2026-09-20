import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import type { Account, BillingFrequency, BusinessPartner, ContractType, Department } from '../../api/types';

const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: 'SERVICE', label: 'خدمات' },
  { value: 'LEASE', label: 'إيجار' },
  { value: 'SUPPLY', label: 'توريد' },
  { value: 'MAINTENANCE', label: 'صيانة' },
  { value: 'CONSULTING', label: 'استشارات' },
  { value: 'OTHER', label: 'أخرى' },
];

const BILLING_FREQUENCIES: { value: BillingFrequency; label: string }[] = [
  { value: 'ONE_TIME', label: 'دفعة واحدة' },
  { value: 'MONTHLY', label: 'شهري' },
  { value: 'QUARTERLY', label: 'ربع سنوي' },
  { value: 'SEMI_ANNUAL', label: 'نصف سنوي' },
  { value: 'ANNUAL', label: 'سنوي' },
];

export default function ContractForm() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<BusinessPartner[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    partnerId: '',
    type: 'SERVICE' as ContractType,
    startDate: '',
    endDate: '',
    totalValue: '',
    currency: 'SAR',
    billingFrequency: 'MONTHLY' as BillingFrequency,
    departmentId: '',
    defaultExpenseAccountId: '',
    notes: '',
  });

  useEffect(() => {
    apiClient.get<BusinessPartner[]>('/business-partners').then((r) => setPartners(r.data));
    apiClient.get<Department[]>('/departments').then((r) => setDepartments(r.data));
    apiClient.get<Account[]>('/accounts/postable', { params: { type: 'EXPENSE' } }).then((r) => setAccounts(r.data));
  }, []);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data } = await apiClient.post('/contracts', {
        title: form.title,
        partnerId: form.partnerId,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        totalValue: Number(form.totalValue),
        currency: form.currency,
        billingFrequency: form.billingFrequency,
        departmentId: form.departmentId || undefined,
        defaultExpenseAccountId: form.defaultExpenseAccountId || undefined,
        notes: form.notes || undefined,
      });
      navigate(`/contracts/${data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>عقد جديد</h1>
      <form className="card form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-grid">
          <label>
            عنوان العقد
            <input required value={form.title} onChange={(e) => update('title', e.target.value)} />
          </label>
          <label>
            الطرف الآخر (المورد/العميل)
            <select required value={form.partnerId} onChange={(e) => update('partnerId', e.target.value)}>
              <option value="">اختر...</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            نوع العقد
            <select value={form.type} onChange={(e) => update('type', e.target.value)}>
              {CONTRACT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            تكرار الفوترة
            <select value={form.billingFrequency} onChange={(e) => update('billingFrequency', e.target.value)}>
              {BILLING_FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            تاريخ البداية
            <input type="date" required value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
          </label>
          <label>
            تاريخ النهاية
            <input type="date" required value={form.endDate} onChange={(e) => update('endDate', e.target.value)} />
          </label>
          <label>
            القيمة الإجمالية
            <input type="number" step="0.01" required value={form.totalValue} onChange={(e) => update('totalValue', e.target.value)} />
          </label>
          <label>
            الإدارة/القسم
            <select value={form.departmentId} onChange={(e) => update('departmentId', e.target.value)}>
              <option value="">بدون</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            حساب المصروف الافتراضي (لتوليد المصروفات لاحقًا)
            <select value={form.defaultExpenseAccountId} onChange={(e) => update('defaultExpenseAccountId', e.target.value)}>
              <option value="">بدون</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          ملاحظات
          <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'جارٍ الحفظ...' : 'حفظ العقد'}
        </button>
      </form>
    </div>
  );
}
