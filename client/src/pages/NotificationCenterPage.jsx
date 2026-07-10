import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Bell, CheckCheck, ChevronRight, Download, Info, Mail,
  RefreshCw, Search, ShieldAlert, Siren, Trash2, Undo2, X, Zap
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import { notificationApi } from '../services/api';

const categories = ['all', 'general', 'security', 'emergency', 'sos', 'reminder', 'system', 'profile', 'email'];
const dateFilters = [
  { value: '', label: 'Any Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' }
];
const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'priority', label: 'Priority' },
  { value: 'unread', label: 'Unread First' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'category', label: 'Category' }
];

const categoryIcon = {
  general: Bell,
  security: AlertTriangle,
  emergency: ShieldAlert,
  sos: Siren,
  reminder: Bell,
  system: Zap,
  profile: Info,
  email: Mail
};

const priorityClass = {
  critical: 'bg-red-500/15 text-red-300',
  high: 'bg-orange-500/15 text-orange-300',
  normal: 'bg-blue-500/15 text-blue-300',
  low: 'bg-slate-500/15 text-slate-300'
};

function NotificationCenterPage() {
  const [items, setItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [readCount, setReadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [undoIds, setUndoIds] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: 'all', read: 'all', priority: '', datePreset: '', sort: 'newest' });

  const isLight = localStorage.getItem('raksha_theme') === 'light';

  const params = useMemo(() => ({
    page: 1,
    limit: 12,
    search: filters.search || undefined,
    type: filters.category !== 'all' ? filters.category : undefined,
    read: filters.read === 'read' ? 'true' : filters.read === 'unread' ? 'false' : undefined,
    priority: filters.priority || undefined,
    datePreset: filters.datePreset || undefined,
    sort: filters.sort
  }), [filters]);

  const load = async ({ page = 1, append = false } = {}) => {
    try {
      setError('');
      if (append) setLoadingMore(true);
      else setLoading(true);
      const [{ data }, analyticsResponse] = await Promise.all([
        notificationApi.list({ ...params, page }),
        notificationApi.analytics().catch(() => ({ data: { analytics: null } }))
      ]);
      setItems((current) => (append ? [...current, ...(data.notifications || [])] : data.notifications || []));
      setPagination(data.pagination || { page, pages: 1, total: 0 });
      setUnreadCount(data.unreadCount || 0);
      setReadCount(data.readCount || 0);
      setAnalytics(analyticsResponse.data.analytics || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => load({ page: 1 }), 250);
    return () => window.clearTimeout(timer);
  }, [params]);

  const openNotification = async (item) => {
    setSelected(item);
    if (!item.isRead) {
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, isRead: true, isUnread: false, readAt: new Date().toISOString(), status: 'read' } : entry)));
      setUnreadCount((value) => Math.max(0, value - 1));
      setReadCount((value) => value + 1);
      await notificationApi.open(item.id).catch(() => undefined);
    }
  };

  const markRead = async () => {
    await notificationApi.markRead(selectedIds);
    setSelectedIds([]);
    await load({ page: 1 });
    setToast('Notifications marked as read.');
  };

  const markUnread = async () => {
    await notificationApi.markUnread(selectedIds);
    setSelectedIds([]);
    await load({ page: 1 });
    setToast('Notifications marked as unread.');
  };

  const removeSelected = async () => {
    if (!selectedIds.length || !window.confirm('Delete selected notifications?')) return;
    await notificationApi.removeBulk(selectedIds);
    setUndoIds(selectedIds);
    setSelectedIds([]);
    await load({ page: 1 });
    setToast('Notifications deleted. Undo is available.');
  };

  const undoDelete = async () => {
    await notificationApi.undoDelete(undoIds);
    setUndoIds([]);
    await load({ page: 1 });
    setToast('Delete undone.');
  };

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    await load({ page: 1 });
    setToast('All notifications marked as read.');
  };

  const exportCsv = async () => {
    const { data } = await notificationApi.exportHistory(params);
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'raksha-notifications.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelected = (id) => setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-50 text-slate-950' : 'bg-slate-950 text-white'}`}>
      <Navbar dashboard />
      <Toast message={toast || error} type={error ? 'error' : 'success'} />
      <main className="mx-auto max-w-7xl px-4 py-5 md:px-6">
        <header className={`rounded-3xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">Notification Center</p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Notifications</h1>
              <p className={`mt-2 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Search, filter, track and manage every Raksha24x7 notification.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => load({ page: 1 })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold"><RefreshCw className="mr-2 inline h-4 w-4" />Refresh</button>
              <button onClick={markAllRead} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"><CheckCheck className="mr-2 inline h-4 w-4" />Mark All Read</button>
              <button onClick={exportCsv} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold"><Download className="mr-2 inline h-4 w-4" />Export</button>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric title="Total" value={analytics?.total ?? pagination.total} />
          <Metric title="Unread" value={unreadCount} tone="text-red-300" />
          <Metric title="Read" value={readCount} tone="text-emerald-300" />
          <Metric title="Read Rate" value={`${analytics?.readRate ?? 0}%`} tone="text-blue-300" />
        </section>

        <section className={`mt-5 rounded-3xl border p-4 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
          <div className="grid gap-3 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
            <label className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Search title, message, category, priority..." className={inputClass(isLight, 'pl-11')} />
            </label>
            <select value={filters.read} onChange={(e) => setFilters((f) => ({ ...f, read: e.target.value }))} className={inputClass(isLight)}>
              <option value="all">All Status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
            <select value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))} className={inputClass(isLight)}>
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <select value={filters.datePreset} onChange={(e) => setFilters((f) => ({ ...f, datePreset: e.target.value }))} className={inputClass(isLight)}>
              {dateFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))} className={inputClass(isLight)}>
              {sortOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button key={category} type="button" onClick={() => setFilters((f) => ({ ...f, category }))} className={`rounded-full border px-4 py-2 text-xs font-semibold capitalize transition ${filters.category === category ? 'border-red-400/50 bg-red-500/15 text-red-200' : isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                {category}
              </button>
            ))}
          </div>
        </section>

        {selectedIds.length > 0 && (
          <section className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 p-3">
            <span className="text-sm font-semibold">{selectedIds.length} selected</span>
            <button onClick={markRead} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Mark Read</button>
            <button onClick={markUnread} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Mark Unread</button>
            <button onClick={removeSelected} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white">Delete</button>
            <button onClick={() => setSelectedIds([])} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold">Clear</button>
          </section>
        )}

        {undoIds.length > 0 && (
          <button onClick={undoDelete} className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">
            <Undo2 className="mr-2 inline h-4 w-4" />Undo Delete
          </button>
        )}

        <section className="mt-5">
          {loading ? (
            <SkeletonGrid />
          ) : error ? (
            <EmptyState title="Could not load notifications" message={error} action="Retry" onAction={() => load({ page: 1 })} />
          ) : items.length ? (
            <>
              <div className="grid gap-3 lg:grid-cols-2">
                {items.map((item) => <NotificationCard key={item.id} item={item} isLight={isLight} selected={selectedIds.includes(item.id)} onSelect={toggleSelected} onOpen={openNotification} />)}
              </div>
              {pagination.page < pagination.pages && (
                <button disabled={loadingMore} onClick={() => load({ page: pagination.page + 1, append: true })} className="mx-auto mt-5 block rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              )}
            </>
          ) : (
            <EmptyState title={filters.search ? 'No search results' : 'No notifications'} message="Try changing filters or refresh later." action="Refresh" onAction={() => load({ page: 1 })} />
          )}
        </section>
      </main>
      {selected && <DetailsModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

const inputClass = (isLight, extra = '') => `h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-red-400 ${extra} ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950' : 'border-white/10 bg-slate-900 text-white'}`;

function Metric({ title, value, tone = 'text-slate-100' }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">{title}</p><p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p></div>;
}

function NotificationCard({ item, isLight, selected, onSelect, onOpen }) {
  const Icon = categoryIcon[item.type] || Bell;
  return (
    <article tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(item); }} className={`rounded-3xl border p-4 transition hover:-translate-y-0.5 ${isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-white/[0.05]'} ${item.isUnread ? 'ring-1 ring-red-400/20' : ''}`}>
      <div className="flex gap-3">
        <input type="checkbox" aria-label={`Select ${item.title}`} checked={selected} onChange={() => onSelect(item.id)} className="mt-3 h-4 w-4 accent-red-600" />
        <button type="button" onClick={() => onOpen(item)} className="flex min-w-0 flex-1 gap-3 text-left">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-300"><Icon className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              {item.isUnread && <span className="h-2 w-2 rounded-full bg-red-500" />}
              {item.isNew && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">NEW</span>}
              <span className="font-semibold">{item.title}</span>
            </span>
            <span className={`mt-1 line-clamp-2 block text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{item.message}</span>
            <span className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/10 px-2 py-1 capitalize">{item.type}</span>
              <span className={`rounded-full px-2 py-1 capitalize ${priorityClass[item.priority] || priorityClass.normal}`}>{item.priority}</span>
              <span className="rounded-full bg-white/10 px-2 py-1 capitalize">{item.status}</span>
              <span className="text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
            </span>
          </span>
          <ChevronRight className="mt-3 h-5 w-5 text-slate-500" />
        </button>
      </div>
    </article>
  );
}

function DetailsModal({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-red-400">Notification Details</p>
            <h2 className="mt-2 text-xl font-bold">{item.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close details" className="rounded-full p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">{item.message}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Detail label="Category" value={item.type} />
          <Detail label="Priority" value={item.priority} />
          <Detail label="Delivery Status" value={item.status} />
          <Detail label="Channel" value={item.channel} />
          <Detail label="Created" value={new Date(item.createdAt).toLocaleString()} />
          <Detail label="Read" value={item.readAt ? new Date(item.readAt).toLocaleString() : 'Unread'} />
        </div>
        {item.metadata?.actionPath || item.metadata?.googleMapLink ? (
          <a href={item.metadata.actionPath || item.metadata.googleMapLink} className="mt-5 inline-flex w-full justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-500">Open Related Screen</a>
        ) : null}
      </section>
    </div>
  );
}

function Detail({ label, value }) {
  return <div className="rounded-2xl bg-white/5 p-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold capitalize text-slate-200">{value || 'Unavailable'}</p></div>;
}

function SkeletonGrid() {
  return <div className="grid gap-3 lg:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-3xl bg-white/5" />)}</div>;
}

function EmptyState({ title, message, action, onAction }) {
  return (
    <div className="grid min-h-80 place-items-center rounded-3xl border border-dashed border-white/10 bg-white/[0.04] p-8 text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-red-500/10 text-red-300"><Bell className="h-8 w-8" /></div>
        <h2 className="mt-4 text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-slate-400">{message}</p>
        {action && <button onClick={onAction} className="mt-5 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white">{action}</button>}
      </div>
    </div>
  );
}

export default NotificationCenterPage;
