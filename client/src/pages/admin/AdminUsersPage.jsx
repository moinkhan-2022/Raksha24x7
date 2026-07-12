import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Copy, Download,
  Eye, Mail, Phone, RefreshCw, RotateCcw, Search, Shield, ShieldOff, Trash2,
  UserRound, Users, X
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminApi } from '../../services/api';

const statusFilters = [['all', 'All Status'], ['active', 'Active'], ['suspended', 'Suspended'], ['deleted', 'Deleted'], ['inactive', 'Inactive'], ['blocked', 'Blocked']];
const emailFilters = [['all', 'All Email'], ['verified', 'Verified'], ['unverified', 'Not Verified']];
const registrationFilters = [['all', 'All Time'], ['today', 'Today'], ['7d', 'Last 7 Days'], ['30d', 'Last 30 Days']];
const roleFilters = [['all', 'All Roles'], ['user', 'User'], ['admin', 'Admin']];
const sortOptions = [['newest', 'Newest'], ['oldest', 'Oldest'], ['alphabetical', 'Alphabetical'], ['last_login', 'Last Login']];

const initials = (name = 'U') => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
const formatDate = (value) => (value ? new Date(value).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const statusClass = (status) => {
  if (status === 'active') return 'bg-emerald-500/10 text-emerald-300';
  if (status === 'inactive') return 'bg-slate-500/10 text-slate-300';
  if (status === 'deleted') return 'bg-zinc-500/10 text-zinc-300';
  return 'bg-red-500/10 text-red-300';
};

function AdminUsersPage() {
  const isLight = localStorage.getItem('raksha_theme') === 'light';
  const { admin } = useAdminAuth();
  const canModify = ['super_admin', 'admin'].includes(String(admin?.role || '').toLowerCase());
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState({ status: 'all', email: 'all', registration: 'all', role: 'all', sort: 'newest' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState([]);
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState('profile');
  const [contacts, setContacts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [editForm, setEditForm] = useState({ name: '', phone: '', accountStatus: 'active', adminNotes: '' });
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [permanentDelete, setPermanentDelete] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const fetchUsers = useCallback(async (page = pagination.page) => {
    setLoading(true);
    try {
      const includeDeleted = filters.status === 'deleted' ? 'true' : 'false';
      const { data } = await adminApi.users({ page, limit: pagination.limit, search: debouncedQuery, ...filters, includeDeleted });
      setUsers(data.users || []);
      setPagination(data.pagination || { page, limit: 10, total: 0, pages: 1 });
      setSelected([]);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filters, pagination.limit, pagination.page]);

  useEffect(() => { fetchUsers(1); }, [debouncedQuery, filters.status, filters.email, filters.registration, filters.role, filters.sort]);

  const queryFilters = useMemo(() => ({ search: debouncedQuery, status: filters.status, email: filters.email, registration: filters.registration, role: filters.role, includeDeleted: filters.status === 'deleted' ? 'true' : 'false' }), [debouncedQuery, filters]);
  const allSelected = users.length > 0 && users.every((user) => selected.includes(user.id));

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const toggleAll = () => setSelected(allSelected ? [] : users.map((user) => user.id));
  const toggleUser = (id) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const openUser = async (user, tab = 'profile') => {
    setDrawerUser(user);
    setDrawerTab(tab);
    setDrawerLoading(true);
    setContacts([]);
    setActivity([]);
    setDeleteConfirm('');
    setPermanentDelete(false);
    try {
      const [detailsRes, contactsRes, activityRes] = await Promise.all([
        adminApi.userDetails(user.id),
        adminApi.userEmergencyContacts(user.id),
        adminApi.userActivity(user.id)
      ]);
      const loaded = detailsRes.data.user;
      setDrawerUser(loaded);
      setContacts(contactsRes.data.contacts || []);
      setActivity(activityRes.data.activity || []);
      setEditForm({ name: loaded.name || '', phone: loaded.phone || '', accountStatus: loaded.accountStatus || 'active', adminNotes: loaded.adminNotes || '' });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not load user profile.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value || '');
      setMessage(`${label} copied.`);
    } catch {
      setMessage(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const saveUser = async () => {
    if (!drawerUser || !canModify) return;
    if (!editForm.name.trim()) return setMessage('Full name is required.');
    try {
      const { data } = await adminApi.updateUser(drawerUser.id, editForm);
      setDrawerUser((current) => ({ ...current, ...data.user }));
      setMessage('User updated.');
      fetchUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not update user.');
    }
  };

  const confirmAction = async (label, fn) => {
    if (!canModify) return setMessage('Your admin role has read-only access.');
    if (!window.confirm(`Confirm action: ${label}?`)) return;
    try {
      const { data } = await fn();
      setMessage(data.message || `${label} completed.`);
      if (drawerUser) await openUser(drawerUser, drawerTab);
      fetchUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || `${label} failed.`);
    }
  };

  const deleteUser = async () => {
    if (!drawerUser || deleteConfirm !== 'DELETE') return setMessage('Type DELETE to confirm deletion.');
    await confirmAction(permanentDelete ? 'Permanent delete user' : 'Delete user', () => adminApi.deleteUser(drawerUser.id, 'DELETE', permanentDelete));
    if (!permanentDelete) setDrawerTab('profile');
  };

  const bulkAction = async (action) => {
    if (!canModify) return setMessage('Your admin role has read-only access.');
    if (!selected.length) return setMessage('Select at least one user.');
    if (!window.confirm(`Apply "${action}" to ${selected.length} selected users?`)) return;
    try {
      const { data } = await adminApi.bulkUsers({ ids: selected, action });
      setMessage(`${data.message || 'Bulk action completed.'} ${data.modifiedCount || 0} updated.`);
      fetchUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Bulk action failed.');
    }
  };

  const exportUsers = async (format) => {
    try {
      const { data } = await adminApi.exportUsers(format, queryFilters);
      const type = format === 'excel' ? 'application/vnd.ms-excel' : format === 'pdf' ? 'application/pdf' : 'text/csv';
      const blob = new Blob([data], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raksha-users.${format === 'excel' ? 'xls' : format}`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`Users exported as ${format.toUpperCase()}.`);
    } catch {
      setMessage('Could not export users.');
    }
  };

  return (
    <AdminLayout title="User Management" subtitle="Search, filter, review and securely manage Raksha24x7 users.">
      {message ? <div className="mb-4 flex items-center justify-between rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200"><span>{message}</span><button type="button" onClick={() => setMessage('')}><X className="h-4 w-4" /></button></div> : null}

      <section className={`rounded-3xl border p-4 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
        <div className="grid gap-3 xl:grid-cols-[1fr_170px_170px_170px_150px_150px_auto]">
          <label className={`relative rounded-2xl border ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950'}`}>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone, user ID, city or state" className="h-12 w-full bg-transparent px-11 text-sm outline-none" />
          </label>
          <FilterSelect value={filters.status} onChange={(value) => setFilter('status', value)} options={statusFilters} isLight={isLight} />
          <FilterSelect value={filters.email} onChange={(value) => setFilter('email', value)} options={emailFilters} isLight={isLight} />
          <FilterSelect value={filters.registration} onChange={(value) => setFilter('registration', value)} options={registrationFilters} isLight={isLight} />
          <FilterSelect value={filters.role} onChange={(value) => setFilter('role', value)} options={roleFilters} isLight={isLight} />
          <FilterSelect value={filters.sort} onChange={(value) => setFilter('sort', value)} options={sortOptions} isLight={isLight} />
          <button type="button" onClick={() => fetchUsers(1)} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500"><RefreshCw className="mr-2 inline h-4 w-4" />Refresh</button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <BulkButton disabled={!canModify} onClick={() => bulkAction('suspend')} label="Bulk Suspend" tone="red" />
          <BulkButton disabled={!canModify} onClick={() => bulkAction('activate')} label="Bulk Activate" tone="green" />
          <BulkButton disabled={!canModify} onClick={() => bulkAction('delete')} label="Bulk Delete" tone="red" />
          <BulkButton disabled={!canModify} onClick={() => bulkAction('restore')} label="Bulk Restore" tone="blue" />
          <span className="mx-1 h-6 w-px bg-white/10" />
          <BulkButton onClick={() => exportUsers('csv')} label="CSV" icon={Download} />
          <BulkButton onClick={() => exportUsers('excel')} label="Excel" />
          <BulkButton onClick={() => exportUsers('pdf')} label="PDF" />
          <span className="ml-auto text-xs text-slate-500">{selected.length} selected • {pagination.total} total</span>
        </div>
      </section>

      <section className={`mt-5 overflow-hidden rounded-3xl border shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full text-left text-sm">
            <thead className={isLight ? 'bg-slate-50 text-slate-600' : 'bg-slate-900 text-slate-300'}>
              <tr>
                <th className="p-4"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all users" /></th>
                {['User', 'Email', 'Phone', 'Role', 'Status', 'Email', 'Contacts', 'SOS', 'Registered', 'Last Login', 'Actions'].map((heading) => <th key={heading} className="p-4 font-semibold">{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? <TableSkeleton isLight={isLight} /> : users.length ? users.map((user) => (
                <tr key={user.id} className={`border-t ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
                  <td className="p-4"><input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggleUser(user.id)} aria-label={`Select ${user.name}`} /></td>
                  <td className="p-4"><div className="flex items-center gap-3"><Avatar user={user} /><div><p className="font-semibold">{user.name}</p><p className="text-xs text-slate-500">{user.id}</p></div></div></td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">{user.phone || '—'}</td>
                  <td className="p-4"><Badge>{String(user.role || 'user').toUpperCase()}</Badge></td>
                  <td className="p-4"><StatusBadge status={user.deletedAt ? 'deleted' : user.accountStatus} /></td>
                  <td className="p-4"><span className={user.isEmailVerified ? 'text-emerald-300' : 'text-amber-300'}>{user.isEmailVerified ? 'Verified' : 'Not Verified'}</span></td>
                  <td className="p-4">{user.emergencyContactCount || 0}</td>
                  <td className="p-4">{user.sosAlertCount || 0}</td>
                  <td className="p-4">{formatDate(user.createdAt)}</td>
                  <td className="p-4">{formatDate(user.lastLogin)}</td>
                  <td className="p-4"><ActionMenu user={user} openUser={openUser} copyText={copyText} canModify={canModify} confirmAction={confirmAction} /></td>
                </tr>
              )) : <tr><td colSpan="12"><EmptyState onRefresh={() => fetchUsers(1)} /></td></tr>}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-3 xl:hidden">
          {loading ? <CardSkeleton isLight={isLight} /> : users.length ? users.map((user) => (
            <article key={user.id} className={`rounded-2xl border p-4 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggleUser(user.id)} className="mt-3" aria-label={`Select ${user.name}`} />
                <Avatar user={user} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold">{user.name}</h3>
                  <p className="truncate text-sm text-slate-500">{user.email}</p>
                  <p className="mt-1 text-sm">{user.phone || '—'}</p>
                  <div className="mt-3 flex flex-wrap gap-2"><Badge>{String(user.role || 'user').toUpperCase()}</Badge><StatusBadge status={user.deletedAt ? 'deleted' : user.accountStatus} /></div>
                  <p className="mt-3 text-xs text-slate-500">{user.emergencyContactCount || 0} contacts • {user.sosAlertCount || 0} SOS • {formatDate(user.createdAt)}</p>
                </div>
                <button type="button" onClick={() => openUser(user)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">View</button>
              </div>
            </article>
          )) : <EmptyState onRefresh={() => fetchUsers(1)} />}
        </div>

        <div className={`flex items-center justify-between border-t p-4 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
          <p className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages}</p>
          <div className="flex gap-2">
            <button type="button" disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => fetchUsers(pagination.page + 1)} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      {drawerUser ? <UserDrawer user={drawerUser} loading={drawerLoading} tab={drawerTab} setTab={setDrawerTab} contacts={contacts} activity={activity} editForm={editForm} setEditForm={setEditForm} canModify={canModify} onClose={() => setDrawerUser(null)} onSave={saveUser} onDelete={deleteUser} onAction={confirmAction} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} permanentDelete={permanentDelete} setPermanentDelete={setPermanentDelete} isLight={isLight} /> : null}
    </AdminLayout>
  );
}

function FilterSelect({ value, onChange, options, isLight }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className={`h-12 rounded-2xl border px-4 text-sm outline-none ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`}>{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select>;
}

function BulkButton({ label, onClick, disabled = false, icon: Icon, tone = 'default' }) {
  const toneClass = tone === 'red' ? 'bg-red-500/10 text-red-300' : tone === 'green' ? 'bg-emerald-500/10 text-emerald-300' : tone === 'blue' ? 'bg-blue-500/10 text-blue-300' : 'bg-white/10';
  return <button type="button" disabled={disabled} onClick={onClick} className={`rounded-full px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}>{Icon ? <Icon className="mr-1 inline h-3 w-3" /> : null}{label}</button>;
}

function ActionMenu({ user, openUser, copyText, canModify, confirmAction }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => openUser(user, 'profile')} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white"><Eye className="mr-1 inline h-3 w-3" />Profile</button>
      <button type="button" onClick={() => openUser(user, 'contacts')} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">Contacts</button>
      <button type="button" onClick={() => openUser(user, 'activity')} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">Activity</button>
      <button type="button" onClick={() => copyText(user.email, 'Email')} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold"><Copy className="h-3 w-3" /></button>
      {canModify ? <button type="button" onClick={() => confirmAction(user.accountStatus === 'active' ? 'Suspend user' : 'Activate user', () => (user.accountStatus === 'active' ? adminApi.suspendUser(user.id) : adminApi.activateUser(user.id)))} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">{user.accountStatus === 'active' ? 'Suspend' : 'Activate'}</button> : null}
    </div>
  );
}

function Avatar({ user }) {
  return <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-red-600 text-sm font-bold text-white">{user.profileImage || user.avatar ? <img src={user.profileImage || user.avatar} alt={user.name} className="h-full w-full object-cover" /> : initials(user.name)}</div>;
}

function Badge({ children }) {
  return <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-300">{children}</span>;
}

function StatusBadge({ status }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${statusClass(status)}`}>{status}</span>;
}

function UserDrawer({ user, loading, tab, setTab, contacts, activity, editForm, setEditForm, canModify, onClose, onSave, onDelete, onAction, deleteConfirm, setDeleteConfirm, permanentDelete, setPermanentDelete, isLight }) {
  const tabs = [['profile', 'Profile'], ['contacts', 'Emergency Contacts'], ['activity', 'Activity'], ['actions', 'Actions']];
  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="User details">
      <button type="button" aria-label="Close user details" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className={`absolute bottom-0 right-0 top-auto max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border p-5 shadow-2xl md:top-0 md:h-full md:max-h-none md:max-w-2xl md:rounded-l-3xl md:rounded-tr-none ${isLight ? 'border-slate-200 bg-white text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3"><Avatar user={user} /><div><h2 className="text-xl font-bold">{user.name}</h2><p className="text-sm text-slate-500">{user.email}</p></div></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto">{tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold ${tab === key ? 'bg-red-600 text-white' : 'bg-white/10 text-slate-400'}`}>{label}</button>)}</div>
        {loading ? <div className="mt-6 h-80 animate-pulse rounded-3xl bg-white/5" /> : (
          <>
            {tab === 'profile' ? <ProfileTab user={user} editForm={editForm} setEditForm={setEditForm} canModify={canModify} onSave={onSave} isLight={isLight} /> : null}
            {tab === 'contacts' ? <ContactsTab contacts={contacts} isLight={isLight} /> : null}
            {tab === 'activity' ? <ActivityTab activity={activity} isLight={isLight} /> : null}
            {tab === 'actions' ? <ActionsTab user={user} canModify={canModify} onAction={onAction} onDelete={onDelete} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} permanentDelete={permanentDelete} setPermanentDelete={setPermanentDelete} isLight={isLight} /> : null}
          </>
        )}
      </aside>
    </div>
  );
}

function ProfileTab({ user, editForm, setEditForm, canModify, onSave, isLight }) {
  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Info icon={Phone} label="Phone" value={user.phone} isLight={isLight} />
        <Info icon={Shield} label="Role" value={String(user.role || 'user').toUpperCase()} isLight={isLight} />
        <Info icon={CheckCircle2} label="Email Verification" value={user.isEmailVerified ? 'Verified' : 'Not Verified'} isLight={isLight} />
        <Info icon={UserRound} label="Status" value={user.deletedAt ? 'Deleted' : user.accountStatus} isLight={isLight} />
        <Info icon={UserRound} label="Date of Birth" value={formatDate(user.dateOfBirth)} isLight={isLight} />
        <Info icon={UserRound} label="Gender" value={user.gender || '—'} isLight={isLight} />
        <Info icon={Users} label="Emergency Contacts" value={user.emergencyContactCount || user.contacts?.length || 0} isLight={isLight} />
        <Info icon={Shield} label="SOS Alerts" value={user.sosStats?.total ?? user.sosAlertCount ?? 0} isLight={isLight} />
        <Info icon={Clock} label="Registration Date" value={formatDate(user.createdAt)} isLight={isLight} />
        <Info icon={Clock} label="Last Login" value={formatDate(user.lastLogin)} isLight={isLight} />
      </div>
      <div className={`rounded-2xl border p-4 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}>
        <div className="flex items-center justify-between text-sm"><span>Profile Completion</span><b>{user.profileCompletion || 0}%</b></div>
        <div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-red-500" style={{ width: `${user.profileCompletion || 0}%` }} /></div>
      </div>
      {canModify ? <div className="space-y-3"><Field label="Full Name" value={editForm.name} onChange={(value) => setEditForm({ ...editForm, name: value })} isLight={isLight} /><Field label="Phone Number" value={editForm.phone} onChange={(value) => setEditForm({ ...editForm, phone: value })} isLight={isLight} /><SelectField label="Account Status" value={editForm.accountStatus} options={['active', 'inactive', 'blocked', 'suspended', 'banned']} onChange={(value) => setEditForm({ ...editForm, accountStatus: value })} isLight={isLight} /><label className="block"><span className="text-sm font-semibold">Admin Notes</span><textarea value={editForm.adminNotes} onChange={(event) => setEditForm({ ...editForm, adminNotes: event.target.value })} rows="3" className={`mt-2 w-full rounded-2xl border p-4 outline-none ${isLight ? 'border-slate-200 bg-white text-slate-950' : 'border-white/10 bg-slate-900 text-white'}`} /></label><button type="button" onClick={onSave} className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white">Save Changes</button></div> : <p className="rounded-2xl bg-white/5 p-4 text-sm text-slate-500">Your role has read-only access.</p>}
    </div>
  );
}

function ContactsTab({ contacts, isLight }) {
  return <div className="mt-5 space-y-3">{contacts.length ? contacts.map((contact) => <div key={contact._id || contact.phone} className={`rounded-2xl border p-4 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}><div className="flex justify-between gap-3"><div><p className="font-bold">{contact.name}</p><p className="text-sm text-slate-500">{contact.relationship}</p></div>{contact.primary ? <Badge>PRIMARY</Badge> : null}</div><p className="mt-3 text-sm">{contact.phone}</p><p className="mt-1 text-xs text-slate-500">WhatsApp availability: {contact.whatsappAvailable ? 'Likely available' : 'Unknown'}</p></div>) : <EmptyText text="No emergency contacts saved." />}</div>;
}

function ActivityTab({ activity, isLight }) {
  return <div className="mt-5 space-y-3">{activity.length ? activity.map((item) => <div key={item.id} className={`rounded-2xl border p-4 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-bold capitalize">{item.title}</p><p className="text-sm text-slate-500">{item.category}</p></div><span className="rounded-full bg-white/10 px-2 py-1 text-xs font-bold capitalize text-slate-400">{item.status}</span></div><p className="mt-2 text-xs text-slate-500">{new Date(item.time).toLocaleString()}</p></div>) : <EmptyText text="No activity found for this user." />}</div>;
}

function ActionsTab({ user, canModify, onAction, onDelete, deleteConfirm, setDeleteConfirm, permanentDelete, setPermanentDelete, isLight }) {
  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button disabled={!canModify} type="button" onClick={() => onAction('Suspend user', () => adminApi.suspendUser(user.id))} className="rounded-2xl border border-red-400/30 px-3 py-3 text-sm font-bold text-red-300 disabled:opacity-40"><ShieldOff className="mr-2 inline h-4 w-4" />Suspend</button>
        <button disabled={!canModify} type="button" onClick={() => onAction('Activate user', () => adminApi.activateUser(user.id))} className="rounded-2xl border border-emerald-400/30 px-3 py-3 text-sm font-bold text-emerald-300 disabled:opacity-40"><CheckCircle2 className="mr-2 inline h-4 w-4" />Activate</button>
        <button disabled={!canModify} type="button" onClick={() => onAction('Restore user', () => adminApi.restoreUser(user.id))} className="rounded-2xl border border-blue-400/30 px-3 py-3 text-sm font-bold text-blue-300 disabled:opacity-40"><RotateCcw className="mr-2 inline h-4 w-4" />Restore</button>
      </div>
      <div className={`rounded-2xl border border-red-400/30 bg-red-500/10 p-4 ${isLight ? 'text-red-900' : 'text-red-100'}`}>
        <h3 className="font-bold">Danger Zone</h3>
        <p className="mt-1 text-sm opacity-80">Type DELETE before deleting. Permanent delete is Super Admin only.</p>
        <input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} className="mt-3 h-11 w-full rounded-xl border border-red-400/30 bg-slate-950 px-3 text-white outline-none" placeholder="DELETE" />
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={permanentDelete} onChange={(event) => setPermanentDelete(event.target.checked)} /> Permanent delete</label>
        <button disabled={!canModify} type="button" onClick={onDelete} className="mt-3 w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"><Trash2 className="mr-2 inline h-4 w-4" />Delete User</button>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value, isLight }) {
  return <div className={`rounded-2xl border p-3 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'}`}><Icon className="h-4 w-4 text-red-400" /><p className="mt-2 text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold capitalize">{value || '—'}</p></div>;
}

function Field({ label, value, onChange, isLight }) {
  return <label className="block"><span className="text-sm font-semibold">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className={`mt-2 h-11 w-full rounded-2xl border px-4 outline-none ${isLight ? 'border-slate-200 bg-white text-slate-950' : 'border-white/10 bg-slate-900 text-white'}`} /></label>;
}

function SelectField({ label, value, options, onChange, isLight }) {
  return <label className="block"><span className="text-sm font-semibold">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={`mt-2 h-11 w-full rounded-2xl border px-4 capitalize outline-none ${isLight ? 'border-slate-200 bg-white text-slate-950' : 'border-white/10 bg-slate-900 text-white'}`}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function EmptyState({ onRefresh }) {
  return <div className="grid min-h-72 place-items-center p-8 text-center"><div><UserRound className="mx-auto h-12 w-12 text-slate-500" /><h3 className="mt-3 text-lg font-bold">No users found.</h3><p className="mt-1 text-sm text-slate-500">Try changing search or filters.</p><button type="button" onClick={onRefresh} className="mt-4 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white">Refresh</button></div></div>;
}

function EmptyText({ text }) {
  return <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">{text}</p>;
}

function TableSkeleton({ isLight }) {
  return Array.from({ length: 6 }).map((_, index) => <tr key={index}><td colSpan="12" className="p-4"><div className={`h-14 animate-pulse rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} /></td></tr>);
}

function CardSkeleton({ isLight }) {
  return Array.from({ length: 4 }).map((_, index) => <div key={index} className={`h-36 animate-pulse rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} />);
}

export default AdminUsersPage;
