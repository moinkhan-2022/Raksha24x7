import { useEffect, useMemo, useState } from 'react';
import {
  Activity, BarChart3, Bell, Cpu, Database, Download, FileText, Globe2, Mail,
  MapPin, RefreshCw, Search, Server, ShieldAlert, Smartphone, Users
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';

const ranges = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' }
];

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');
const pretty = (key) => String(key || '').replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, (char) => char.toUpperCase());

function AdminAnalyticsPage() {
  const theme = localStorage.getItem('raksha_theme') === 'light' ? 'light' : 'dark';
  const isLight = theme === 'light';
  const [range, setRange] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState({ logs: [], pagination: {} });
  const [auditSearch, setAuditSearch] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [exporting, setExporting] = useState('');

  const params = useMemo(() => ({ range }), [range]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const [users, sos, location, email, notifications, system, report, logs] = await Promise.all([
        adminApi.analyticsUsers(params),
        adminApi.analyticsSos(params),
        adminApi.analyticsLocation(params),
        adminApi.analyticsEmail(params),
        adminApi.analyticsNotifications(params),
        adminApi.analyticsSystem(params),
        adminApi.reports(params),
        adminApi.auditLogs({ limit: 12, search: auditSearch })
      ]);
      setData({
        users: users.data.users,
        sos: sos.data.sos,
        location: location.data.location,
        email: email.data.email,
        notifications: notifications.data.notifications,
        system: system.data.system,
        report: report.data.report
      });
      setAudit({ logs: logs.data.logs || [], pagination: logs.data.pagination || {} });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load admin analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [range]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (search.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const { data: response } = await adminApi.globalSearch({ q: search.trim() });
        setSearchResults(response.results || []);
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const { data: response } = await adminApi.auditLogs({ limit: 12, search: auditSearch });
        setAudit({ logs: response.logs || [], pagination: response.pagination || {} });
      } catch {
        setAudit((current) => current);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [auditSearch]);

  const metricCards = useMemo(() => {
    if (!data) return [];
    return [
      { title: 'Total Users', value: data.users.totalUsers, icon: Users, trend: data.users.userGrowthRate, color: 'blue' },
      { title: 'Total SOS', value: data.sos.totalSos, icon: ShieldAlert, trend: data.sos.comparison?.changePercent, color: 'red' },
      { title: 'Location Events', value: data.location.mapUsageStatistics?.rangeLocations, icon: MapPin, trend: data.location.comparison?.changePercent, color: 'emerald' },
      { title: 'Emails Sent', value: data.email.emailsSent, icon: Mail, trend: data.email.comparison?.changePercent, color: 'amber' },
      { title: 'Notifications', value: data.notifications.browserNotifications + data.notifications.pushNotifications, icon: Bell, trend: data.notifications.comparison?.changePercent, color: 'purple' },
      { title: 'Active Devices', value: data.system.devices, icon: Smartphone, trend: 0, color: 'cyan' },
      { title: 'Browser Notifications', value: data.notifications.browserNotifications, icon: Globe2, trend: data.notifications.deliverySuccessRate, suffix: '% success', color: 'indigo' },
      { title: 'Server Uptime', value: data.system.serverUptime, icon: Server, trend: 0, color: 'slate', raw: true }
    ];
  }, [data]);

  const exportReport = async (format) => {
    setExporting(format);
    try {
      const response = await adminApi.exportReports(format, { range });
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raksha24x7-admin-report.${format === 'excel' ? 'xls' : format}`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting('');
    }
  };

  return (
    <AdminLayout title="Analytics & Reports" subtitle="Operational insights, reports, system overview, global search and audit logs.">
      <div className="space-y-6">
        <section className={`rounded-3xl border p-4 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {ranges.map((item) => (
                <button key={item.value} type="button" onClick={() => setRange(item.value)} className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${range === item.value ? 'bg-red-600 text-white' : isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/10 text-slate-200 hover:bg-white/15'}`}>
                  {item.label}
                </button>
              ))}
              <button type="button" onClick={loadAnalytics} className={`rounded-2xl px-4 py-2 text-sm font-bold ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-white'}`}>
                <RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {['csv', 'excel', 'pdf', 'json'].map((format) => (
                <button key={format} type="button" onClick={() => exportReport(format)} disabled={Boolean(exporting)} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                  <Download className="mr-2 inline h-4 w-4" />{exporting === format ? 'Exporting...' : format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <label className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}>
            <Search className="h-5 w-5 text-slate-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Global search users, SOS, emails, notifications, reports and settings..." className="w-full bg-transparent text-sm outline-none" />
          </label>
          {searchResults.length ? (
            <div className={`mt-3 rounded-2xl border p-2 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-slate-900'}`}>
              {searchResults.map((item, index) => (
                <a key={`${item.type}-${index}`} href={item.url} className={`block rounded-xl px-3 py-2 text-sm transition ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`}>
                  <span className="font-bold">{item.type}: {item.title}</span>
                  <span className="ml-2 text-slate-500">{item.subtitle}</span>
                </a>
              ))}
            </div>
          ) : null}
        </section>

        {error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">{error}</div> : null}

        {loading ? <SkeletonGrid isLight={isLight} /> : data ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((card) => <MetricCard key={card.title} {...card} isLight={isLight} />)}
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <ChartCard title="User Growth" icon={Users} data={data.users.charts.userGrowth} color="bg-blue-500" isLight={isLight} />
              <ChartCard title="SOS Trends" icon={ShieldAlert} data={data.sos.charts.sosTrends} color="bg-red-500" isLight={isLight} />
              <StatusChart title="Email Delivery" icon={Mail} data={data.email.charts.emailDelivery} isLight={isLight} />
              <StatusChart title="Notification Statistics" icon={Bell} data={data.notifications.charts.notificationStatistics} isLight={isLight} />
              <ChartCard title="Nearby Services Usage" icon={MapPin} data={data.location.charts.nearbyServicesUsage} color="bg-emerald-500" isLight={isLight} />
              <ChartCard title="Daily Active Users" icon={Activity} data={data.users.charts.dailyActiveUsers} color="bg-purple-500" isLight={isLight} />
            </section>

            <section className="grid gap-5 xl:grid-cols-3">
              <DetailsCard title="User Analytics" icon={Users} data={data.users} isLight={isLight} />
              <DetailsCard title="SOS Analytics" icon={ShieldAlert} data={data.sos} isLight={isLight} />
              <DetailsCard title="Location Analytics" icon={MapPin} data={data.location} isLight={isLight} />
              <DetailsCard title="Email Analytics" icon={Mail} data={data.email} isLight={isLight} />
              <DetailsCard title="Notification Analytics" icon={Bell} data={data.notifications} isLight={isLight} />
              <SystemCard system={data.system} isLight={isLight} />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <AuditLogs logs={audit.logs} search={auditSearch} setSearch={setAuditSearch} isLight={isLight} />
              <ReportSummary report={data.report} isLight={isLight} />
            </section>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}

function MetricCard({ title, value, icon: Icon, trend = 0, suffix = '', color, raw, isLight }) {
  const colorMap = {
    blue: 'bg-blue-500/15 text-blue-400',
    red: 'bg-red-500/15 text-red-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
    amber: 'bg-amber-500/15 text-amber-400',
    purple: 'bg-purple-500/15 text-purple-400',
    cyan: 'bg-cyan-500/15 text-cyan-400',
    indigo: 'bg-indigo-500/15 text-indigo-400',
    slate: 'bg-slate-500/15 text-slate-400'
  };
  return (
    <article className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-1 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-black">{raw ? value : formatNumber(value)}</p>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${colorMap[color] || colorMap.slate}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className={`mt-4 text-xs font-bold ${Number(trend) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Number(trend) > 0 ? '+' : ''}{trend || 0}% {suffix || 'vs previous period'}</p>
    </article>
  );
}

function ChartCard({ title, icon: Icon, data = [], color, isLight }) {
  const max = Math.max(...data.map((item) => Number(item.value || 0)), 1);
  return (
    <article className={`rounded-3xl border p-5 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
      <h2 className="flex items-center gap-2 text-lg font-black"><Icon className="h-5 w-5 text-red-400" />{title}</h2>
      <div className="mt-5 flex h-56 items-end gap-2 overflow-hidden" role="img" aria-label={`${title} chart`}>
        {data.length ? data.map((item, index) => (
          <div key={`${item.label}-${index}`} className="group flex flex-1 flex-col items-center gap-2">
            <div className={`w-full rounded-t-xl ${color}`} style={{ height: `${Math.max((Number(item.value || 0) / max) * 100, 4)}%` }} title={`${item.label}: ${item.value}`} />
            {index % Math.ceil(data.length / 6 || 1) === 0 ? <span className="max-w-12 truncate text-[10px] text-slate-500">{item.label}</span> : <span className="h-3" />}
          </div>
        )) : <EmptyState text="No chart data available." />}
      </div>
    </article>
  );
}

function StatusChart({ title, icon: Icon, data = [], isLight }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
  return (
    <article className={`rounded-3xl border p-5 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
      <h2 className="flex items-center gap-2 text-lg font-black"><Icon className="h-5 w-5 text-red-400" />{title}</h2>
      <div className="mt-5 space-y-4">
        {data.length ? data.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-sm"><span>{pretty(item.label)}</span><span>{formatNumber(item.value)}</span></div>
            <div className={`h-3 overflow-hidden rounded-full ${isLight ? 'bg-slate-100' : 'bg-white/10'}`}>
              <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.max((Number(item.value || 0) / total) * 100, 3)}%` }} />
            </div>
          </div>
        )) : <EmptyState text="No status data available." />}
      </div>
    </article>
  );
}

function DetailsCard({ title, icon: Icon, data, isLight }) {
  const rows = Object.entries(data || {}).filter(([, value]) => !value || typeof value !== 'object').slice(0, 10);
  return (
    <article className={`rounded-3xl border p-5 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
      <h2 className="flex items-center gap-2 text-lg font-black"><Icon className="h-5 w-5 text-red-400" />{title}</h2>
      <div className="mt-4 divide-y divide-white/10">
        {rows.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between py-2 text-sm">
            <span className="text-slate-500">{pretty(key)}</span>
            <span className="font-bold">{typeof value === 'number' ? formatNumber(value) : value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function SystemCard({ system, isLight }) {
  const rows = [
    ['Server Status', system.serverStatus, Server],
    ['Database', system.databaseStatus, Database],
    ['Email Provider', system.emailProviderStatus, Mail],
    ['Maps Service', system.mapsServiceStatus, Globe2],
    ['Memory Usage', system.memoryUsage, Cpu],
    ['Environment', system.environment, FileText]
  ];
  return (
    <article className={`rounded-3xl border p-5 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
      <h2 className="flex items-center gap-2 text-lg font-black"><Server className="h-5 w-5 text-red-400" />System Overview</h2>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value, Icon]) => (
          <div key={label} className={`flex items-center gap-3 rounded-2xl p-3 ${isLight ? 'bg-slate-50' : 'bg-white/5'}`}>
            <Icon className="h-4 w-4 text-red-400" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="truncate text-sm font-bold">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function AuditLogs({ logs, search, setSearch, isLight }) {
  return (
    <article className={`rounded-3xl border p-5 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-black">Audit Logs</h2>
        <label className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'}`}>
          <Search className="h-4 w-4 text-slate-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search logs..." className="bg-transparent text-sm outline-none" />
        </label>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr><th className="py-2">Admin</th><th>Action</th><th>Module</th><th>Status</th><th>Time</th></tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="py-3">{log.admin?.name || 'System'}</td>
                <td>{pretty(log.action)}</td>
                <td>{pretty(log.module)}</td>
                <td><span className={`rounded-full px-2 py-1 text-xs font-bold ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{log.status}</span></td>
                <td className="text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.length ? <EmptyState text="No audit logs found." /> : null}
      </div>
    </article>
  );
}

function ReportSummary({ report, isLight }) {
  return (
    <article className={`rounded-3xl border p-5 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
      <h2 className="text-lg font-black">Report Summary</h2>
      <p className="mt-1 text-sm text-slate-500">{report.title}</p>
      <div className="mt-4 grid gap-3">
        {report.summary.map((item) => (
          <div key={item.label} className={`rounded-2xl p-4 ${isLight ? 'bg-slate-50' : 'bg-white/5'}`}>
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="text-2xl font-black">{formatNumber(item.value)}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function SkeletonGrid({ isLight }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className={`h-36 animate-pulse rounded-3xl ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />)}</div>;
}

function EmptyState({ text }) {
  return <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-500">{text}</div>;
}

export default AdminAnalyticsPage;
