import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailWarning, RefreshCw, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { authApi } from '../services/api';
import Toast from '../components/Toast';

function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setMessage('Invalid verification link.');
      return;
    }
    authApi.verifyEmail(token)
      .then((response) => {
        setStatus('success');
        setMessage(response.data.message || 'Email Verified Successfully');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Invalid verification link.');
      });
  }, [token]);

  const resend = async () => {
    if (!email || retryAfter > 0) return setToast('Enter your email address first.');
    try {
      setResending(true);
      const { data } = await authApi.resendVerification(email);
      setToast(data.message || 'Verification email sent.');
      setRetryAfter(60);
      const timer = window.setInterval(() => setRetryAfter((value) => {
        if (value <= 1) { window.clearInterval(timer); return 0; }
        return value - 1;
      }), 1000);
    } catch (error) {
      const seconds = error.response?.data?.retryAfter || 0;
      if (seconds) setRetryAfter(seconds);
      setToast(error.response?.data?.message || 'Could not resend verification email.');
    } finally {
      setResending(false);
    }
  };

  const Icon = status === 'success' ? CheckCircle2 : status === 'loading' ? RefreshCw : MailWarning;

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 text-white">
      <Toast message={toast} type={toast.toLowerCase().includes('sent') ? 'success' : 'error'} />
      <motion.main initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${status === 'success' ? 'bg-emerald-500/15 text-emerald-300' : status === 'loading' ? 'bg-blue-500/15 text-blue-300' : 'bg-amber-500/15 text-amber-300'}`}>
          <Icon className={`h-8 w-8 ${status === 'loading' ? 'animate-spin' : ''}`} />
        </div>
        <h1 className="mt-5 text-2xl font-bold">{status === 'success' ? 'Email Verified Successfully' : status === 'loading' ? 'Verifying Email' : message.includes('expired') ? 'Verification link expired.' : 'Invalid verification link.'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{message}</p>

        {status === 'success' ? (
          <Link to="/login" className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-red-600 px-5 py-4 text-sm font-bold text-white hover:bg-red-500">
            Continue to Login
          </Link>
        ) : status !== 'loading' ? (
          <div className="mt-6 space-y-3">
            <label className="block text-left">
              <span className="text-sm text-slate-300">Email Address</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none focus:border-red-400" placeholder="you@example.com" />
            </label>
            <button type="button" onClick={resend} disabled={resending || retryAfter > 0} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60">
              <ShieldCheck className="h-4 w-4" />
              {retryAfter > 0 ? `Resend in ${retryAfter}s` : resending ? 'Sending...' : 'Resend Verification Email'}
            </button>
            <Link to="/login" className="block rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-slate-200 hover:bg-white/10">Back to Login</Link>
          </div>
        ) : null}
      </motion.main>
    </div>
  );
}

export default VerifyEmailPage;
