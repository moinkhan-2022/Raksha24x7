import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, MailCheck, MailWarning, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const statusConfig = {
  '/auth/verification-success': {
    icon: MailCheck,
    tone: 'emerald',
    title: 'Email verified successfully',
    message: 'Your Raksha24x7 account email is verified.',
    action: 'Go to Dashboard',
    to: '/dashboard'
  },
  '/auth/verification-failed': {
    icon: MailWarning,
    tone: 'amber',
    title: 'Verification failed',
    message: 'The verification link may be invalid or expired. You can request a new link from your profile.',
    action: 'Back to Login',
    to: '/login'
  },
  '/auth/forgot-password-success': {
    icon: CheckCircle2,
    tone: 'emerald',
    title: 'Check your email',
    message: 'If the email exists, a secure password reset link has been sent.',
    action: 'Back to Login',
    to: '/login'
  },
  '/auth/password-reset-success': {
    icon: ShieldCheck,
    tone: 'emerald',
    title: 'Password reset successful',
    message: 'Your password was updated. Please log in with your new password.',
    action: 'Go to Login',
    to: '/login'
  }
};

function AuthStatusPage() {
  const { pathname } = useLocation();
  const config = statusConfig[pathname] || statusConfig['/auth/forgot-password-success'];
  const Icon = config.icon;
  const toneClass = config.tone === 'emerald' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300';

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 text-white">
      <motion.main initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${toneClass}`}>
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">{config.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{config.message}</p>
        <Link to={config.to} className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-red-600 px-5 py-4 text-sm font-bold text-white hover:bg-red-500">
          {config.action}
        </Link>
      </motion.main>
    </div>
  );
}

export default AuthStatusPage;
