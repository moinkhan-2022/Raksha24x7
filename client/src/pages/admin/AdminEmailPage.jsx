import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download,
  Eye, Mail, RefreshCw, RotateCw, Search, Send, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/AdminLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminApi } from '../../services/api';

const rangeOptions = [['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 Days'], ['30d', 'Last 30 Days'], ['all', 'All Time']];
const statusOptions = [['all', 'All Status'], ['delivered', 'Delivered'], ['queued', 'Queued'], ['pending', 'Pending'], ['failed', 'Failed'], ['skipped', 'Skipped']];
const providerOptions = [['all', 'All Providers'], ['smtp', 'SMTP'], ['resend', 'Resend'], ['dev', 'Dev'], ['gmail', 'Gmail']];
const templateOptions = [['all', 'All Templates'], ['welcome', 'Welcome'], ['verification', 'Verification'], ['passwordReset', 'Password Reset'], ['loginSecurityAlert', 'Security Alert'], ['custom', 'Custom']];
const sortOptions = [['newest', 'Newest'], ['oldest', 'Oldest'], ['recipient', 'Recipient'], ['subject', 'Subject'], ['status', 'Status'], ['retry', 'Retry Count'], ['provider', 'Provider']];

const cardMeta = [
  ['total', 'Total Emails', Mail],
  ['delivered', 'Delivered', CheckCircle2],
  ['queued', 'Queued', Send],
  ['failed', 'Failed', AlertTriangle],
  ['pending', 'Pending', Clock],
  ['retried', 'Retried', RotateCw],
  ['today', "Today's Emails", Clock],
  ['weekly', 'Weekly Emails', Clock],
  ['monthly', 'Monthly Emails', Clock]
];

const statusTone = {
  delivered: 'bg-emerald-500/10 text-emerald-300',
  sent: 'bg-emerald-500/10 text-emerald-300',
  queued: 'bg-amber-500/10 text-amber-300',
  pending: 'bg-blue-500/10 text-blue-300',
  processing: 'bg-purple-500/10 text-purple-300',
  failed: 'bg-red-500/10 text-red-300',
  skipped: 'bg-slate-500/10 text-slate-300'
};

const formatDateTime = (value) => (value ? new Date(value).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

function AdminEmailPage() {
  const isLight = localStorage.getItem('raksha_theme') === 'light';
  const { admin } = useAdminAuth();
  const canRetry = ['super_admin', 'admin'].includes(String(admin?.role || '').toLowerCase());
  const [logs, setLogs] = useState([]);
  const [queue, setQueue] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ search: '', range: '7d', status: 'all', provider: 'all', template: 'all', sort: 'newest' });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [message, setMessage] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const queryParams = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);

  const loadLogs = useCallback(async (page = pagination.page) => {
    setLoading(true);
    try {
      const { data } = await adminApi.emailLogs({ ...queryParams, page, limit: pagination.limit });
      setLogs(data.logs || []);
      setStatistics(data.statistics || {});
      setPagination(data.pagination || { page, limit: 10, total: 0, pages: 1 });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not load email logs.');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.page, queryParams]);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const { data } = await adminApi.emailQueue({ limit: 8 });
      setQueue(data.queue || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not load email queue.');
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(1); }, [debouncedSearch, filters.range, filters.status, filters.provider, filters.template, filters.sort]);
  useEffect(() => { loadQueue(); }, [loadQueue]);

  const openDetails = async (log) => {
    setDrawer(log);
    setDrawerLoading(true);
    try {
      const { data } = await adminApi.emailLogDetails(log.id);
      setDrawer({ ...data.log, queue: data.queue, preview: data.preview });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not load email details.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const retrySingle = async (log) => {
    if (!canRetry) return setMessage('Your admin role has read-only email access.');
    if (!window.confirm(`Retry email to ${log.to}?`)) return;
    setRetrying(true);
    try {
      const { data } = await adminApi.retryEmail(log.id);
      setMessage(data.message || 'Email queued for retry.');
      loadLogs();
      loadQueue();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not retry email.');
    } finally {
      setRetrying(false);
    }
  };

  const retryFailed = async () => {
    if (!canRetry) return setMessage('Your admin role has read-only email access.');
    if (!window.confirm('Retry all failed emails?')) return;
    setRetrying(true);
    try {
      const { data } = await adminApi.retryFailedEmails(50);
      setMessage(`${data.count || 0} failed emails queued for retry.`);
      loadLogs();
      loadQueue();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not retry failed emails.');
    } finally {
      setRetrying(false);
    }
  };

  const exportLogs = async (format) => {
    try {
      const { data } = await adminApi.exportEmailLogs(format, queryParams);
      const blob = new Blob([data], { type: format === 'pdf' ? 'application/pdf' : format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raksha-email-logs.${format === 'excel' ? 'xls' : format}`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`Email logs exported as ${format.toUpperCase()}.`);
    } catch {
      setMessage('Could not export email logs.');
    }
  };

  return (
    <AdminLayout title="Email Logs" subtitle="Monitor delivery status, queue, retries, templates, providers and failures.">
      {message ? <div className="mb-4 flex items-center justify-between rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200"><span>{message}</span><button type="button" onClick={() => setMessage('')}><X className="h-4 w-4" /></button></div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {loading ? <CardSkeleton count={9} isLight={isLight} /> : cardMeta.map(([key, label, Icon], index) => (
          <motion.article key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className={`rounded-3xl border p-4 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-500/10 text-red-400"><Icon className="h-5 w-5" /></span>
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-bold">{statistics.total ? Math.round(((statistics[key] || 0) / statistics.total) * 100) : 0}%</span>
            </div>
            <p className="mt-4 text-3xl font-bold">{Number(statistics[key] || 0).toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </motion.article>
        ))}
      </section>

      <section className={`mt-5 rounded-3xl border p-4 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
        <div className="grid gap-3 2xl:grid-cols-[1fr_160px_160px_160px_180px_150px_auto_auto_auto_auto]">
          <label className={`relative rounded-2xl border ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950'}`}>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search recipient, subject, template, provider, message ID" className="h-12 w-full bg-transparent px-11 text-sm outline-none" />
          </label>
          <Select value={filters.range} onChange={(value) => setFilters({ ...filters, range: value })} options={rangeOptions} isLight={isLight} />
          <Select value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={statusOptions} isLight={isLight} />
          <Select value={filters.provider} onChange={(value) => setFilters({ ...filters, provider: value })} options={providerOptions} isLight={isLight} />
          <Select value={filters.template} onChange={(value) => setFilters({ ...filters, template: value })} options={templateOptions} isLight={isLight} />
          <Select value={filters.sort} onChange={(value) => setFilters({ ...filters, sort: value })} options={sortOptions} isLight={isLight} />
          <button type="button" onClick={() => loadLogs(1)} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white"><RefreshCw className="mr-2 inline h-4 w-4" />Refresh</button>
          <button type="button" disabled={retrying || !canRetry} onClick={retryFailed} className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"><RotateCw className={`mr-2 inline h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />Retry Failed</button>
          <ExportButton onClick={() => exportLogs('csv')} label="CSV" />
          <ExportButton onClick={() => exportLogs('excel')} label="Excel" />
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <EmailLogList logs={logs} loading={loading} pagination={pagination} setPage={loadLogs} openDetails={openDetails} retrySingle={retrySingle} canRetry={canRetry} isLight={isLight} />
        <aside className="space-y-5">
          <AnalyticsPanel statistics={statistics} isLight={isLight} />
          <QueuePanel queue={queue} loading={queueLoading} isLight={isLight} />
        </aside>
      </section>

      <div className="mt-3 flex justify-end">
        <ExportButton onClick={() => exportLogs('pdf')} label="Export PDF" />
      </div>

      {drawer ? <EmailDrawer log={drawer} loading={drawerLoading} onClose={() => setDrawer(null)} retrySingle={retrySingle} canRetry={canRetry} isLight={isLight} /> : null}
    </AdminLayout>
  );
}

function EmailLogList({ logs, loading, pagination, setPage, openDetails, retrySingle, canRetry, isLight }) {
  return (
    <section className={`overflow-hidden rounded-3xl border shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
      <div className="hidden overflow-x-auto 2xl:block">
        <table className="w-full text-left text-sm">
          <thead className={isLight ? 'bg-slate-50 text-slate-600' : 'bg-slate-900 text-slate-300'}>
            <tr>{['Status', 'Recipient', 'Subject', 'Template', 'Provider', 'Message ID', 'Created', 'Delivered', 'Retry', 'Actions'].map((head) => <th key={head} className="p-4 font-semibold">{head}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? <TableSkeleton isLight={isLight} /> : logs.length ? logs.map((log) => (
              <tr key={log.id} className={`border-t ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
                <td className="p-4"><StatusBadge status={log.status} /></td>
                <td className="p-4">{log.to}</td>
                <td className="max-w-72 truncate p-4">{log.subject}</td>
                <td className="p-4">{log.template}</td>
                <td className="p-4">{log.provider}</td>
                <td className="max-w-40 truncate p-4">{log.messageId || '—'}</td>
                <td className="p-4">{formatDateTime(log.createdAt)}</td>
                <td className="p-4">{formatDateTime(log.deliveredAt)}</td>
                <td className="p-4">{log.retryCount || 0}</td>
                <td className="p-4"><RowActions log={log} openDetails={openDetails} retrySingle={retrySingle} canRetry={canRetry} /></td>
              </tr>
            )) : <tr><td colSpan="10"><EmptyState /></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-3 2xl:hidden">
        {loading ? <MobileSkeleton isLight={isLight} /> : logs.length ? logs.map((log) => <MobileLogCard key={log.id} log={log} openDetails={openDetails} retrySingle={retrySingle} canRetry={canRetry} isLight={isLight} />) : <EmptyState />}
      </div>
      <div className={`flex items-center justify-between border-t p-4 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <p className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages} • {pagination.total} logs</p>
        <div className="flex gap-2">
          <button type="button" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => setPage(pagination.page + 1)} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </section>
  );
}

function AnalyticsPanel({ statistics, isLight }) {
  const items = [
    ['Delivery Rate', `${statistics.deliveryRate || 0}%`],
    ['Failure Rate', `${statistics.failureRate || 0}%`],
    ['Retry Rate', `${statistics.retryRate || 0}%`],
    ['Average Delivery Time', statistics.averageDeliveryTime || 'N/A'],
    ['Most Used Template', statistics.mostUsedTemplate || 'N/A'],
    ['Most Used Provider', statistics.mostUsedProvider || 'N/A']
  ];
  return <section className={`rounded-3xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}><h2 className="font-bold">Delivery Analytics</h2><div className="mt-4 space-y-2">{items.map(([label, value]) => <div key={label} className="flex justify-between rounded-2xl bg-white/5 p-3 text-sm"><span className="text-slate-500">{label}</span><b>{value}</b></div>)}</div></section>;
}

function QueuePanel({ queue, loading, isLight }) {
  return <section className={`rounded-3xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}><h2 className="font-bold">Email Queue</h2><div className="mt-4 space-y-3">{loading ? <MobileSkeleton isLight={isLight} /> : queue.length ? queue.map((item) => <div key={item.id} className={`rounded-2xl border p-3 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}><div className="flex justify-between gap-3"><p className="font-semibold">{item.to}</p><StatusBadge status={item.status} /></div><p className="mt-1 text-sm text-slate-500">{item.subject}</p><p className="mt-2 text-xs text-slate-500">Waiting {item.waitingDuration} • Retry {item.retryCount}/{item.maxAttempts}</p></div>) : <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">Queue is empty.</p>}</div></section>;
}

function EmailDrawer({ log, loading, onClose, retrySingle, canRetry, isLight }) {
  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Email details">
      <button type="button" aria-label="Close email details" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className={`absolute bottom-0 right-0 top-auto max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border p-5 shadow-2xl lg:top-0 lg:h-full lg:max-h-none lg:max-w-3xl lg:rounded-l-3xl lg:rounded-tr-none ${isLight ? 'border-slate-200 bg-white text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`}>
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm text-red-400">{log.template}</p><h2 className="text-2xl font-bold">{log.subject}</h2><p className="text-sm text-slate-500">{log.to}</p></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        {loading ? <div className="mt-6 h-96 animate-pulse rounded-3xl bg-white/5" /> : (
          <div className="mt-6 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Status" value={log.status} />
              <Info label="Provider" value={log.provider} />
              <Info label="Message ID" value={log.messageId || '—'} />
              <Info label="Retry Count" value={log.retryCount || 0} />
              <Info label="Created" value={formatDateTime(log.createdAt)} />
              <Info label="Delivered" value={formatDateTime(log.deliveredAt)} />
              <Info label="Last Attempt" value={formatDateTime(log.lastAttemptAt)} />
              <Info label="Error" value={log.error || 'None'} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!canRetry || log.rawStatus !== 'failed'} onClick={() => retrySingle(log)} className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"><RotateCw className="mr-2 inline h-4 w-4" />Retry Email</button>
            </div>
            <Section title="HTML Preview">{log.preview?.html ? <iframe title="Email preview" srcDoc={log.preview.html} className="h-96 w-full rounded-2xl bg-white" /> : <p className="text-sm text-slate-500">No HTML preview available.</p>}</Section>
            <Section title="Plain Text"><pre className="whitespace-pre-wrap rounded-2xl bg-white/5 p-4 text-sm">{log.preview?.text || 'No plain text available.'}</pre></Section>
            <Section title="Metadata"><pre className="overflow-auto rounded-2xl bg-white/5 p-4 text-xs">{JSON.stringify(log.metadata || {}, null, 2)}</pre></Section>
            {log.queue ? <Section title="Queue Record"><pre className="overflow-auto rounded-2xl bg-white/5 p-4 text-xs">{JSON.stringify(log.queue, null, 2)}</pre></Section> : null}
          </div>
        )}
      </aside>
    </div>
  );
}

function RowActions({ log, openDetails, retrySingle, canRetry }) {
  return <div className="flex flex-wrap gap-2"><button type="button" onClick={() => openDetails(log)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white"><Eye className="mr-1 inline h-3 w-3" />View</button><button type="button" disabled={!canRetry || log.rawStatus !== 'failed'} onClick={() => retrySingle(log)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold disabled:opacity-40">Retry</button></div>;
}

function MobileLogCard({ log, openDetails, retrySingle, canRetry, isLight }) {
  return <article className={`rounded-2xl border p-4 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{log.to}</p><p className="mt-1 text-sm text-slate-500">{log.subject}</p></div><StatusBadge status={log.status} /></div><p className="mt-3 text-xs text-slate-500">{log.template} • {log.provider} • {formatDateTime(log.createdAt)}</p><div className="mt-3"><RowActions log={log} openDetails={openDetails} retrySingle={retrySingle} canRetry={canRetry} /></div></article>;
}

function Select({ value, onChange, options, isLight }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className={`h-12 rounded-2xl border px-4 text-sm outline-none ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`}>{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select>;
}

function ExportButton({ onClick, label }) {
  return <button type="button" onClick={onClick} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold"><Download className="mr-2 inline h-4 w-4" />{label}</button>;
}

function StatusBadge({ status }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${statusTone[status] || statusTone.pending}`}>{status}</span>;
}

function Info({ label, value }) {
  return <div className="rounded-2xl bg-white/5 p-3"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value ?? '—'}</p></div>;
}

function Section({ title, children }) {
  return <section className="rounded-3xl border border-white/10 p-4"><h3 className="mb-3 font-bold">{title}</h3>{children}</section>;
}

function CardSkeleton({ count, isLight }) {
  return Array.from({ length: count }).map((_, index) => <div key={index} className={`h-36 animate-pulse rounded-3xl ${isLight ? 'bg-white' : 'bg-white/5'}`} />);
}

function TableSkeleton({ isLight }) {
  return Array.from({ length: 6 }).map((_, index) => <tr key={index}><td colSpan="10" className="p-4"><div className={`h-14 animate-pulse rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} /></td></tr>);
}

function MobileSkeleton({ isLight }) {
  return Array.from({ length: 4 }).map((_, index) => <div key={index} className={`h-28 animate-pulse rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} />);
}

function EmptyState() {
  return <div className="grid min-h-72 place-items-center p-8 text-center"><div><Mail className="mx-auto h-12 w-12 text-slate-500" /><h3 className="mt-3 text-lg font-bold">No email logs found.</h3><p className="mt-1 text-sm text-slate-500">Try changing search or filters.</p></div></div>;
}

export default AdminEmailPage;
