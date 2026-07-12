import { useEffect, useState } from 'react';
import { KeyRound, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminApi } from '../../services/api';

function AdminProfilePage() {
  const { admin, refreshAdmin, logoutAdmin } = useAdminAuth();
  const isLight = localStorage.getItem('raksha_theme') === 'light';
  const [profile, setProfile] = useState({ fullName: admin?.fullName || admin?.name || '', phoneNumber: admin?.phoneNumber || admin?.phone || '', profilePhoto: admin?.profilePhoto || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProfile({ fullName: admin?.fullName || admin?.name || '', phoneNumber: admin?.phoneNumber || admin?.phone || '', profilePhoto: admin?.profilePhoto || '' });
  }, [admin]);

  const initials = (admin?.name || 'Admin').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  const saveProfile = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      setSaving(true);
      await adminApi.updateProfile(profile);
      await refreshAdmin();
      setMessage('Admin profile updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update admin profile.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      setSaving(true);
      await adminApi.changePassword(passwords);
      setMessage('Password changed successfully. Please login again.');
      await logoutAdmin();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Admin Profile" subtitle="Manage your administrator account and security.">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_1fr]">
        <section className={`rounded-3xl border p-6 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-red-600 text-3xl font-bold text-white">
              {admin?.profileImage || admin?.avatar ? <img src={admin.profileImage || admin.avatar} alt="Admin profile" className="h-full w-full object-cover" /> : initials}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{admin?.name || 'Administrator'}</h2>
              <p className={`mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{admin?.email}</p>
              <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                <ShieldCheck className="h-4 w-4" /> {admin?.roleLabel || admin?.role || 'Admin'}
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Info icon={UserRound} label="Name" value={admin?.name || 'Admin'} isLight={isLight} />
            <Info icon={Mail} label="Email" value={admin?.email || '—'} isLight={isLight} />
            <Info icon={Phone} label="Phone" value={admin?.phone || 'Not added'} isLight={isLight} />
            <Info icon={KeyRound} label="Last Login" value={admin?.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Unavailable'} isLight={isLight} />
          </div>
        </section>

        <section className={`rounded-3xl border p-6 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
          {message ? <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</div> : null}
          {error ? <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
          <form onSubmit={saveProfile} className="space-y-4">
            <h3 className="text-lg font-bold">Edit Profile</h3>
            <Input label="Full Name" value={profile.fullName} onChange={(value) => setProfile({ ...profile, fullName: value })} />
            <Input label="Phone Number" value={profile.phoneNumber} onChange={(value) => setProfile({ ...profile, phoneNumber: value })} />
            <Input label="Profile Photo URL" value={profile.profilePhoto} onChange={(value) => setProfile({ ...profile, profilePhoto: value })} />
            <button type="submit" disabled={saving} className="w-full rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60">Save Profile</button>
          </form>

          <form onSubmit={changePassword} className="mt-8 space-y-4 border-t border-white/10 pt-6">
            <h3 className="text-lg font-bold">Change Password</h3>
            <Input label="Current Password" type="password" value={passwords.currentPassword} onChange={(value) => setPasswords({ ...passwords, currentPassword: value })} />
            <Input label="New Password" type="password" value={passwords.newPassword} onChange={(value) => setPasswords({ ...passwords, newPassword: value })} />
            <Input label="Confirm Password" type="password" value={passwords.confirmPassword} onChange={(value) => setPasswords({ ...passwords, confirmPassword: value })} />
            <button type="submit" disabled={saving} className={`w-full rounded-2xl border px-5 py-3 text-sm font-bold ${isLight ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'} disabled:opacity-60`}>Change Password</button>
          </form>
        </section>
      </div>
    </AdminLayout>
  );
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-400">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 outline-none focus:border-red-400" />
    </label>
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
