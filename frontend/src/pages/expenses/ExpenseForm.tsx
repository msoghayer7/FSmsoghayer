import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import type { Account, BusinessPartner, Contract, ExpenseRecognitionMethod } from '../../api/types';

export default function ExpenseForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contractId = searchParams.get('contractId') ?? '';

  const [contract, setContract] = useState<Contract | null>(null);
  const [partners, setPartners] = useState<BusinessPartner[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    partnerId: '',
    description: '',
    category: '',
    totalAmount: '',
    invoiceNumber: '',
    invoiceDate: '',
    accrualStartDate: '',
    accrualEndDate: '',
    recognitionMethod: 'STRAIGHT_LINE' as ExpenseRecognitionMethod,
    expenseAccountId: '',
  });

  useEffect(() => {
    apiClient.get<BusinessPartner[]>('/business-partners').then((r) => setPartners(r.data));
    apiClient.get<Account[]>('/accounts/postable', { params: { type: 'EXPENSE' } }).then((r) => setExpenseAccounts(r.data));
    if (contractId) {
      apiClient.get<Contract>(`/contracts/${contractId}`).then((r) => {
        setContract(r.data);
        setForm((f) => ({
          ...f,
          partnerId: r.data.partnerId,
          expenseAccountId: r.data.defaultExpenseAccountId ?? '',
          description: `${r.data.title} - مصروف دوري`,
        }));
      });
    }
  }, [contractId]);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data } = await apiClient.post('/expenses', {
        contractId: contractId || undefined,
        partnerId: form.partnerId || undefined,
        description: form.description,
        category: form.category || undefined,
        totalAmount: Number(form.totalAmount),
        invoiceNumber: form.invoiceNumber || undefined,
        invoiceDate: form.invoiceDate,
        accrualStartDate: form.accrualStartDate,
        accrualEndDate: form.accrualEndDate,
        recognitionMethod: form.recognitionMethod,
        expenseAccountId: form.expenseAccountId || undefined,
      });
      navigate(`/expenses/${data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>مصروف جديد (وفق أساس الاستحقاق)</h1>
      {contract && (
        <div className="alert alert-info">
          مرتبط بالعقد: {contract.title} ({contract.contractNumber})
        </div>
      )}
      <form className="card form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-grid">
          <label>
            الوصف
            <input required value={form.description} onChange={(e) => update('description', e.target.value)} />
          </label>
          <label>
            المورّد
            <select required value={form.partnerId} onChange={(e) => update('partnerId', e.target.value)} disabled={!!contract}>
              <option value="">اختر...</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            التصنيف
            <input value={form.category} onChange={(e) => update('category', e.target.value)} />
          </label>
          <label>
            حساب المصروف (دفتر الأستاذ)
            <select required value={form.expenseAccountId} onChange={(e) => update('expenseAccountId', e.target.value)}>
              <option value="">اختر...</option>
              {expenseAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            رقم الفاتورة
            <input value={form.invoiceNumber} onChange={(e) => update('invoiceNumber', e.target.value)} />
          </label>
          <label>
            تاريخ الفاتورة
            <input type="date" required value={form.invoiceDate} onChange={(e) => update('invoiceDate', e.target.value)} />
          </label>
          <label>
            المبلغ الإجمالي
            <input type="number" step="0.01" required value={form.totalAmount} onChange={(e) => update('totalAmount', e.target.value)} />
          </label>
          <label>
            طريقة الاعتراف بالمصروف
            <select value={form.recognitionMethod} onChange={(e) => update('recognitionMethod', e.target.value)}>
              <option value="IMMEDIATE">فوري (دفعة واحدة)</option>
              <option value="STRAIGHT_LINE">توزيع بالقسط الثابت على فترة الاستحقاق</option>
            </select>
          </label>
          <label>
            بداية فترة الاستحقاق
            <input type="date" required value={form.accrualStartDate} onChange={(e) => update('accrualStartDate', e.target.value)} />
          </label>
          <label>
            نهاية فترة الاستحقاق
            <input type="date" required value={form.accrualEndDate} onChange={(e) => update('accrualEndDate', e.target.value)} />
          </label>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'جارٍ الحفظ...' : 'حفظ المصروف'}
        </button>
      </form>
    </div>
  );
}
