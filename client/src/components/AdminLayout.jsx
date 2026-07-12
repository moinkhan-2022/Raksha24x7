import { useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell, FileText, LayoutDashboard, LogOut, Menu, Megaphone, Monitor, Search, Settings,
  Shield, ShieldAlert, UserCircle2, Users, X
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'SOS Monitoring', to: '/admin/sos', icon: ShieldAlert },
  { label: 'Email Logs', to: '/admin/email', icon: FileText },
  { label: 'Emergency Numbers', to: '/emergency-numbers', icon: ShieldAlert },
  { label: 'Safety Tips', to: '/admin/dashboard?section=safety-tips', icon: Megaphone },
  { label: 'Reports', to: '/admin/dashboard?section=reports', icon: FileText },
  { label: 'Notifications', to: '/admin/dashboard?section=notifications', icon: Bell },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
  { label: 'Sessions', to: '/admin/sessions', icon: Monitor },
  { label: 'Profile', to: '/admin/profile', icon: UserCircle2 }
];

function AdminLayout({ children, title = 'Admin Dashboard', subtitle = '' }) {
  const { admin, logoutAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const theme = localStorage.getItem('raksha_theme') === 'light' ? 'light' : 'dark';
  const isLight = theme === 'light';

  const suggestions = useMemo(() => navItems.map((item) => item.label).join(', '), []);

  const logout = async () => {
    await logoutAdmin();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-50 text-slate-950' : 'bg-slate-950 text-white'}`}>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open admin navigation" className="fixed left-4 top-4 z-40 rounded-2xl border border-white/10 bg-slate-900 p-3 text-white shadow-lg lg:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r p-4 transition lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'} ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-slate-950'}`}>
        <div className="flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-600 text-white"><Shield className="h-6 w-6" /></span>
            <span><span className="block font-bold">Raksha24x7</span><span className="text-xs text-slate-500">Admin Panel</span></span>
          </Link>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close admin navigation" className="rounded-xl p-2 hover:bg-white/10 lg:hidden"><X className="h-5 w-5" /></button>
        </div>
        <nav className="mt-8 space-y-2" aria-label="Admin navigation">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink key={label} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-red-600 text-white' : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/10'}`}>
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={logout} className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/20">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </aside>

      <div className="lg:pl-72">
        <header className={`sticky top-0 z-30 border-b px-4 py-4 backdrop-blur-xl md:px-6 ${isLight ? 'border-slate-200 bg-white/85' : 'border-white/10 bg-slate-950/80'}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="ml-14 lg:ml-0">
              <h1 className="text-2xl font-bold">{title}</h1>
              {subtitle ? <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-3">
              <label className={`relative hidden min-w-72 rounded-2xl border lg:block ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'}`}>
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input placeholder={`Search ${suggestions}`} className="h-11 w-full bg-transparent px-11 text-sm outline-none" aria-label="Admin global search" />
              </label>
              <button type="button" aria-label="Admin notifications" className={`relative rounded-2xl border p-3 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              </button>
              <Link to="/admin/profile" className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
                <UserCircle2 className="h-5 w-5" />
                <span className="hidden text-sm font-semibold sm:inline">{admin?.name || 'Admin'}</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}

export default AdminLayout;
