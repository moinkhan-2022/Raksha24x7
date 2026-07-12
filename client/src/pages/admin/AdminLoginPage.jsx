import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
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
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-600 text-white">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-3xl font-bold">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-400">Secure access for Raksha24x7 administrators.</p>

        {error ? <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Admin Email</span>
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-white outline-none focus:border-red-400" placeholder="admin@raksha24x7.com" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Password</span>
            <span className="relative mt-2 block">
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 pr-12 text-white outline-none focus:border-red-400" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-300">
              <input type="checkbox" checked={form.remember} onChange={(event) => setForm({ ...form, remember: event.target.checked })} className="h-4 w-4 rounded border-white/20 bg-slate-900" />
              Remember Me
            </label>
            <Link to="/auth/forgot-password" className="text-red-300 hover:text-red-200">Forgot Password?</Link>
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-500 disabled:opacity-60">
            <LockKeyhole className="mr-2 inline h-4 w-4" />
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AdminLoginPage;
