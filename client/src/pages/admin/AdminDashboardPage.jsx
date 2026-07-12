import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, BarChart3, Bell, CheckCircle2, Clock, FileText,
  HeartPulse, Mail, MapPin, RefreshCw, Search, Settings, ShieldAlert,
  TrendingDown, TrendingUp, UserCheck, Users, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';

const rangeOptions = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'All Time', value: 'all' }
];

const statIcons = {
  totalUsers: Users,
  totalSosAlerts: ShieldAlert,
  activeSosSessions: HeartPulse,
  emergencyContacts: UserCheck,
  nearbySearches: MapPin,
  emailsSent: Mail,
  emailsFailed: AlertTriangle,
  notificationsSent: Bell,
  weeklyActiveUsers: Activity,
  todayRegistrations: Zap
};

const quickActions = [
  { label: 'Manage Users', to: '/admin/users', icon: Users, description: 'Open user administration' },
  { label: 'View SOS', to: '/admin/sos', icon: ShieldAlert, description: 'Review SOS analytics' },
  { label: 'Email Logs', to: '/admin/email', icon: Mail, description: 'Delivery and queue monitoring' },
  { label: 'Notifications', to: '/admin/dashboard?section=notifications', icon: Bell, description: 'Notification monitoring' },
  { label: 'Analytics', to: '/admin/analytics', icon: BarChart3, description: 'Growth and usage charts' },
  { label: 'Reports', to: '/admin/analytics', icon: FileText, description: 'Reports, exports and audit logs' },
  { label: 'Settings', to: '/admin/settings', icon: Settings, description: 'Admin configuration' }
];

const compactNumber = (value) => Number(value || 0).toLocaleString();
const statusTone = {
  healthy: 'bg-emerald-500 text-emerald-50',
  warning: 'bg-amber-500 text-amber-950',
  error: 'bg-red-500 text-red-50'
};

function AdminDashboardPage() {
  const isLight = localStorage.getItem('raksha_theme') === 'light';
  const [range, setRange] = useState('7d');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [health, setHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [overviewRes, activityRes, healthRes] = await Promise.all([
        adminApi.dashboardOverview({ range }),
        adminApi.dashboardActivity({ range }),
        adminApi.dashboardSystemHealth()
      ]);
      setData(overviewRes.data);
      setActivity(activityRes.data.activity || []);
      setHealth(healthRes.data.health || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load admin dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [range]);

  const filteredActivity = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return activity;
    return activity.filter((item) => [item.title, item.user, item.status, item.category].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [activity, search]);

  const stats = data?.stats || [];
  const users = data?.users || {};
  const sos = data?.sos || {};
  const emails = data?.emails || {};
  const notifications = data?.notifications || {};
  const charts = data?.charts || {};

  return (
    <AdminLayout title="Admin Dashboard" subtitle="Real-time overview of Raksha24x7 safety operations.">
      <div className="space-y-6">
        <section className={`rounded-3xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">System Overview</p>
              <h2 className="mt-2 text-2xl font-bold">Command Center</h2>
              <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Monitor users, SOS activity, email delivery, notifications, and platform health.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className={`relative min-w-64 rounded-2xl border ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}>
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search activity, SOS, emails..." className="h-12 w-full bg-transparent px-11 text-sm outline-none" aria-label="Search admin dashboard activity" />
              </label>
              <select value={range} onChange={(event) => setRange(event.target.value)} className={`h-12 rounded-2xl border px-4 text-sm font-semibold outline-none ${isLight ? 'border-slate-200 bg-white text-slate-800' : 'border-white/10 bg-slate-950 text-white'}`} aria-label="Dashboard date range">
                {rangeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <button type="button" onClick={() => loadDashboard(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60" disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
            <button type="button" onClick={() => loadDashboard()} className="ml-3 font-bold underline">Retry</button>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Admin dashboard statistics">
          {loading ? <CardSkeleton count={10} isLight={isLight} /> : stats.map((item, index) => <StatCard key={item.key} item={item} index={index} isLight={isLight} />)}
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <AnalyticsPanel title="User Analytics" icon={Users} items={[
            ['Total Registered Users', users.totalRegisteredUsers],
            ['Active Users Today', users.activeUsersToday],
            ['New Users This Week', users.newUsersThisWeek],
            ['New Users This Month', users.newUsersThisMonth],
            ['Verified Users', users.verifiedUsers],
            ['Unverified Users', users.unverifiedUsers],
            ['Online Users', users.onlineUsers],
            ['Last Registered User', users.lastRegisteredUser?.name || users.lastRegisteredUser?.email || 'N/A']
          ]} isLight={isLight} />
          <AnalyticsPanel title="SOS Analytics" icon={ShieldAlert} items={[
            ['Total SOS Alerts', sos.totalSosAlerts],
            ['Active SOS', sos.activeSos],
            ['Completed SOS', sos.completedSos],
            ['Cancelled SOS', sos.cancelledSos],
            ['Failed SOS', sos.failedSos],
            ['Average Response Time', sos.averageResponseTime],
            ["Today's SOS", sos.todaySos],
            ['Weekly SOS', sos.weeklySos]
          ]} isLight={isLight} />
          <AnalyticsPanel title="Email & Notifications" icon={Bell} items={[
            ['Emails Sent', emails.emailsSent],
            ['Emails Delivered', emails.emailsDelivered],
            ['Emails Failed', emails.emailsFailed],
            ['Pending Emails', emails.pendingEmails],
            ['Verification Emails', emails.verificationEmails],
            ['Password Reset Emails', emails.passwordResetEmails],
            ['Push Notifications', notifications.pushNotifications],
            ['Success Rate', `${notifications.notificationSuccessRate || 0}%`]
          ]} isLight={isLight} />
        </section>

        <section className="grid gap-5 xl:grid-cols-2" aria-label="Admin dashboard charts">
          <ChartCard title="User Registration Trend" data={charts.userTrend || []} color="bg-blue-500" isLight={isLight} />
          <ChartCard title="SOS Activity Trend" data={charts.sosTrend || []} color="bg-red-500" isLight={isLight} />
          <ChartCard title="Weekly Notification Statistics" data={charts.notificationTrend || []} color="bg-amber-500" isLight={isLight} />
          <StatusChart title="Email Delivery Status" data={charts.emailStatus || {}} isLight={isLight} />
          <ChartCard title="Monthly Growth" data={charts.monthlyGrowth || []} color="bg-emerald-500" isLight={isLight} wide />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <div className={`rounded-3xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Recent Activity</h2>
                <p className="mt-1 text-sm text-slate-500">Latest users, SOS, emails, notifications, and admin events.</p>
              </div>
              <Clock className="h-5 w-5 text-slate-500" />
            </div>
            <div className="mt-4 space-y-3">
              {loading ? <ActivitySkeleton isLight={isLight} /> : filteredActivity.length ? filteredActivity.map((item) => <ActivityItem key={item.id} item={item} isLight={isLight} />) : <EmptyState text="No activity matches your search." />}
            </div>
          </div>

          <div className="space-y-5">
            <div className={`rounded-3xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
              <h2 className="text-lg font-bold">System Health</h2>
              <div className="mt-4 space-y-3">
                {loading ? <ActivitySkeleton isLight={isLight} /> : health.map((item) => <HealthRow key={item.key} item={item} isLight={isLight} />)}
              </div>
            </div>
            <div className={`rounded-3xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
              <h2 className="text-lg font-bold">Quick Actions</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {quickActions.map(({ label, icon: Icon, to, description }) => (
                  <Link key={label} to={to} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-400 ${isLight ? 'border-slate-200 bg-slate-50 hover:bg-slate-100' : 'border-white/10 bg-slate-950/40 hover:bg-white/10'}`}>
                    <Icon className="h-5 w-5 text-red-400" />
                    <p className="mt-3 font-semibold">{label}</p>
                    <p className="mt-1 text-xs text-slate-500">{description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="pb-2 text-center text-xs text-slate-500">Raksha24x7 Admin Dashboard • Secure analytics view</footer>
      </div>
    </AdminLayout>
  );
}

function StatCard({ item, index, isLight }) {
  const Icon = statIcons[item.key] || BarChart3;
  const TrendIcon = item.trend === 'down' ? TrendingDown : TrendingUp;
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className={`rounded-3xl border p-4 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
      <div className="flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-500/10 text-red-400"><Icon className="h-5 w-5" /></span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${item.trend === 'down' ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
          <TrendIcon className="h-3 w-3" /> {compactNumber(item.growth)}
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold">{compactNumber(item.value)}</p>
      <p className="mt-1 text-sm font-semibold">{item.label}</p>
      <p className="mt-1 text-xs text-slate-500">{item.description}</p>
    </motion.article>
  );
}

function AnalyticsPanel({ title, icon: Icon, items, isLight }) {
  return (
    <section className={`rounded-3xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-red-500/10 text-red-400"><Icon className="h-5 w-5" /></span>
        <h2 className="font-bold">{title}</h2>
      </div>
      <dl className="mt-4 grid gap-3">
        {items.map(([label, value]) => (
          <div key={label} className={`flex items-center justify-between rounded-2xl px-3 py-2 ${isLight ? 'bg-slate-50' : 'bg-slate-950/40'}`}>
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="text-sm font-bold">{typeof value === 'number' ? compactNumber(value) : value || 'N/A'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ChartCard({ title, data, color, isLight, wide = false }) {
  const max = Math.max(...data.map((item) => item.value || 0), 1);
  return (
    <section className={`rounded-3xl border p-5 shadow-sm ${wide ? 'xl:col-span-2' : ''} ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
      <h2 className="font-bold">{title}</h2>
      <div className="mt-5 flex h-48 items-end gap-2" role="img" aria-label={`${title} chart`}>
        {data.length ? data.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <div className={`w-full rounded-t-xl ${color} transition-all`} style={{ height: `${Math.max((item.value / max) * 100, 4)}%` }} title={`${item.label}: ${item.value}`} />
            <span className="max-w-12 truncate text-[10px] text-slate-500">{item.label}</span>
          </div>
        )) : <EmptyState text="No chart data available." />}
      </div>
    </section>
  );
}

function StatusChart({ title, data, isLight }) {
  const items = Object.entries(data);
  const total = items.reduce((sum, [, value]) => sum + Number(value || 0), 0) || 1;
  return (
    <section className={`rounded-3xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
      <h2 className="font-bold">{title}</h2>
      <div className="mt-5 space-y-3">
        {items.length ? items.map(([label, value]) => (
          <div key={label}>
            <div className="flex justify-between text-sm"><span className="capitalize text-slate-500">{label}</span><span className="font-bold">{value}</span></div>
            <div className={`mt-2 h-3 overflow-hidden rounded-full ${isLight ? 'bg-slate-100' : 'bg-slate-900'}`}>
              <div className="h-full rounded-full bg-red-500" style={{ width: `${(Number(value || 0) / total) * 100}%` }} />
            </div>
          </div>
        )) : <EmptyState text="No email status data yet." />}
      </div>
    </section>
  );
}

function ActivityItem({ item, isLight }) {
  return (
    <article className={`rounded-2xl border p-4 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold capitalize">{item.title}</p>
          <p className="mt-1 text-sm text-slate-500">{item.user} • {item.category}</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold capitalize text-slate-400">{item.status}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{new Date(item.time).toLocaleString()}</p>
    </article>
  );
}

function HealthRow({ item, isLight }) {
  return (
    <div className={`flex items-center justify-between rounded-2xl border p-3 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-8 w-8 place-items-center rounded-full ${statusTone[item.status] || statusTone.warning}`}>
          {item.status === 'healthy' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        </span>
        <div>
          <p className="text-sm font-semibold">{item.label}</p>
          <p className="text-xs text-slate-500">{item.detail}</p>
        </div>
      </div>
      <span className="text-xs font-bold capitalize text-slate-500">{item.status}</span>
    </div>
  );
}

function CardSkeleton({ count, isLight }) {
  return Array.from({ length: count }).map((_, index) => <div key={index} className={`h-36 animate-pulse rounded-3xl ${isLight ? 'bg-white' : 'bg-white/5'}`} />);
}

function ActivitySkeleton({ isLight }) {
  return Array.from({ length: 5 }).map((_, index) => <div key={index} className={`h-20 animate-pulse rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} />);
}

function EmptyState({ text }) {
  return <p className="w-full rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">{text}</p>;
}

export default AdminDashboardPage;
