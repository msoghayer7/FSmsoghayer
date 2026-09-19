import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import type { AssetCategory } from '../../api/types';

export default function AssetForm() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    acquisitionDate: '',
    acquisitionCost: '',
    salvageValue: '0',
    usefulLifeMonths: '',
    location: '',
  });

  useEffect(() => {
    apiClient.get<AssetCategory[]>('/asset-categories').then((r) => setCategories(r.data));
  }, []);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data } = await apiClient.post('/assets', {
        name: form.name,
        categoryId: form.categoryId,
        acquisitionDate: form.acquisitionDate,
        acquisitionCost: Number(form.acquisitionCost),
        salvageValue: Number(form.salvageValue || 0),
        usefulLifeMonths: form.usefulLifeMonths ? Number(form.usefulLifeMonths) : undefined,
        location: form.location || undefined,
      });
      navigate(`/assets/${data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>أصل ثابت جديد</h1>
      <form className="card form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-grid">
          <label>
            اسم الأصل
            <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
          </label>
          <label>
            فئة الأصل
            <select required value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)}>
              <option value="">اختر...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (افتراضي {c.defaultUsefulLifeMonths} شهر)
                </option>
              ))}
            </select>
          </label>
          <label>
            تاريخ الاقتناء
            <input type="date" required value={form.acquisitionDate} onChange={(e) => update('acquisitionDate', e.target.value)} />
          </label>
          <label>
            تكلفة الاقتناء
            <input type="number" step="0.01" required value={form.acquisitionCost} onChange={(e) => update('acquisitionCost', e.target.value)} />
          </label>
          <label>
            قيمة الخردة (إن وجدت)
            <input type="number" step="0.01" value={form.salvageValue} onChange={(e) => update('salvageValue', e.target.value)} />
          </label>
          <label>
            العمر الإنتاجي (بالأشهر)
            <input
              type="number"
              placeholder={selectedCategory ? String(selectedCategory.defaultUsefulLifeMonths) : ''}
              value={form.usefulLifeMonths}
              onChange={(e) => update('usefulLifeMonths', e.target.value)}
            />
          </label>
          <label>
            الموقع
            <input value={form.location} onChange={(e) => update('location', e.target.value)} />
          </label>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'جارٍ الحفظ...' : 'حفظ الأصل'}
        </button>
      </form>
    </div>
  );
}
