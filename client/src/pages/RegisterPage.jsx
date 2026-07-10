import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState('');
  const [toast, setToast] = useState('');
  const [show, setShow] = useState(false);

  const goAfterAuth = (data) => navigate(data?.user?.profileCompleted ? '/dashboard' : '/complete-profile', { replace: true });

  const onGoogle = async () => {
    try {
      setLoading('google');
      const data = await loginWithGoogle();
      goAfterAuth(data);
    } catch (error) {
      setToast(error.response?.data?.message || error.friendlyMessage || error.message || 'Google sign-in failed.');
    } finally {
      setLoading('');
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setToast('Enter a valid email.');
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) return setToast('Password must contain 8+ characters, uppercase, lowercase and number.');
    if (form.password !== form.confirmPassword) return setToast('Passwords do not match.');
    try {
      setLoading('email');
      const data = await register(form);
      goAfterAuth(data);
    } catch (error) {
      setToast(error.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="w-full max-w-md">
      <Toast message={toast} type="error" />
      <div className="glass rounded-3xl p-7">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-red-600 text-white"><ShieldCheck className="h-8 w-8" /></div>
          <h1 className="mt-5 text-3xl font-bold">Create Account</h1>
          <p className="mt-2 text-sm text-slate-400">Start in seconds with Google or create an email password.</p>
        </div>

        <button type="button" onClick={onGoogle} disabled={Boolean(loading)} className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500 text-xs font-black text-white">G</span>
          {loading === 'google' ? 'Opening Google...' : 'Continue with Google'}
        </button>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-500"><span className="h-px flex-1 bg-white/10" />OR<span className="h-px flex-1 bg-white/10" /></div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 outline-none focus:border-red-400" placeholder="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <div className="relative">
            <input className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 pr-12 outline-none focus:border-red-400" placeholder="Password" type={show ? 'text' : 'password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <button type="button" className="absolute right-3 top-3 text-slate-300" onClick={() => setShow((value) => !value)}>{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
          </div>
          <input className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 outline-none focus:border-red-400" placeholder="Confirm Password" type={show ? 'text' : 'password'} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
          <button className="w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-60" disabled={Boolean(loading)}>{loading === 'email' ? 'Creating...' : 'Create Account'}</button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-400">Already have account? <Link className="font-semibold text-red-300" to="/login">Login</Link></p>
      </div>
    </div>
  );
}

export default RegisterPage;
