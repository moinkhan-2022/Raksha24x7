import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Copy, Download,
  Eye, FileText, MapPin, Navigation, RefreshCw, Search, ShieldAlert, Siren,
  X, XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';

const statusFilters = [['all', 'All Status'], ['active', 'Active'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['failed', 'Failed'], ['pending', 'Pending']];
const rangeFilters = [['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 Days'], ['30d', 'Last 30 Days'], ['all', 'All Time']];
const summaryMeta = [
  ['total', 'Total SOS Alerts', ShieldAlert],
  ['active', 'Active SOS', Siren],
  ['completed', 'Completed SOS', CheckCircle2],
  ['cancelled', 'Cancelled SOS', XCircle],
  ['failed', 'Failed SOS', AlertTriangle],
  ['today', "Today's SOS", Clock],
  ['weekly', 'Weekly SOS', Clock],
  ['monthly', 'Monthly SOS', Clock]
];

const statusTone = {
  active: 'bg-emerald-500/10 text-emerald-300',
  completed: 'bg-blue-500/10 text-blue-300',
  cancelled: 'bg-slate-500/10 text-slate-300',
  failed: 'bg-red-500/10 text-red-300',
  pending: 'bg-amber-500/10 text-amber-300'
};

const initials = (name = 'U') => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
const formatDateTime = (value) => (value ? new Date(value).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const formatCoord = (value) => Number(value || 0).toFixed(6);

function AdminSosPage() {
  const isLight = localStorage.getItem('raksha_theme') === 'light';
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ search: '', status: 'all', range: '7d' });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [tracking, setTracking] = useState(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const loadSos = useCallback(async (page = pagination.page) => {
    setLoading(true);
    try {
      const { data } = await adminApi.sos({ page, limit: pagination.limit, search: debouncedSearch, status: filters.status, range: filters.range });
      setItems(data.sos || []);
      setSummary(data.summary || {});
      setPagination(data.pagination || { page, limit: 10, total: 0, pages: 1 });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not load SOS monitoring records.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.range, filters.status, pagination.limit, pagination.page]);

  useEffect(() => { loadSos(1); }, [debouncedSearch, filters.status, filters.range]);

  const openDetails = async (item) => {
    setDrawer(item);
    setDrawerLoading(true);
    setTimeline([]);
    setTracking(null);
    setNotes(item.adminReview?.notes || '');
    try {
      const [detailsRes, timelineRes, trackingRes] = await Promise.all([
        adminApi.sosDetails(item.id),
        adminApi.sosTimeline(item.id),
        adminApi.sosTracking(item.id)
      ]);
      setDrawer(detailsRes.data.sos);
      setNotes(detailsRes.data.sos?.adminReview?.notes || '');
      setTimeline(timelineRes.data.timeline || []);
      setTracking(trackingRes.data.tracking || null);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not load SOS details.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(String(value || ''));
      setMessage(`${label} copied.`);
    } catch {
      setMessage(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const saveNotes = async () => {
    if (!drawer) return;
    try {
      const { data } = await adminApi.updateSosNotes(drawer.id, notes);
      setDrawer(data.sos);
      setMessage('Internal notes saved.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not save notes.');
    }
  };

  const markReviewed = async () => {
    if (!drawer) return;
    try {
      const { data } = await adminApi.reviewSos(drawer.id);
      setDrawer(data.sos);
      setMessage('SOS marked as reviewed.');
      loadSos();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not mark reviewed.');
    }
  };

  const exportSos = async (format) => {
    try {
      const { data } = await adminApi.exportSos(format, { search: debouncedSearch, status: filters.status, range: filters.range });
      const blob = new Blob([data], { type: format === 'pdf' ? 'application/pdf' : format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raksha-sos-records.${format === 'excel' ? 'xls' : format}`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`SOS records exported as ${format.toUpperCase()}.`);
    } catch {
      setMessage('Could not export SOS records.');
    }
  };

  const activeMapItem = drawer || items[0];

  return (
    <AdminLayout title="SOS Monitoring" subtitle="Monitor live emergencies, tracking, delivery status and SOS history.">
      {message ? <div className="mb-4 flex items-center justify-between rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200"><span>{message}</span><button type="button" onClick={() => setMessage('')}><X className="h-4 w-4" /></button></div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? <SummarySkeleton isLight={isLight} /> : summaryMeta.map(([key, label, Icon], index) => (
          <motion.article key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className={`rounded-3xl border p-4 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-500/10 text-red-400"><Icon className="h-5 w-5" /></span>
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-bold">{summary.total ? Math.round(((summary[key] || 0) / summary.total) * 100) : 0}%</span>
            </div>
            <p className="mt-4 text-3xl font-bold">{Number(summary[key] || 0).toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </motion.article>
        ))}
      </section>

      <section className={`mt-5 rounded-3xl border p-4 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto_auto_auto_auto]">
          <label className={`relative rounded-2xl border ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950'}`}>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search SOS ID, user, phone, email, address" className="h-12 w-full bg-transparent px-11 text-sm outline-none" />
          </label>
          <Select value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={statusFilters} isLight={isLight} />
          <Select value={filters.range} onChange={(value) => setFilters({ ...filters, range: value })} options={rangeFilters} isLight={isLight} />
          <button type="button" onClick={() => loadSos(1)} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white"><RefreshCw className="mr-2 inline h-4 w-4" />Refresh</button>
          <ExportButton onClick={() => exportSos('csv')} label="CSV" />
          <ExportButton onClick={() => exportSos('excel')} label="Excel" />
          <ExportButton onClick={() => exportSos('pdf')} label="PDF" />
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <SosList items={items} loading={loading} pagination={pagination} setPage={loadSos} openDetails={openDetails} copyText={copyText} isLight={isLight} />
        <MapPanel item={activeMapItem} tracking={tracking} isLight={isLight} onRefresh={() => drawer && openDetails(drawer)} />
      </section>

      {drawer ? <SosDrawer sos={drawer} loading={drawerLoading} timeline={timeline} tracking={tracking} notes={notes} setNotes={setNotes} onClose={() => setDrawer(null)} saveNotes={saveNotes} markReviewed={markReviewed} copyText={copyText} isLight={isLight} /> : null}
    </AdminLayout>
  );
}

function SosList({ items, loading, pagination, setPage, openDetails, copyText, isLight }) {
  return (
    <section className={`overflow-hidden rounded-3xl border shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
      <div className="hidden overflow-x-auto 2xl:block">
        <table className="w-full text-left text-sm">
          <thead className={isLight ? 'bg-slate-50 text-slate-600' : 'bg-slate-900 text-slate-300'}>
            <tr>{['SOS ID', 'User', 'Phone', 'Status', 'Address', 'Coordinates', 'Contacts', 'Created', 'Updated', 'Duration', 'Actions'].map((head) => <th key={head} className="p-4 font-semibold">{head}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? <TableSkeleton isLight={isLight} /> : items.length ? items.map((item) => (
              <tr key={item.id} className={`border-t ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
                <td className="p-4 font-semibold">{item.emergencyId}</td>
                <td className="p-4"><UserCell user={item.user} /></td>
                <td className="p-4">{item.user.phone || '—'}</td>
                <td className="p-4"><StatusBadge status={item.displayStatus} /></td>
                <td className="max-w-64 truncate p-4">{item.address}</td>
                <td className="p-4">{formatCoord(item.latitude)}, {formatCoord(item.longitude)}</td>
                <td className="p-4">{item.contactsCount}</td>
                <td className="p-4">{formatDateTime(item.createdAt)}</td>
                <td className="p-4">{formatDateTime(item.updatedAt)}</td>
                <td className="p-4">{item.duration}</td>
                <td className="p-4"><RowActions item={item} openDetails={openDetails} copyText={copyText} /></td>
              </tr>
            )) : <tr><td colSpan="11"><EmptyState /></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-3 2xl:hidden">
        {loading ? <CardSkeleton isLight={isLight} /> : items.length ? items.map((item) => <MobileSosCard key={item.id} item={item} openDetails={openDetails} copyText={copyText} isLight={isLight} />) : <EmptyState />}
      </div>
      <div className={`flex items-center justify-between border-t p-4 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <p className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages} • {pagination.total} records</p>
        <div className="flex gap-2">
          <button type="button" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => setPage(pagination.page + 1)} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </section>
  );
}

function MapPanel({ item, tracking, isLight, onRefresh }) {
  const latitude = tracking?.latitude ?? item?.latitude;
  const longitude = tracking?.longitude ?? item?.longitude;
  const hasMap = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const bbox = hasMap ? `${Number(longitude) - 0.01},${Number(latitude) - 0.01},${Number(longitude) + 0.01},${Number(latitude) + 0.01}` : '';
  const mapUrl = hasMap ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}` : '';
  return (
    <aside className={`rounded-3xl border p-4 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
      <div className="flex items-center justify-between">
        <div><h2 className="font-bold">Live Map</h2><p className="text-sm text-slate-500">{item?.address || 'Select SOS record'}</p></div>
        <button type="button" onClick={onRefresh} className="rounded-xl bg-white/10 p-2" aria-label="Refresh tracking"><RefreshCw className="h-4 w-4" /></button>
      </div>
      <div className={`mt-4 h-80 overflow-hidden rounded-2xl border ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        {hasMap ? <iframe title="SOS OpenStreetMap location" src={mapUrl} className="h-full w-full" loading="lazy" /> : <div className="grid h-full place-items-center text-sm text-slate-500">Map location unavailable.</div>}
      </div>
      {hasMap ? <div className="mt-4 grid gap-2 text-sm"><p><b>Coordinates:</b> {formatCoord(latitude)}, {formatCoord(longitude)}</p><p><b>Status:</b> {item?.displayStatus || tracking?.status || 'N/A'}</p><p><b>Updated:</b> {formatDateTime(tracking?.updatedAt || item?.updatedAt)}</p><a href={item?.googleMapLink || `https://maps.google.com/?q=${latitude},${longitude}`} target="_blank" rel="noreferrer" className="rounded-2xl bg-red-600 px-4 py-3 text-center text-sm font-bold text-white">Open Google Maps</a></div> : null}
    </aside>
  );
}

function SosDrawer({ sos, loading, timeline, tracking, notes, setNotes, onClose, saveNotes, markReviewed, copyText, isLight }) {
  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="SOS details">
      <button type="button" aria-label="Close SOS details" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className={`absolute bottom-0 right-0 top-auto max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border p-5 shadow-2xl lg:top-0 lg:h-full lg:max-h-none lg:max-w-3xl lg:rounded-l-3xl lg:rounded-tr-none ${isLight ? 'border-slate-200 bg-white text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`}>
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm text-red-400">{sos.emergencyId}</p><h2 className="text-2xl font-bold">{sos.user?.name || 'Unknown User'}</h2><p className="text-sm text-slate-500">{sos.user?.email} • {sos.user?.phone}</p></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        {loading ? <div className="mt-6 h-96 animate-pulse rounded-3xl bg-white/5" /> : (
          <div className="mt-6 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Status" value={sos.displayStatus} />
              <Info label="Address" value={sos.address} />
              <Info label="Latitude" value={formatCoord(sos.latitude)} />
              <Info label="Longitude" value={formatCoord(sos.longitude)} />
              <Info label="Trigger Time" value={formatDateTime(sos.createdAt)} />
              <Info label="Completion Time" value={formatDateTime(sos.resolvedAt)} />
              <Info label="Duration" value={sos.duration} />
              <Info label="Battery" value={sos.batteryLevel ? `${sos.batteryLevel}%` : 'N/A'} />
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={() => copyText(`${formatCoord(sos.latitude)}, ${formatCoord(sos.longitude)}`, 'Coordinates')} icon={Copy} label="Copy Coordinates" />
              <ActionButton onClick={() => copyText(sos.googleMapLink, 'Google Maps link')} icon={MapPin} label="Copy Map Link" />
              <ActionButton onClick={() => copyText(sos.user?.phone, 'Phone number')} icon={Copy} label="Copy Phone" />
              <a href={sos.liveTrackingLink || sos.googleMapLink} target="_blank" rel="noreferrer" className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white"><Navigation className="mr-2 inline h-4 w-4" />Open Tracking Link</a>
              <button type="button" onClick={markReviewed} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white">Mark Reviewed</button>
            </div>
            <Section title="Emergency Contacts">{sos.contactNotifications?.length ? sos.contactNotifications.map((contact) => <div key={contact.contactId || contact.phone} className="rounded-2xl bg-white/5 p-3 text-sm"><b>{contact.name || 'Contact'}</b> • {contact.relationship || 'N/A'} • {contact.phone || 'N/A'} • {contact.email || 'No email'}</div>) : <p className="text-sm text-slate-500">No emergency contact delivery records.</p>}</Section>
            <Section title="Notification Status"><div className="grid gap-2 sm:grid-cols-3">{Object.entries(sos.deliverySummary || {}).map(([key, value]) => <Info key={key} label={key} value={value} />)}</div></Section>
            <Section title="Live Tracking"><p className="text-sm text-slate-500">Tracking: {tracking?.trackingActive ? 'Active' : 'Inactive'} • Latest update: {formatDateTime(tracking?.updatedAt)}</p></Section>
            <Section title="SOS Timeline">{timeline.length ? timeline.map((event, index) => <div key={`${event.status}-${index}`} className="rounded-2xl bg-white/5 p-3 text-sm"><b className="capitalize">{event.status}</b><p className="mt-1 text-slate-400">{event.message}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(event.at)}</p></div>) : <p className="text-sm text-slate-500">No timeline events yet.</p>}</Section>
            <Section title="Internal Notes"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="4" className="w-full rounded-2xl border border-white/10 bg-slate-950/40 p-4 outline-none focus:border-red-400" placeholder="Add internal admin notes..." /><button type="button" onClick={saveNotes} className="mt-3 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white">Save Notes</button></Section>
          </div>
        )}
      </aside>
    </div>
  );
}

function UserCell({ user }) {
  return <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-red-600 text-xs font-bold text-white">{user.avatar ? <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" /> : initials(user.name)}</div><div><p className="font-semibold">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></div></div>;
}

function RowActions({ item, openDetails, copyText }) {
  return <div className="flex flex-wrap gap-2"><button type="button" onClick={() => openDetails(item)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white"><Eye className="mr-1 inline h-3 w-3" />Details</button><button type="button" onClick={() => copyText(`${formatCoord(item.latitude)}, ${formatCoord(item.longitude)}`, 'Coordinates')} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold"><Copy className="h-3 w-3" /></button><a href={item.googleMapLink} target="_blank" rel="noreferrer" className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">Map</a></div>;
}

function MobileSosCard({ item, openDetails, copyText, isLight }) {
  return <article className={`rounded-2xl border p-4 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}><div className="flex items-start justify-between gap-3"><UserCell user={item.user} /><StatusBadge status={item.displayStatus} /></div><p className="mt-3 text-sm font-semibold">{item.emergencyId}</p><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.address}</p><p className="mt-2 text-xs text-slate-500">{formatCoord(item.latitude)}, {formatCoord(item.longitude)} • {item.duration}</p><div className="mt-3"><RowActions item={item} openDetails={openDetails} copyText={copyText} /></div></article>;
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
  return <div className="rounded-2xl bg-white/5 p-3"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold capitalize">{value ?? '—'}</p></div>;
}

function ActionButton({ onClick, icon: Icon, label }) {
  return <button type="button" onClick={onClick} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold"><Icon className="mr-2 inline h-4 w-4" />{label}</button>;
}

function Section({ title, children }) {
  return <section className="rounded-3xl border border-white/10 p-4"><h3 className="mb-3 font-bold">{title}</h3><div className="space-y-2">{children}</div></section>;
}

function SummarySkeleton({ isLight }) {
  return Array.from({ length: 8 }).map((_, index) => <div key={index} className={`h-36 animate-pulse rounded-3xl ${isLight ? 'bg-white' : 'bg-white/5'}`} />);
}

function TableSkeleton({ isLight }) {
  return Array.from({ length: 6 }).map((_, index) => <tr key={index}><td colSpan="11" className="p-4"><div className={`h-14 animate-pulse rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} /></td></tr>);
}

function CardSkeleton({ isLight }) {
  return Array.from({ length: 4 }).map((_, index) => <div key={index} className={`h-36 animate-pulse rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} />);
}

function EmptyState() {
  return <div className="grid min-h-72 place-items-center p-8 text-center"><div><FileText className="mx-auto h-12 w-12 text-slate-500" /><h3 className="mt-3 text-lg font-bold">No SOS records found.</h3><p className="mt-1 text-sm text-slate-500">Try changing the search or filters.</p></div></div>;
}

export default AdminSosPage;
