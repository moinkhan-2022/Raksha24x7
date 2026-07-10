import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AuthLayout from './components/AuthLayout';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import AuthStatusPage from './pages/AuthStatusPage';
import EmergencyContactsPage from './pages/EmergencyContactsPage';
import SosHistoryPage from './pages/SosHistoryPage';
import LiveLocationPage from './pages/LiveLocationPage';
import SosTrackingPage from './pages/SosTrackingPage';
import NotificationCenterPage from './pages/NotificationCenterPage';
import { useAuth } from './context/AuthContext';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import PWAStatus from './components/PWAStatus';

const loadGoogleMapPage = () => import('./pages/GoogleMapPage');
const loadLoginPage = () => import('./pages/LoginPage');
const loadRegisterPage = () => import('./pages/RegisterPage');
const loadCreatePasswordPage = () => import('./pages/CreatePasswordPage');
const loadCompleteProfilePage = () => import('./pages/CompleteProfilePage');
const loadNearbyServicesPage = () => import('./pages/NearbyServicesPage');
const loadLandingPage = () => import('./pages/LandingPage');
const loadDashboard = () => import('./pages/Dashboard');
const loadEmergencyNumbersPage = () => import('./pages/EmergencyNumbersPage');
const loadAdminLoginPage = () => import('./pages/admin/AdminLoginPage');
const loadAdminDashboardPage = () => import('./pages/admin/AdminDashboardPage');
const loadAdminUsersPage = () => import('./pages/admin/AdminUsersPage');
const loadAdminProfilePage = () => import('./pages/admin/AdminProfilePage');
const loadAdminSettingsPage = () => import('./pages/admin/AdminSettingsPage');

const GoogleMapPage = lazy(loadGoogleMapPage);
const LoginPage = lazy(loadLoginPage);
const RegisterPage = lazy(loadRegisterPage);
const CreatePasswordPage = lazy(loadCreatePasswordPage);
const CompleteProfilePage = lazy(loadCompleteProfilePage);
const NearbyServicesPage = lazy(loadNearbyServicesPage);
const LandingPage = lazy(loadLandingPage);
const Dashboard = lazy(loadDashboard);
const EmergencyNumbersPage = lazy(loadEmergencyNumbersPage);
const AdminLoginPage = lazy(loadAdminLoginPage);
const AdminDashboardPage = lazy(loadAdminDashboardPage);
const AdminUsersPage = lazy(loadAdminUsersPage);
const AdminProfilePage = lazy(loadAdminProfilePage);
const AdminSettingsPage = lazy(loadAdminSettingsPage);

const LAST_ROUTE_KEY = 'raksha_last_route';
const isStandaloneApp = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

function PageSkeleton() {
  return <div className="min-h-screen animate-pulse bg-slate-950 p-5"><div className="mx-auto h-16 max-w-7xl rounded-2xl bg-white/5" /><div className="mx-auto mt-5 h-72 max-w-7xl rounded-3xl bg-white/5" /><div className="mx-auto mt-5 grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-40 rounded-2xl bg-white/5" />)}</div></div>;
}

function HomeRoute({ user }) {
  const lastRoute = localStorage.getItem(LAST_ROUTE_KEY);
  if (user && isStandaloneApp() && lastRoute && !['/', '/login', '/register'].includes(lastRoute)) {
    return <Navigate to={lastRoute} replace />;
  }
  return <Suspense fallback={<PageSkeleton />}><LandingPage /></Suspense>;
}

function App() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const route = `${location.pathname}${location.search || ''}`;
    if (!['/', '/login', '/register'].includes(location.pathname)) {
      localStorage.setItem(LAST_ROUTE_KEY, route);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const preload = () => {
      loadDashboard();
      loadEmergencyNumbersPage();
      loadNearbyServicesPage();
      loadGoogleMapPage();
    };
    const usingIdleCallback = Boolean(window.requestIdleCallback);
    const handle = usingIdleCallback ? window.requestIdleCallback(preload, { timeout: 3000 }) : window.setTimeout(preload, 1200);
    return () => {
      if (usingIdleCallback && window.cancelIdleCallback) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, []);

  return (
    <>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Suspense fallback={<PageSkeleton />}><LoginPage /></Suspense>} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Suspense fallback={<PageSkeleton />}><RegisterPage /></Suspense>} />
        </Route>
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/auth/create-password" element={<ProtectedRoute allowGuest={false}><Suspense fallback={<PageSkeleton />}><CreatePasswordPage /></Suspense></ProtectedRoute>} />
      <Route path="/complete-profile" element={<ProtectedRoute allowGuest={false} requireProfile={false}><Suspense fallback={<PageSkeleton />}><CompleteProfilePage /></Suspense></ProtectedRoute>} />
      <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
      <Route path="/auth/verification-success" element={<AuthStatusPage />} />
      <Route path="/auth/verification-failed" element={<AuthStatusPage />} />
      <Route path="/auth/forgot-password-success" element={<AuthStatusPage />} />
      <Route path="/auth/password-reset-success" element={<AuthStatusPage />} />
      <Route path="/sos-tracking/:token" element={<SosTrackingPage />} />
        <Route path="/admin/login" element={<Suspense fallback={<PageSkeleton />}><AdminLoginPage /></Suspense>} />
        <Route path="/admin/dashboard" element={<AdminProtectedRoute><Suspense fallback={<PageSkeleton />}><AdminDashboardPage /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/users" element={<AdminProtectedRoute><Suspense fallback={<PageSkeleton />}><AdminUsersPage /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/profile" element={<AdminProtectedRoute><Suspense fallback={<PageSkeleton />}><AdminProfilePage /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/settings" element={<AdminProtectedRoute><Suspense fallback={<PageSkeleton />}><AdminSettingsPage /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/" element={<HomeRoute user={user} />} />
        <Route path="/sos" element={<ProtectedRoute allowGuest><Navigate to="/dashboard?sos=true" replace /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute allowGuest><Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute allowGuest={false}><ProfilePage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute allowGuest={false}><NotificationCenterPage /></ProtectedRoute>} />
        <Route path="/settings/*" element={<ProtectedRoute allowGuest={false}><SettingsPage /></ProtectedRoute>} />
        <Route path="/emergency-contacts" element={<ProtectedRoute allowGuest={false}><EmergencyContactsPage /></ProtectedRoute>} />
        <Route path="/sos-history" element={<ProtectedRoute allowGuest={false}><SosHistoryPage /></ProtectedRoute>} />
        <Route path="/live-location" element={<ProtectedRoute allowGuest={false}><LiveLocationPage /></ProtectedRoute>} />
        <Route path="/google-map" element={<ProtectedRoute allowGuest={false}><Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">Loading map...</div>}><GoogleMapPage /></Suspense></ProtectedRoute>} />
        <Route path="/nearby-services" element={<ProtectedRoute allowGuest={false}><Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">Loading nearby services...</div>}><NearbyServicesPage /></Suspense></ProtectedRoute>} />
        <Route path="/emergency-numbers" element={<ProtectedRoute allowGuest><Suspense fallback={<PageSkeleton />}><EmergencyNumbersPage /></Suspense></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
      </Routes>
      <PWAStatus />
      <PWAInstallPrompt />
    </>
  );
}

export default App;
