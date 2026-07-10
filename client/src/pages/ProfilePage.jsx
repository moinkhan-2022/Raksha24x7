import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, CalendarDays, CheckCircle2, ImagePlus, MailWarning, Phone, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import Navbar from '../components/Navbar';
import EditProfileModal from '../components/EditProfileModal';
import EmergencyContacts from '../components/EmergencyContacts';
import ProfileSkeleton from '../components/ProfileSkeleton';
import Toast from '../components/Toast';
import profileService from '../services/profileService';
import contactService from '../services/contactService';
import { authApi } from '../services/api';

const THEME_KEY = 'raksha_theme';

const initials = (name = 'User') => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';

const formatDate = (date) => {
  if (!date) return '—';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

function ProfilePage() {
  const fileInputRef = useRef(null);
  const [theme] = useState(() => localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');
  const isLight = theme === 'light';
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [openEdit, setOpenEdit] = useState(false);
  const [photoOptionsOpen, setPhotoOptionsOpen] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationRetryAfter, setVerificationRetryAfter] = useState(0);
  const [toast, setToast] = useState('');

  useEffect(() => {
    document.documentElement.dataset.rakshaTheme = theme;
  }, [theme]);

  useEffect(() => {
    let active = true;
    profileService.getProfile()
      .then(({ data }) => {
        if (!active) return;
        setUser(data.user);
        setForm({ name: data.user.name || '', email: data.user.email || '', phone: data.user.phone || '' });
      })
      .catch((error) => active && setToast(error.response?.data?.message || 'Failed to load profile'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const completion = useMemo(() => {
    if (!user) return 0;
    const fields = [user.name, user.email, user.phone, user.profileImage || user.avatar, user.contacts?.length];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [user]);

  const toastType = toast.toLowerCase().includes('success') || toast.toLowerCase().includes('updated') || toast.toLowerCase().includes('added') || toast.toLowerCase().includes('deleted') ? 'success' : 'error';

  const saveProfile = async () => {
    try {
      if (!form.name.trim() || !/^\d{10}$/.test(form.phone || '')) return setToast('Enter valid name and 10-digit phone');
      const { data } = await profileService.updateProfile({ name: form.name, phone: form.phone });
      setUser(data.user);
      setOpenEdit(false);
      setToast('Profile updated successfully');
    } catch (error) {
      setToast(error.response?.data?.message || 'Update failed');
    }
  };

  const upload = async (file) => {
    try {
      if (!file) return;
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) return setToast('Invalid image format');
      if (file.size > 2 * 1024 * 1024) return setToast('Image size must be <= 2MB');
      const { data } = await profileService.uploadPhoto(file);
      setUser(data.user);
      setPhotoOptionsOpen(false);
      setToast('Photo updated');
    } catch (error) {
      setToast(error.response?.data?.message || 'Photo upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const remove = async () => {
    try {
      const { data } = await profileService.removePhoto();
      setUser(data.user);
      setPhotoOptionsOpen(false);
      setToast('Photo removed');
    } catch (error) {
      setToast(error.response?.data?.message || 'Photo remove failed');
    }
  };

  const refreshContacts = async () => {
    const { data } = await contactService.getAll();
    setUser((current) => ({ ...current, contacts: data.contacts }));
  };

  const resendVerification = async () => {
    if (!user?.email || verificationRetryAfter > 0) return;
    try {
      setResendingVerification(true);
      const { data } = await authApi.resendVerification(user.email);
      setToast(data.message || 'Verification email sent.');
      setVerificationRetryAfter(60);
      const timer = window.setInterval(() => setVerificationRetryAfter((value) => {
        if (value <= 1) { window.clearInterval(timer); return 0; }
        return value - 1;
      }), 1000);
    } catch (error) {
      const seconds = error.response?.data?.retryAfter || 0;
      if (seconds) setVerificationRetryAfter(seconds);
      setToast(error.response?.data?.message || 'Could not resend verification email.');
    } finally {
      setResendingVerification(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isLight ? 'bg-slate-50 text-slate-950' : 'bg-slate-950 text-white'}`}>
        <Navbar dashboard />
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <ProfileSkeleton theme={theme} />
        </main>
      </div>
    );
  }

  const avatar = user.profileImage || user.avatar;
  const accountStatus = user.accountStatus || 'active';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isLight ? 'bg-slate-50 text-slate-950' : 'bg-slate-950 text-white'}`}>
      <Navbar dashboard />
      <Toast message={toast} type={toastType} />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">Raksha24x7</p>
          <h1 className="mt-2 text-3xl font-bold">My Profile</h1>
          <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Manage your personal information and emergency contacts.</p>
        </header>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid items-stretch gap-5 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.6fr)]">
          <section className={`flex min-h-[520px] flex-col rounded-3xl border p-5 shadow-sm md:p-6 ${isLight ? 'border-slate-200 bg-white shadow-slate-200/60' : 'border-white/10 bg-white/[0.05] shadow-black/20'}`}>
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                {avatar ? (
                  <img src={avatar} alt={user.name || 'Profile'} className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-xl shadow-black/20" />
                ) : (
                  <div className="grid h-32 w-32 place-items-center rounded-full border-4 border-white bg-gradient-to-br from-red-500 to-blue-600 text-4xl font-bold text-white shadow-xl shadow-black/20">
                    {initials(user.name)}
                  </div>
                )}
                <button type="button" onClick={() => setPhotoOptionsOpen(true)} aria-label="Edit profile photo" className="absolute bottom-1 right-1 grid h-11 w-11 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-red-950/30 transition hover:scale-105 hover:bg-red-500">
                  <Camera className="h-5 w-5" />
                </button>
              </div>

              <h2 className="mt-4 text-2xl font-bold">{user.name || 'Raksha User'}</h2>
              <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{user.email}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${accountStatus === 'inactive' ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {accountStatus === 'inactive' ? 'Inactive' : 'Active'}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-300'}`}>
                  <CalendarDays className="h-3.5 w-3.5" />
                  Since {formatDate(user.memberSince || user.createdAt)}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${user.isEmailVerified ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                  {user.isEmailVerified ? <ShieldCheck className="h-3.5 w-3.5" /> : <MailWarning className="h-3.5 w-3.5" />}
                  {user.isEmailVerified ? 'Email Verified' : 'Email Pending'}
                </span>
              </div>
            </div>

            <div className={`mt-6 rounded-2xl p-4 ${isLight ? 'bg-slate-50' : 'bg-slate-950/35'}`}>
              <div className="flex items-center justify-between text-sm">
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Profile Completion</span>
                <span className="font-semibold">{completion}%</span>
              </div>
              <div className={`mt-3 h-2 overflow-hidden rounded-full ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}>
                <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-blue-500 transition-all duration-500" style={{ width: `${completion}%` }} />
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-sm">
              <InfoRow icon={Phone} label="Mobile Number" value={user.phone || 'Not added'} isLight={isLight} />
              <InfoRow icon={user.isEmailVerified ? ShieldCheck : MailWarning} label="Email Status" value={user.isEmailVerified ? 'Verified' : 'Not Verified'} isLight={isLight} />
              <InfoRow icon={UserRound} label="Account Status" value={accountStatus === 'inactive' ? 'Inactive' : 'Active'} isLight={isLight} />
            </div>

            {!user.isEmailVerified && (
              <button type="button" onClick={resendVerification} disabled={resendingVerification || verificationRetryAfter > 0} className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${isLight ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-amber-400/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15'}`}>
                {verificationRetryAfter > 0 ? `Resend in ${verificationRetryAfter}s` : resendingVerification ? 'Sending...' : 'Resend Verification Email'}
              </button>
            )}

            <div className="mt-auto grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <button type="button" onClick={() => setOpenEdit(true)} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:-translate-y-0.5 hover:bg-red-500">
                Edit Profile
              </button>
              <button type="button" onClick={() => setPhotoOptionsOpen(true)} className={`rounded-2xl border px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${isLight ? 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50' : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'}`}>
                Change Photo
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(event) => upload(event.target.files?.[0])} />
          </section>

          <section className={`relative min-h-[520px] rounded-3xl border p-5 shadow-sm md:p-6 ${isLight ? 'border-slate-200 bg-white shadow-slate-200/60' : 'border-white/10 bg-white/[0.05] shadow-black/20'}`}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Emergency Contacts</h2>
                <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>People who can be reached quickly during an emergency.</p>
              </div>
            </div>
            <EmergencyContacts
              contacts={user.contacts || []}
              theme={theme}
              onAdd={async (payload) => { await contactService.create(payload); await refreshContacts(); setToast('Contact added'); }}
              onUpdate={async (id, payload) => { await contactService.update(id, payload); await refreshContacts(); setToast('Contact updated'); }}
              onDelete={async (id) => { await contactService.remove(id); await refreshContacts(); setToast('Contact deleted'); }}
            />
          </section>

        </motion.div>
      </main>

      <EditProfileModal open={openEdit} form={form} setForm={setForm} onSave={saveProfile} onClose={() => setOpenEdit(false)} loading={false} theme={theme} />
      <PhotoOptions open={photoOptionsOpen} hasPhoto={Boolean(avatar)} onClose={() => setPhotoOptionsOpen(false)} onUpload={() => fileInputRef.current?.click()} onRemove={remove} theme={theme} />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, isLight }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl p-3 ${isLight ? 'bg-slate-50' : 'bg-slate-950/35'}`}>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-300"><Icon className="h-4 w-4" /></div>
      <div>
        <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

function PhotoOptions({ open, hasPhoto, onClose, onUpload, onRemove, theme }) {
  if (!open) return null;
  const isLight = theme === 'light';
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-sm rounded-3xl border p-5 shadow-2xl ${isLight ? 'border-slate-200 bg-white text-slate-950' : 'border-white/10 bg-slate-900 text-white'}`}>
        <h3 className="text-lg font-bold">Profile Photo</h3>
        <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Update or remove your profile picture.</p>
        <div className="mt-5 grid gap-2">
          <button type="button" onClick={onUpload} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500">
            <ImagePlus className="h-4 w-4" />
            Choose New Photo
          </button>
          {hasPhoto && (
            <button type="button" onClick={onRemove} className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${isLight ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15'}`}>
              <Trash2 className="h-4 w-4" />
              Remove Image
            </button>
          )}
          <button type="button" onClick={onClose} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${isLight ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-white/10 text-slate-200 hover:bg-white/10'}`}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
