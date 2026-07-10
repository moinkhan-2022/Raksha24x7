import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, allowGuest = true, requireProfile = true }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowGuest && user?.isGuest) return <Navigate to="/dashboard" replace />;
  if (requireProfile && !user?.isGuest && !user?.profileCompleted) return <Navigate to="/complete-profile" replace />;

  return children;
}

export default ProtectedRoute;
