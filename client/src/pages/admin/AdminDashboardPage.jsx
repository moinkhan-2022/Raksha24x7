import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, ContactRound, Download, FileText, Megaphone, Settings, ShieldAlert,
  Smartphone, TrendingUp, UserCheck, Users
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';

const statMeta = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, color: 'text-blue-300 bg-blue-500/10' },
  { key: 'activeUsers', label: 'Active Users', icon: UserCheck, color: 'text-emerald-300 bg-emerald-500/10' },
  { key: 'verifiedUsers', label: 'Verified Users', icon: UserCheck, color: 'text-cyan-300 bg-cyan-500/10' },
  { key: 'emergencyContacts', label: 'Emergency Contacts', icon: ContactRound, color: 'text-purple-300 bg-purple-500/10' },
  { key: 'sosRequests', label: 'SOS Requests', icon: ShieldAlert, color: 'text-red-300 bg-red-500/10' },
  { key: 'installedPwas', label: 'Installed PWAs', icon: Smartphone, color: 'text-orange-300 bg-orange-500/10' },
  { key: 'notificationCount', label: 'Notification Count', icon: Bell, color: 'text-amber-300 bg-amber-500/10' }
];

const quickActions = [
  { label: 'Manage Users', icon: Users, to: '/admin/users' },
  { label: 'Emergency Numbers', icon: ShieldAlert, to: '/emergency-numbers' },
  { label: 'Safety Tips', icon: Megaphone, to: '/admin/dashboard?section=safety-tips' },
  { label: 'Notifications', icon: Bell, to: '/admin/dashboard?section=notifications' },
  { label: 'Reports', icon: FileText, to: '/admin/dashboard?section=reports' },
  { label: 'Settings', icon: Settings, to: '/admin/settings' }
];

function AdminDashboardPage() {
  const [data, setData] = useState({ stats: {}, recentActivity: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isLight = localStorage.getItem('raksha_theme') === 'light';

  useEffect(() => {
    adminApi.dashboard()
      .then((response) => setData({ stats: response.data.stats || {}, recentActivity: response.data.recentActivity || [] }))
      .catch((err) => setError(err.response?.data?.message || 'Could not load admin dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const cards = useMemo(() => statMeta.map((item) => ({ ...item, value: data.stats[item.key] ?? 0 })), [data.stats]);

  return (
    <AdminLayout title="Raksha24x7 Admin" subtitle="Monitor platform health and access admin tools quickly.">
      {error ? <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Admin dashboard metrics">
        {loading ? Array.from({ length: 7 }).map((_, index) => <div key={index} className={`h-32 animate-pulse rounded-3xl ${isLight ? 'bg-white' : 'bg-white/5'}`} />) : cards.map(({ key, label, value, icon: Icon, color }) => (
          <article key={key} className={`rounded-3xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
            <div className="flex items-start justify-between">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${color}`}><Icon className="h-6 w-6" /></span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300"><TrendingUp className="h-3 w-3" /> Live</span>
            </div>
            <p className="mt-5 text-3xl font-bold">{Number(value).toLocaleString()}</p>
            <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{label}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className={`rounded-3xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
          <h2 className="text-lg font-bold">Quick Actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map(({ label, icon: Icon, to }) => (
              <Link key={label} to={to} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${isLight ? 'border-slate-200 bg-slate-50 hover:bg-slate-100' : 'border-white/10 bg-slate-950/40 hover:bg-white/10'}`}>
                <Icon className="h-6 w-6 text-red-400" />
                <p className="mt-3 font-semibold">{label}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className={`rounded-3xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent Activity</h2>
            <Download className="h-5 w-5 text-slate-500" />
          </div>
          <div className="mt-4 space-y-3">
            {loading ? Array.from({ length: 5 }).map((_, index) => <div key={index} className={`h-16 animate-pulse rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} />) : data.recentActivity.length ? data.recentActivity.map((item) => (
              <article key={item.id} className={`rounded-2xl border p-3 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}>
                <p className="font-semibold">{item.title}</p>
                <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{item.description}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(item.time).toLocaleString()}</p>
              </article>
            )) : <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">No recent admin activity yet.</p>}
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}

export default AdminDashboardPage;
