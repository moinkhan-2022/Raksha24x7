import { useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3, Bell, FileText, LayoutDashboard, LogOut, Menu, Monitor, Search,
  Settings, Shield, ShieldAlert, UserCircle2, Users, X
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'SOS Monitoring', to: '/admin/sos', icon: ShieldAlert },
  { label: 'Email Logs', to: '/admin/email', icon: FileText },
  { label: 'Analytics & Reports', to: '/admin/analytics', icon: BarChart3 },
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

  const shell = isLight ? 'bg-slate-50 text-slate-950' : 'bg-[#070b14] text-white';
  const panel = isLight ? 'border-slate-200 bg-white/95' : 'border-white/10 bg-slate-950/95';
  const muted = isLight ? 'text-slate-600' : 'text-slate-400';

  return (
    <div className={`min-h-screen overflow-x-hidden ${shell}`}>
      {open ? <button type="button" aria-label="Close navigation overlay" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden" /> : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open admin navigation"
        className="fixed left-4 top-4 z-50 rounded-2xl border border-white/10 bg-slate-900 p-3 text-white shadow-lg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col border-r shadow-2xl shadow-black/10 transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'} ${panel}`}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Link to="/admin/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 text-white shadow-lg shadow-red-950/30">
              <Shield className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-base font-black tracking-tight">Raksha24x7</span>
              <span className={`text-xs ${muted}`}>Admin Panel</span>
            </span>
          </Link>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close admin navigation" className="rounded-xl p-2 hover:bg-white/10 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Admin navigation">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-red-600 text-white shadow-lg shadow-red-950/20'
                  : isLight
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {({ isActive }) => (
                <>
                  <span className={`absolute left-1 h-6 w-1 rounded-full transition ${isActive ? 'bg-white' : 'bg-transparent group-hover:bg-red-400/70'}`} />
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link to="/admin/profile" onClick={() => setOpen(false)} className={`mb-3 flex items-center gap-3 rounded-2xl border p-3 transition ${isLight ? 'border-slate-200 bg-slate-50 hover:bg-slate-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-red-500/10 text-red-300">
              <UserCircle2 className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">{admin?.name || 'Admin'}</span>
              <span className={`block truncate text-xs ${muted}`}>{admin?.role || 'admin'}</span>
            </span>
          </Link>
          <button type="button" onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/20">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-72">
        <header className={`sticky top-0 z-30 border-b px-4 py-4 backdrop-blur-xl md:px-6 ${isLight ? 'border-slate-200 bg-white/85' : 'border-white/10 bg-[#070b14]/90'}`}>
          <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="ml-14 min-w-0 lg:ml-0">
              <h1 className="truncate text-2xl font-black tracking-tight">{title}</h1>
              {subtitle ? <p className={`mt-1 max-w-3xl text-sm ${muted}`}>{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-3">
              <label className={`relative hidden min-w-80 rounded-2xl border shadow-sm lg:block ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'}`}>
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input placeholder={`Search ${suggestions}`} className="h-11 w-full bg-transparent px-11 text-sm outline-none placeholder:text-slate-500" aria-label="Admin global search" />
              </label>
              <button type="button" aria-label="Admin notifications" className={`relative rounded-2xl border p-3 transition hover:-translate-y-0.5 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500 shadow shadow-orange-500/40" />
              </button>
              <Link to="/admin/profile" className={`hidden items-center gap-2 rounded-2xl border px-3 py-2 transition hover:-translate-y-0.5 sm:flex ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
                <UserCircle2 className="h-5 w-5" />
                <span className="text-sm font-bold">{admin?.name || 'Admin'}</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}

export default AdminLayout;
