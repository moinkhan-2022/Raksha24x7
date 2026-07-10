import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, ChevronLeft, ChevronRight, Download, Eye, Filter, Mail,
  MoreHorizontal, Pencil, RefreshCw, Search, Shield, Trash2, UserRound, X
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';

const filters = [
  ['all', 'All Users'], ['active', 'Active'], ['inactive', 'Inactive'], ['blocked', 'Blocked'],
  ['verified', 'Verified'], ['unverified', 'Unverified'], ['admin', 'Admin'], ['user', 'Normal User'],
  ['newest', 'Newest'], ['oldest', 'Oldest'], ['recently_active', 'Recently Active']
];

const sortOptions = [
  ['name_asc', 'Name (A-Z)'], ['name_desc', 'Name (Z-A)'], ['newest', 'Newest First'],
  ['oldest', 'Oldest First'], ['last_login', 'Last Login'], ['registration', 'Registration Date']
];

const statusOptions = ['active', 'inactive', 'blocked', 'suspended', 'banned'];
const roleOptions = ['user', 'admin', 'moderator'];

const initials = (name = 'U') => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
const formatDate = (value) => (value ? new Date(value).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const statusClass = (status) => {
  if (status === 'active') return 'bg-emerald-500/10 text-emerald-300';
  if (status === 'inactive') return 'bg-slate-500/10 text-slate-300';
  return 'bg-red-500/10 text-red-300';
};

function AdminUsersPage() {
  const isLight = localStorage.getItem('raksha_theme') === 'light';
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState([]);
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: 'user', accountStatus: 'active', adminNotes: '' });
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const fetchUsers = useCallback(async (page = pagination.page) => {
    setLoading(true);
    try {
      const { data } = await adminApi.users({ page, limit: pagination.limit, search: debouncedQuery, filter, sort });
      setUsers(data.users || []);
      setPagination(data.pagination || { page, limit: 10, total: 0, pages: 1 });
      setSelected([]);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filter, pagination.limit, pagination.page, sort]);

  useEffect(() => { fetchUsers(1); }, [debouncedQuery, filter, sort]);

  const allSelected = users.length > 0 && users.every((user) => selected.includes(user.id));
  const toggleAll = () => setSelected(allSelected ? [] : users.map((user) => user.id));
  const toggleUser = (id) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const openUser = async (user) => {
    setDrawerLoading(true);
    setDrawerUser(user);
    setEditing(false);
    setDeleteConfirm('');
    try {
      const { data } = await adminApi.userDetails(user.id);
      setDrawerUser(data.user);
      setEditForm({
        name: data.user.name || '',
        phone: data.user.phone || '',
        role: String(data.user.role || 'user').toLowerCase(),
        accountStatus: data.user.accountStatus || 'active',
        adminNotes: data.user.adminNotes || ''
      });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not load user details.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const saveUser = async () => {
    if (!drawerUser) return;
    if (!editForm.name.trim()) return setMessage('Full name is required.');
    if (!/^\d{10}$/.test(editForm.phone)) return setMessage('Enter a valid 10-digit phone number.');
    try {
      const { data } = await adminApi.updateUser(drawerUser.id, editForm);
      setDrawerUser((current) => ({ ...current, ...data.user }));
      setEditing(false);
      setMessage('User updated.');
      fetchUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not update user.');
    }
  };

  const updateStatus = async (status) => {
    if (!drawerUser || !window.confirm(`Change user status to ${status}?`)) return;
    try {
      const { data } = await adminApi.updateUserStatus(drawerUser.id, status);
      setDrawerUser((current) => ({ ...current, ...data.user }));
      setMessage(data.message || 'Status updated.');
      fetchUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not update status.');
    }
  };

  const deleteUser = async () => {
    if (!drawerUser || deleteConfirm !== 'DELETE') return setMessage('Type DELETE to confirm deletion.');
    if (!window.confirm('Final confirmation: delete this user?')) return;
    try {
      await adminApi.deleteUser(drawerUser.id, 'DELETE');
      setDrawerUser(null);
      setMessage('User deleted.');
      fetchUsers(1);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not delete user.');
    }
  };

  const bulkAction = async (action) => {
    if (!selected.length) return setMessage('Select at least one user.');
    if (!window.confirm(`Apply "${action}" to ${selected.length} selected users?`)) return;
    try {
      const { data } = await adminApi.bulkUsers({ ids: selected, action });
      setMessage(data.message || 'Bulk action completed.');
      fetchUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Bulk action failed.');
    }
  };

  const exportUsers = async (format) => {
    if (format === 'pdf') return setMessage('PDF export is future-ready and will be added later.');
    try {
      const { data } = await adminApi.exportUsers(format);
      const blob = new Blob([data], { type: format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raksha-users.${format === 'excel' ? 'xls' : 'csv'}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage('Could not export users.');
    }
  };

  const tableRows = useMemo(() => users, [users]);

  return (
    <AdminLayout title="User Management" subtitle="Search, monitor and manage registered Raksha24x7 users.">
      {message ? <div className="mb-4 flex items-center justify-between rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200"><span>{message}</span><button type="button" onClick={() => setMessage('')}><X className="h-4 w-4" /></button></div> : null}

      <section className={`rounded-3xl border p-4 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
          <label className={`relative rounded-2xl border ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950'}`}>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone or user ID" className="h-12 w-full bg-transparent px-11 text-sm outline-none" />
          </label>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className={`h-12 rounded-2xl border px-4 text-sm outline-none ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`}>
            {filters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className={`h-12 rounded-2xl border px-4 text-sm outline-none ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`}>
            {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={() => fetchUsers(1)} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500"><RefreshCw className="mr-2 inline h-4 w-4" />Refresh</button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => bulkAction('activate')} className="rounded-full bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">Activate</button>
          <button type="button" onClick={() => bulkAction('deactivate')} className="rounded-full bg-slate-500/10 px-3 py-2 text-xs font-bold text-slate-300">Deactivate</button>
          <button type="button" onClick={() => bulkAction('delete')} className="rounded-full bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">Delete</button>
          <button type="button" onClick={() => bulkAction('notify')} className="rounded-full bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300">Send Notification</button>
          <span className="mx-1 h-6 w-px bg-white/10" />
          <button type="button" onClick={() => exportUsers('csv')} className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold"><Download className="mr-1 inline h-3 w-3" />CSV</button>
          <button type="button" onClick={() => exportUsers('excel')} className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold">Excel</button>
          <button type="button" onClick={() => exportUsers('pdf')} className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold">PDF</button>
          <span className="ml-auto text-xs text-slate-500">{selected.length} selected</span>
        </div>
      </section>

      <section className={`mt-5 overflow-hidden rounded-3xl border shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left text-sm">
            <thead className={isLight ? 'bg-slate-50 text-slate-600' : 'bg-slate-900 text-slate-300'}>
              <tr>
                <th className="p-4"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all users" /></th>
                {['Profile Photo', 'Full Name', 'Email', 'Mobile Number', 'Role', 'Email Verification Status', 'Account Status', 'Registration Date', 'Last Login', 'Actions'].map((heading) => <th key={heading} className="p-4 font-semibold">{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, index) => <tr key={index}><td colSpan="10" className="p-4"><div className={`h-14 animate-pulse rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} /></td></tr>) : tableRows.length ? tableRows.map((user) => (
                <tr key={user.id} className={`border-t ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
                  <td className="p-4"><input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggleUser(user.id)} aria-label={`Select ${user.name}`} /></td>
                  <td className="p-4"><Avatar user={user} /></td>
                  <td className="p-4 font-semibold">{user.name}</td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">{user.phone}</td>
                  <td className="p-4"><Badge>{String(user.role || 'user').toUpperCase()}</Badge></td>
                  <td className="p-4"><span className={user.isEmailVerified ? 'text-emerald-300' : 'text-amber-300'}>{user.isEmailVerified ? 'Verified' : 'Unverified'}</span></td>
                  <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${statusClass(user.accountStatus)}`}>{user.accountStatus}</span></td>
                  <td className="p-4">{formatDate(user.createdAt)}</td>
                  <td className="p-4">{formatDate(user.lastLogin)}</td>
                  <td className="p-4"><button type="button" onClick={() => openUser(user)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500"><Eye className="mr-1 inline h-3 w-3" />View</button></td>
                </tr>
              )) : <tr><td colSpan="10"><EmptyState onRefresh={() => fetchUsers(1)} /></td></tr>}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-3 lg:hidden">
          {loading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className={`h-36 animate-pulse rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} />) : tableRows.length ? tableRows.map((user) => (
            <article key={user.id} className={`rounded-2xl border p-4 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggleUser(user.id)} className="mt-3" aria-label={`Select ${user.name}`} />
                <Avatar user={user} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold">{user.name}</h3>
                  <p className="truncate text-sm text-slate-500">{user.email}</p>
                  <p className="mt-1 text-sm">{user.phone}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{String(user.role || 'user').toUpperCase()}</Badge>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${statusClass(user.accountStatus)}`}>{user.accountStatus}</span>
                  </div>
                </div>
                <button type="button" onClick={() => openUser(user)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">View</button>
              </div>
            </article>
          )) : <EmptyState onRefresh={() => fetchUsers(1)} />}
        </div>

        <div className={`flex items-center justify-between border-t p-4 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
          <p className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages} · {pagination.total} users</p>
          <div className="flex gap-2">
            <button type="button" disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => fetchUsers(pagination.page + 1)} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      {drawerUser ? (
        <UserDrawer
          user={drawerUser}
          loading={drawerLoading}
          editing={editing}
          editForm={editForm}
          setEditForm={setEditForm}
          setEditing={setEditing}
          onClose={() => setDrawerUser(null)}
          onSave={saveUser}
          onStatus={updateStatus}
          deleteConfirm={deleteConfirm}
          setDeleteConfirm={setDeleteConfirm}
          onDelete={deleteUser}
          isLight={isLight}
        />
      ) : null}
    </AdminLayout>
  );
}

function Avatar({ user }) {
  return <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-red-600 text-sm font-bold text-white">{user.profileImage || user.avatar ? <img src={user.profileImage || user.avatar} alt={user.name} className="h-full w-full object-cover" /> : initials(user.name)}</div>;
}

function Badge({ children }) {
  return <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-300">{children}</span>;
}

function EmptyState({ onRefresh }) {
  return <div className="grid min-h-72 place-items-center p-8 text-center"><div><UserRound className="mx-auto h-12 w-12 text-slate-500" /><h3 className="mt-3 text-lg font-bold">No users found.</h3><p className="mt-1 text-sm text-slate-500">Try changing the search or filters.</p><button type="button" onClick={onRefresh} className="mt-4 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white">Refresh</button></div></div>;
}

function UserDrawer({ user, loading, editing, editForm, setEditForm, setEditing, onClose, onSave, onStatus, deleteConfirm, setDeleteConfirm, onDelete, isLight }) {
  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="User details">
      <button type="button" aria-label="Close user details" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className={`absolute bottom-0 right-0 top-auto max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border p-5 shadow-2xl md:top-0 md:h-full md:max-h-none md:max-w-xl md:rounded-l-3xl md:rounded-tr-none ${isLight ? 'border-slate-200 bg-white text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar user={user} />
            <div><h2 className="text-xl font-bold">{user.name}</h2><p className="text-sm text-slate-500">{user.email}</p></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        {loading ? <div className="mt-6 h-80 animate-pulse rounded-3xl bg-white/5" /> : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Info icon={Mail} label="Phone" value={user.phone} isLight={isLight} />
              <Info icon={Shield} label="Role" value={String(user.role || 'user').toUpperCase()} isLight={isLight} />
              <Info icon={CheckCircle2} label="Email" value={user.isEmailVerified ? 'Verified' : 'Unverified'} isLight={isLight} />
              <Info icon={MoreHorizontal} label="Status" value={user.accountStatus} isLight={isLight} />
              <Info icon={UserRound} label="Gender" value={user.gender || '—'} isLight={isLight} />
              <Info icon={UserRound} label="Blood Group" value={user.bloodGroup || '—'} isLight={isLight} />
              <Info icon={UserRound} label="Member Since" value={formatDate(user.memberSince || user.createdAt)} isLight={isLight} />
              <Info icon={UserRound} label="Last Login" value={formatDate(user.lastLogin)} isLight={isLight} />
              <Info icon={UserRound} label="Notification Status" value={user.notificationStatus || 'unknown'} isLight={isLight} />
              <Info icon={UserRound} label="PWA Installed" value={user.pwaInstalled ? 'Yes' : 'No'} isLight={isLight} />
            </div>

            <section className={`mt-5 rounded-2xl border p-4 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}>
              <h3 className="font-bold">Emergency Contacts</h3>
              <div className="mt-3 space-y-2">
                {user.contacts?.length ? user.contacts.map((contact) => <div key={contact._id || contact.phone} className="rounded-xl bg-white/5 p-3 text-sm"><b>{contact.name}</b> · {contact.relationship} · {contact.phone}</div>) : <p className="text-sm text-slate-500">No emergency contacts saved.</p>}
              </div>
            </section>

            {editing ? (
              <section className="mt-5 space-y-3">
                <Field label="Full Name" value={editForm.name} onChange={(value) => setEditForm({ ...editForm, name: value })} isLight={isLight} />
                <Field label="Phone Number" value={editForm.phone} onChange={(value) => setEditForm({ ...editForm, phone: value })} isLight={isLight} />
                <SelectField label="Role" value={editForm.role} options={roleOptions} onChange={(value) => setEditForm({ ...editForm, role: value })} isLight={isLight} />
                <SelectField label="Account Status" value={editForm.accountStatus} options={statusOptions} onChange={(value) => setEditForm({ ...editForm, accountStatus: value })} isLight={isLight} />
                <label className="block"><span className="text-sm font-semibold">Notes</span><textarea value={editForm.adminNotes} onChange={(event) => setEditForm({ ...editForm, adminNotes: event.target.value })} rows="3" className={`mt-2 w-full rounded-2xl border p-4 outline-none ${isLight ? 'border-slate-200 bg-white text-slate-950' : 'border-white/10 bg-slate-900 text-white'}`} /></label>
                <div className="grid grid-cols-2 gap-2"><button type="button" onClick={onSave} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white">Save</button><button type="button" onClick={() => setEditing(false)} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold">Cancel</button></div>
              </section>
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="mt-5 w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-bold text-white"><Pencil className="mr-2 inline h-4 w-4" />Edit User</button>
            )}

            <section className="mt-5 grid grid-cols-2 gap-2">
              {['active', 'inactive', 'suspended', 'banned'].map((status) => <button key={status} type="button" onClick={() => onStatus(status)} className="rounded-2xl border border-white/10 px-3 py-3 text-sm font-bold capitalize">{status === 'active' ? 'Activate' : status === 'inactive' ? 'Deactivate' : status}</button>)}
            </section>

            <section className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4">
              <h3 className="font-bold text-red-300">Danger Zone</h3>
              <p className="mt-1 text-sm text-red-100/80">Type DELETE to soft delete this user.</p>
              <input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} className="mt-3 h-11 w-full rounded-xl border border-red-400/30 bg-slate-950 px-3 text-white outline-none" placeholder="DELETE" />
              <button type="button" onClick={onDelete} className="mt-3 w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white"><Trash2 className="mr-2 inline h-4 w-4" />Delete User</button>
            </section>
          </>
        )}
      </aside>
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

export default AdminUsersPage;
