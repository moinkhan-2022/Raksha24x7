import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAuth } from '../../context/AuthContext';

const ADMIN_ROLES = ['super_admin', 'admin', 'moderator', 'support'];
const hasUserAdminRole = (user) => ADMIN_ROLES.includes(String(user?.role || '').toLowerCase());

function AdminLoginPage() {
  const { admin, loginAdmin } = useAdminAuth();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (admin) return <Navigate to="/admin/dashboard" replace />;
  if (user && !user.isGuest && !hasUserAdminRole(user)) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.email.trim()) return setError('Admin email is required.');
    if (!form.password) return setError('Password is required.');
    try {
      setLoading(true);
      await loginAdmin(form);
      const target = location.state?.from?.pathname || '/admin/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Admin login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-12rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-red-500/20 blur-3xl" />
        <div className="absolute bottom-[-14rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35rem)]" />
      </div>

      <section className="relative z-10 m-auto w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-3xl border border-red-300/20 bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-950/40">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
            Secure Admin
          </span>
        </div>

        <h1 className="mt-7 text-4xl font-black tracking-tight sm:text-5xl">Welcome back</h1>
        <p className="mt-3 max-w-sm text-base leading-7 text-slate-300">
          Sign in to manage Raksha24x7 operations, users, SOS alerts and platform settings.
        </p>

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className="block">
            <span className="text-sm font-bold text-slate-200">Admin Email</span>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="mt-2 h-14 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
              placeholder="admin@raksha24x7.com"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-200">Password</span>
            <span className="relative mt-2 block">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 pr-14 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-xl p-2.5 text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-red-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          <div className="flex items-center justify-between gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-3 text-slate-300">
              <input
                type="checkbox"
                checked={form.remember}
                onChange={(event) => setForm({ ...form, remember: event.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-slate-900 accent-red-500"
              />
              Remember Me
            </label>
            <Link to="/auth/forgot-password" className="font-semibold text-red-300 transition hover:text-red-200">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 px-5 py-4 text-sm font-black text-white shadow-xl shadow-red-950/30 transition hover:-translate-y-0.5 hover:shadow-red-950/50 disabled:translate-y-0 disabled:opacity-70"
          >
            <span className="absolute inset-0 translate-x-[-120%] bg-white/20 transition group-hover:translate-x-[120%]" />
            <span className="relative inline-flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {loading ? 'Signing in...' : 'Login to Admin Panel'}
            </span>
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Protected by separate admin JWT sessions and role-based access.
        </p>
      </section>
    </main>
  );
}

export default AdminLoginPage;
