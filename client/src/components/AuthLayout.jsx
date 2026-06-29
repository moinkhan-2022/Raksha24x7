import { Outlet } from 'react-router-dom';

function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,#60a5fa_0,transparent_35%),radial-gradient(circle_at_80%_80%,#a78bfa_0,transparent_35%)]" />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <Outlet />
      </div>
    </div>
  );
}

export default AuthLayout;
