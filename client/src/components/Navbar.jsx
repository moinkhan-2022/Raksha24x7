import { motion } from 'framer-motion';
import { Bell, ChevronDown, LogOut, Shield, UserCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Navbar({ dashboard = false }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <motion.header initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky top-0 z-40 border-b border-red-500/20 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link to="/dashboard" className="flex items-center gap-2"><Shield className="h-6 w-6 text-red-500" /><span className="text-lg font-semibold text-white">Raksha24x7</span></Link>
        {dashboard && (
          <div className="relative flex items-center gap-2">
            {user?.isGuest && <span className="rounded-full border border-amber-400/40 bg-amber-400/20 px-2 py-1 text-xs text-amber-200">Guest Mode</span>}
            <button className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10"><Bell className="h-5 w-5" /></button>
            <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-200">
              {user?.avatar ? <img src={user.avatar} alt="avatar" className="h-6 w-6 rounded-full" /> : <UserCircle2 className="h-5 w-5" />}<span className="hidden sm:inline">{user?.name || 'User'}</span><ChevronDown className="h-4 w-4" />
            </button>
            {open && <div className="absolute right-0 top-12 w-52 rounded-xl border border-white/10 bg-slate-900 p-2 text-sm">
              <Link className="block rounded px-3 py-2 hover:bg-white/10" to="/dashboard">Dashboard</Link>
              {!user?.isGuest && <>
                <Link className="block rounded px-3 py-2 hover:bg-white/10" to="/profile">Profile</Link>
                <Link className="block rounded px-3 py-2 hover:bg-white/10" to="/profile#contacts">Emergency Contacts</Link>
                <Link className="block rounded px-3 py-2 hover:bg-white/10" to="/settings">Settings</Link>
              </>}
              <button onClick={onLogout} className="mt-1 flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-red-500/20"><LogOut className="h-4 w-4" />Logout</button>
            </div>}
          </div>
        )}
      </div>
    </motion.header>
  );
}

export default Navbar;
