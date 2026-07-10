import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CalendarDays, LogOut, Phone, ShieldCheck, UserRound } from 'lucide-react';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { updateGoogleDisplayName } from '../services/googleAuthService';

const capitalizeName = (value = '') => value
  .replace(/[^A-Za-z\s]/g, '')
  .replace(/\s+/g, ' ')
  .trimStart()
  .toLowerCase()
  .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
  .slice(0, 50);

const minBirthDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 13);
  return date.toISOString().slice(0, 10);
};

function CompleteProfilePage() {
  const { user, completeProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name && !user.name.includes('@') ? capitalizeName(user.name) : '',
    dateOfBirth: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const errors = useMemo(() => {
    const next = {};
    if (!form.name.trim()) next.name = 'Full name is required.';
    else if (form.name.trim().length < 3) next.name = 'Full name must be at least 3 characters.';
    else if (!/^[A-Za-z\s]+$/.test(form.name.trim())) next.name = 'Use letters and spaces only.';
    if (!form.dateOfBirth) next.dateOfBirth = 'Date of birth is required.';
    else if (new Date(form.dateOfBirth) > new Date()) next.dateOfBirth = 'Date of birth cannot be in the future.';
    else if (form.dateOfBirth > minBirthDate()) next.dateOfBirth = 'You must be at least 13 years old.';
    if (!/^[6-9]\d{9}$/.test(form.phone)) next.phone = 'Enter a valid Indian mobile number starting with 6, 7, 8, or 9.';
    return next;
  }, [form]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.isGuest) return <Navigate to="/dashboard" replace />;
  if (user.profileCompleted) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (Object.keys(errors).length) return setToast(Object.values(errors)[0]);
    try {
      setLoading(true);
      const payload = { name: form.name.trim(), dateOfBirth: form.dateOfBirth, phone: form.phone };
      const data = await completeProfile(payload);
      await updateGoogleDisplayName({ displayName: data.user.name, photoURL: data.user.profileImage || data.user.avatar }).catch(() => undefined);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not complete profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-8 text-white">
      <Toast message={toast} type="error" />
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-red-600 text-3xl font-bold text-white">
            {user.profileImage || user.avatar ? <img src={user.profileImage || user.avatar} alt="Profile" className="h-full w-full object-cover" /> : <UserRound className="h-11 w-11" />}
          </div>
          <h1 className="mt-5 text-3xl font-bold">Complete Your Profile</h1>
          <p className="mt-2 text-sm text-slate-400">One last step before entering Raksha24x7.</p>
          <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300">{user.email}</p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field
            icon={UserRound}
            label="Full Name *"
            error={errors.name}
            input={<input value={form.name} onChange={(event) => setForm({ ...form, name: capitalizeName(event.target.value) })} placeholder="Enter your full name" className="input" />}
          />
          <Field
            icon={CalendarDays}
            label="Date of Birth *"
            error={errors.dateOfBirth}
            input={<input type="date" value={form.dateOfBirth} max={minBirthDate()} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} className="input" />}
          />
          <Field
            icon={Phone}
            label="Mobile Number *"
            error={errors.phone}
            hint="Used for SOS alerts, WhatsApp emergency sharing, live location and future OTP verification."
            input={<input inputMode="numeric" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="9876543210" className="input" />}
          />

          <button type="submit" disabled={loading || Object.keys(errors).length > 0} className="w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50">
            <ShieldCheck className="mr-2 inline h-4 w-4" />
            {loading ? 'Saving...' : 'Continue'}
          </button>
          <button type="button" onClick={async () => { await logout(); navigate('/login', { replace: true }); }} className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-slate-200 transition hover:bg-white/10">
            <LogOut className="mr-2 inline h-4 w-4" />
            Logout
          </button>
        </form>
      </section>
    </main>
  );
}

function Field({ icon: Icon, label, input, error, hint }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200"><Icon className="h-4 w-4 text-red-300" />{label}</span>
      <div className="[&_.input]:h-12 [&_.input]:w-full [&_.input]:rounded-2xl [&_.input]:border [&_.input]:border-white/10 [&_.input]:bg-slate-950 [&_.input]:px-4 [&_.input]:text-white [&_.input]:outline-none [&_.input]:transition [&_.input]:focus:border-red-400">
        {input}
      </div>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-2 text-xs font-medium text-red-300">{error}</p> : null}
    </label>
  );
}

export default CompleteProfilePage;
