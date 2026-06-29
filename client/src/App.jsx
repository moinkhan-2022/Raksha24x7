import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './components/AuthLayout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import { useAuth } from './context/AuthContext';

function Stub({ title }) {
  return <div className="p-8 text-xl">{title}</div>;
}

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
      </Route>

      <Route path="/" element={<LandingPage />} />
      <Route path="/emergency-numbers" element={<Stub title="Emergency Numbers (Public)" />} />
      <Route path="/safety-tips" element={<Stub title="Safety Tips (Public)" />} />
      <Route path="/about" element={<Stub title="About (Public)" />} />
      <Route path="/contact" element={<Stub title="Contact (Public)" />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      {['/profile', '/sos', '/emergency-contacts', '/live-location', '/nearby-services', '/google-maps'].map((path) => (
        <Route key={path} path={path} element={<ProtectedRoute><Stub title={`${path.slice(1)} (Protected)`} /></ProtectedRoute>} />
      ))}

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}

export default App;
