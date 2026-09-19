import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiErrorMessage } from '../api/client';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@fsm-erp.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>تسجيل الدخول</h1>
        <p className="muted">نظام إدارة العقود والمصروفات والأصول الثابتة</p>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          البريد الإلكتروني
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          كلمة المرور
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'جارٍ الدخول...' : 'دخول'}
        </button>
        <p className="muted small">
          بيانات الدخول الافتراضية بعد تشغيل سكربت التهيئة (seed): admin@fsm-erp.local / Admin@12345
        </p>
      </form>
    </div>
  );
}
