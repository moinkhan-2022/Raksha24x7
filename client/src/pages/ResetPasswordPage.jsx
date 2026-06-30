import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import Toast from '../components/Toast';

function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });

  const strong = useMemo(() => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(form.password), [form.password]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!strong) return setToast('Password must be 8+ chars with upper, lower, number and special character');
    if (form.password !== form.confirmPassword) return setToast('Passwords do not match');

    try {
      setLoading(true);
      const { data } = await api.post(`/auth/reset-password/${token}`, form);
      setToast(data.message || 'Password reset successful');
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      setToast(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4">
      <Toast message={toast} type={toast.toLowerCase().includes('successful') ? 'success' : 'error'} />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="relative"><input className="w-full rounded-lg bg-slate-900/70 border border-slate-700 p-3" type={show ? 'text' : 'password'} placeholder="New Password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} required /><button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-3 text-sm text-indigo-300">{show ? 'Hide' : 'Show'}</button></div>
          <input className="w-full rounded-lg bg-slate-900/70 border border-slate-700 p-3" type={show ? 'text' : 'password'} placeholder="Confirm Password" value={form.confirmPassword} onChange={(e)=>setForm({...form,confirmPassword:e.target.value})} required />
          <button disabled={loading} className="w-full rounded-lg bg-red-600 p-3 font-semibold hover:bg-red-500 disabled:opacity-60">{loading ? 'Updating...' : 'Reset Password'}</button>
        </form>
      </motion.div>
    </div>
  );
}

export default ResetPasswordPage;
