import { useEffect, useState, type FormEvent } from 'react';
import { apiClient, apiErrorMessage } from '../api/client';
import type { EntityProfile } from '../api/types';
import { useAuth } from '../auth/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EntityProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<EntityProfile>('/entity-profile').then((r) => setProfile(r.data));
  }, []);

  const canEdit = user?.role === 'ADMIN';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const { data } = await apiClient.patch<EntityProfile>('/entity-profile', {
        entityName: profile.entityName,
        entityNumber: profile.entityNumber,
        address: profile.address,
      });
      setProfile(data);
      setMessage('تم الحفظ بنجاح');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <p>جارٍ التحميل...</p>;

  return (
    <div>
      <h1>المعلومات العامة</h1>
      <form className="card form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-info">{message}</div>}
        <div className="form-grid">
          <label>
            اسم الجهة
            <input
              value={profile.entityName}
              disabled={!canEdit}
              onChange={(e) => setProfile({ ...profile, entityName: e.target.value })}
            />
          </label>
          <label>
            الرقم التعريفي للجهة
            <input
              value={profile.entityNumber ?? ''}
              disabled={!canEdit}
              onChange={(e) => setProfile({ ...profile, entityNumber: e.target.value })}
            />
          </label>
          <label>
            العملة
            <input value="ريال سعودي (SAR)" disabled />
          </label>
        </div>
        <label>
          العنوان
          <textarea
            value={profile.address ?? ''}
            disabled={!canEdit}
            rows={3}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          />
        </label>
        {canEdit ? (
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        ) : (
          <p className="muted small">تعديل هذه البيانات متاح لمسؤول النظام فقط.</p>
        )}
      </form>
    </div>
  );
}
