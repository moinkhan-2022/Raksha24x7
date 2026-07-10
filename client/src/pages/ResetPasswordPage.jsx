import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { motion } from 'framer-motion';
import { authApi } from '../services/api';
import Toast from '../components/Toast';

const rules = [
  { label: 'Minimum 8 characters', test: (value) => value.length >= 8 },
  { label: 'Uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: 'Lowercase letter', test: (value) => /[a-z]/.test(value) },
  { label: 'Number', test: (value) => /\d/.test(value) },
  { label: 'Special character', test: (value) => /[^A-Za-z\d]/.test(value) }
];

function ResetPasswordPage() {
  const { token } = useParams();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });

  const passedRules = useMemo(() => rules.filter((rule) => rule.test(form.password)).length, [form.password]);
  const strong = passedRules === rules.length;
  const strength = strong ? 'Strong' : passedRules >= 3 ? 'Medium' : 'Weak';

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!strong) return setToast('Use a stronger password.');
    if (form.password !== form.confirmPassword) return setToast('Passwords do not match');

    try {
      setLoading(true);
      const { data } = await authApi.resetPassword(token, form);
      setToast(data.message || 'Password reset successful');
      setSuccess(true);
    } catch (err) {
      setToast(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 text-white">
      <Toast message={toast} type={toast.toLowerCase().includes('successful') ? 'success' : 'error'} />
      <motion.main initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
        {success ? (
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300"><CheckCircle2 className="h-8 w-8" /></div>
            <h1 className="mt-5 text-2xl font-bold">Password reset successfully.</h1>
            <p className="mt-2 text-sm text-slate-300">Your old reset token has been invalidated.</p>
            <Link to="/login" className="mt-6 inline-flex w-full justify-center rounded-2xl bg-red-600 px-5 py-4 text-sm font-bold text-white hover:bg-red-500">Go to Login</Link>
          </div>
        ) : (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-500/15 text-red-300"><LockKeyhole className="h-7 w-7" /></div>
            <h1 className="mt-5 text-2xl font-bold">Reset Password</h1>
            <p className="mt-2 text-sm text-slate-300">Create a strong new password for your Raksha24x7 account.</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="relative">
                <input className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 pr-12 text-sm text-white outline-none focus:border-red-400" type={show ? 'text' : 'password'} placeholder="New Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-3 text-slate-300">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
              </div>
              <input className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none focus:border-red-400" type={show ? 'text' : 'password'} placeholder="Confirm Password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />

              <div className="rounded-2xl bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-sm"><span>Password strength</span><span className={strong ? 'text-emerald-300' : passedRules >= 3 ? 'text-amber-300' : 'text-red-300'}>{strength}</span></div>
                <div className="mt-2 grid grid-cols-5 gap-1">{rules.map((rule, index) => <span key={rule.label} className={`h-1.5 rounded-full ${index < passedRules ? 'bg-red-500' : 'bg-slate-800'}`} />)}</div>
                <ul className="mt-3 grid gap-1 text-xs text-slate-400">{rules.map((rule) => <li key={rule.label} className={rule.test(form.password) ? 'text-emerald-300' : ''}>• {rule.label}</li>)}</ul>
              </div>

              <button disabled={loading} className="w-full rounded-2xl bg-red-600 p-4 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60">{loading ? 'Updating...' : 'Reset Password'}</button>
            </form>
          </>
        )}
      </motion.main>
    </div>
  );
}

export default ResetPasswordPage;
