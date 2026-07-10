import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../services/api';
import Toast from '../components/Toast';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) return setToast('Please enter a valid email');
    try {
      setLoading(true);
      const { data } = await authApi.forgotPassword(email);
      setToast(data.message || 'If this email exists, a password reset link has been sent.');
    } catch (err) {
      setToast(err.response?.data?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4">
      <Toast message={toast} type={toast.toLowerCase().includes('sent') ? 'success' : 'error'} />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
        <p className="mt-2 text-slate-300">Enter your email to receive a secure reset link.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input className="w-full rounded-lg bg-slate-900/70 border border-slate-700 p-3" type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          <button disabled={loading} className="w-full rounded-lg bg-red-600 p-3 font-semibold hover:bg-red-500 disabled:opacity-60">{loading ? 'Sending...' : 'Send Reset Link'}</button>
          <Link to="/login" className="block w-full rounded-lg border border-white/20 bg-white/5 p-3 text-center hover:bg-white/10">Back to Login</Link>
        </form>
      </motion.div>
    </div>
  );
}

export default ForgotPasswordPage;
