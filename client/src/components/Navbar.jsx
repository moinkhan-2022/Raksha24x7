import { Bell, LogOut, Shield, UserCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-2 text-white">
          <Shield className="h-6 w-6 text-red-500" />
          <span className="text-lg font-semibold tracking-wide">Raksha24x7</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10"><Bell className="h-5 w-5" /></button>
          <button className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10"><UserCircle2 className="h-5 w-5" /></button>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
