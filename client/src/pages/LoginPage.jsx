import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

function LoginPage() {
  const { login, loginWithGoogle, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState('');
  const [toast, setToast] = useState('');

  const goAfterAuth = (data) => {
    navigate(data?.user?.profileCompleted ? '/dashboard' : '/complete-profile', { replace: true });
  };

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
    try {
      setLoading('email');
      const data = await login({ email: form.email, password: form.password });
      goAfterAuth(data);
    } catch (error) {
      setToast(error.response?.data?.message || 'Login failed.');
    } finally {
      setLoading('');
    }
  };

  const onGuest = () => { loginAsGuest(); navigate('/dashboard'); };

  return (
    <div className="w-full max-w-md">
      <Toast message={toast} type="error" />
      <div className="glass rounded-3xl p-7">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-red-600 text-white shadow-lg shadow-red-950/30"><Shield className="h-8 w-8" /></div>
          <h1 className="mt-5 text-3xl font-bold">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in quickly and continue to your safety dashboard.</p>
        </div>

        <button type="button" onClick={onGoogle} disabled={Boolean(loading)} className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500 text-xs font-black text-white">G</span>
          {loading === 'google' ? 'Opening Google...' : 'Continue with Google'}
        </button>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-500"><span className="h-px flex-1 bg-white/10" />OR<span className="h-px flex-1 bg-white/10" /></div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 outline-none focus:border-red-400" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <div className="relative">
            <input className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 pr-12 outline-none focus:border-red-400" placeholder="Password" type={show ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-3 text-slate-300" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} /> Remember Me</label>
            <Link to="/auth/forgot-password" className="text-red-300 hover:text-red-200">Forgot Password?</Link>
          </div>
          <button className="w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-60" disabled={Boolean(loading)}>{loading === 'email' ? 'Signing in...' : 'Login'}</button>
          <button type="button" onClick={onGuest} className="w-full rounded-2xl bg-slate-700 px-5 py-4 text-sm font-bold text-white transition hover:bg-slate-600">Continue as Guest</button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-400">No account? <Link className="font-semibold text-red-300" to="/register">Register</Link></p>
      </div>
    </div>
  );
}

export default LoginPage;
