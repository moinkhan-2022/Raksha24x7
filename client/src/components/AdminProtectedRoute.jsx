import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';

const ADMIN_ROLES = ['super_admin', 'admin', 'moderator', 'support'];
const hasUserAdminRole = (user) => ADMIN_ROLES.includes(String(user?.role || '').toLowerCase());

function AdminProtectedRoute({ children }) {
  const location = useLocation();
  const { user, loading: userLoading } = useAuth();
  const { admin, loading: adminLoading, isAdmin } = useAdminAuth();

  if (userLoading || adminLoading) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">Loading admin session...</div>;
  }

  if (user && !user.isGuest && !hasUserAdminRole(user) && !admin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  if (!isAdmin) return <AccessDenied />;

  return children;
}

function AccessDenied() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
      <section className="max-w-md rounded-3xl border border-red-400/30 bg-red-500/10 p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">403</p>
        <h1 className="mt-3 text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-sm text-slate-300">This area is restricted to Raksha24x7 administrators only.</p>
      </section>
    </main>
  );
}

export default AdminProtectedRoute;
