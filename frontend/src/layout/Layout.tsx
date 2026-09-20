import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const navItems = [
  { to: '/', label: 'لوحة التحكم', end: true },
  { to: '/contracts', label: 'العقود' },
  { to: '/expenses', label: 'المصروفات (الاستحقاق)' },
  { to: '/assets', label: 'الأصول الثابتة' },
  { to: '/accounts', label: 'دليل الحسابات' },
  { to: '/journal-entries', label: 'القيود اليومية' },
  { to: '/trial-balance', label: 'ميزان المراجعة' },
  { to: '/settings', label: 'المعلومات العامة' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">نظام الإدارة المالية</div>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="spacer" />
          <div className="user-box">
            <span>{user?.fullName}</span>
            <span className="badge">{user?.role}</span>
            <button className="btn btn-link" onClick={handleLogout}>
              تسجيل الخروج
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
