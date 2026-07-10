import { KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';

function AdminProfilePage() {
  const { admin } = useAdminAuth();
  const isLight = localStorage.getItem('raksha_theme') === 'light';
  const initials = (admin?.name || 'Admin').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <AdminLayout title="Admin Profile" subtitle="Manage your administrator account.">
      <section className={`mx-auto max-w-3xl rounded-3xl border p-6 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-red-600 text-3xl font-bold text-white">
            {admin?.profileImage || admin?.avatar ? <img src={admin.profileImage || admin.avatar} alt="Admin profile" className="h-full w-full object-cover" /> : initials}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{admin?.name || 'Administrator'}</h1>
            <p className={`mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{admin?.email}</p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-300">
              <ShieldCheck className="h-4 w-4" /> {admin?.role || 'ADMIN'}
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Info icon={UserRound} label="Name" value={admin?.name || 'Admin'} isLight={isLight} />
          <Info icon={Mail} label="Email" value={admin?.email || '—'} isLight={isLight} />
          <Info icon={ShieldCheck} label="Role" value={admin?.role || 'ADMIN'} isLight={isLight} />
          <Info icon={KeyRound} label="Last Login" value={admin?.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Unavailable'} isLight={isLight} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" className="rounded-2xl bg-red-600 px-5 py-4 text-sm font-bold text-white hover:bg-red-500">Edit Profile</button>
          <button type="button" className={`rounded-2xl border px-5 py-4 text-sm font-bold ${isLight ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}>Change Password</button>
        </div>
      </section>
    </AdminLayout>
  );
}

function Info({ icon: Icon, label, value, isLight }) {
  return (
    <div className={`rounded-2xl border p-4 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}>
      <Icon className="h-5 w-5 text-red-400" />
      <p className="mt-3 text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

export default AdminProfilePage;
