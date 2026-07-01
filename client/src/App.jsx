import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './components/AuthLayout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import EmergencyContactsPage from './pages/EmergencyContactsPage';
import SosHistoryPage from './pages/SosHistoryPage';
import LiveLocationPage from './pages/LiveLocationPage';
import { useAuth } from './context/AuthContext';

function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
      </Route>
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<ProtectedRoute allowGuest><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute allowGuest={false}><ProfilePage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute allowGuest={false}><SettingsPage /></ProtectedRoute>} />
      <Route path="/emergency-contacts" element={<ProtectedRoute allowGuest={false}><EmergencyContactsPage /></ProtectedRoute>} />
      <Route path="/sos-history" element={<ProtectedRoute allowGuest={false}><SosHistoryPage /></ProtectedRoute>} />
      <Route path="/live-location" element={<ProtectedRoute allowGuest={false}><LiveLocationPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}

export default App;
