import { motion } from 'framer-motion';
import { Bell, LogOut, Shield, UserCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Navbar({ dashboard = false }) {
  const { logout, user } = useAuth();

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 border-b border-red-500/20 bg-slate-950/85 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-red-500" />
          <span className="text-lg font-semibold tracking-wide text-white">Raksha24x7</span>
        </div>

        {dashboard ? (
          <div className="flex items-center gap-2">
            <button className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10"><Bell className="h-5 w-5" /></button>
            <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:flex">
              <UserCircle2 className="h-5 w-5 text-slate-200" />
              <span className="max-w-24 truncate text-sm text-slate-200">{user?.name || 'User'}</span>
            </div>
            <button onClick={logout} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : null}
      </div>
    </motion.header>
  );
}

export default Navbar;
