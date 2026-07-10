import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

function CreatePasswordPage() {
  const { user, setupPassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  if (!user) return <Navigate to="/login" replace />;
  if (!user.passwordSetupRequired) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) return setToast('Use 8+ characters with uppercase, lowercase and number.');
    if (form.password !== form.confirmPassword) return setToast('Passwords do not match.');
    try {
      setLoading(true);
      await setupPassword(form);
      setToast('Password created successfully.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not create password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
      <Toast message={toast} type={toast.includes('success') ? 'success' : 'error'} />
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-600">
          <KeyRound className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Create Password</h1>
        <p className="mt-2 text-sm text-slate-400">Create a password so you can sign in with email later too.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Password" className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 pr-12 outline-none focus:border-red-400" />
            <button type="button" onClick={() => setShow((value) => !value)} className="absolute right-3 top-3 text-slate-300" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
          </div>
          <input type={show ? 'text' : 'password'} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} placeholder="Confirm Password" className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 outline-none focus:border-red-400" />
          <button disabled={loading} className="w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60">{loading ? 'Saving...' : 'Finish Setup'}</button>
        </form>
      </section>
    </main>
  );
}

export default CreatePasswordPage;
