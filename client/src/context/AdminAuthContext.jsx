import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../services/api';

const AdminAuthContext = createContext(null);

const TOKEN_KEY = 'raksha_admin_token';
const ADMIN_KEY = 'raksha_admin_user';
const EXPIRY_KEY = 'raksha_admin_expires_at';

const isAdmin = (admin) => String(admin?.role || '').toLowerCase() === 'admin';
const expired = () => {
  const value = localStorage.getItem(EXPIRY_KEY);
  return value ? new Date(value).getTime() <= Date.now() : false;
};

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearAdmin = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    setAdmin(null);
  };

  const loginAdmin = async (payload) => {
    const { data } = await adminApi.login(payload);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin));
    localStorage.setItem(EXPIRY_KEY, data.expiresAt);
    setAdmin(data.admin);
    return data;
  };

  const refreshAdmin = async () => {
    if (!localStorage.getItem(TOKEN_KEY) || expired()) {
      clearAdmin();
      return null;
    }
    const { data } = await adminApi.profile();
    if (!isAdmin(data.admin)) {
      clearAdmin();
      return null;
    }
    localStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin));
    setAdmin(data.admin);
    return data.admin;
  };

  const logoutAdmin = async () => {
    try {
      if (localStorage.getItem(TOKEN_KEY)) await adminApi.logout();
    } catch {
      // Always clear local admin session.
    } finally {
      clearAdmin();
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem(ADMIN_KEY);
    if (cached && !expired()) {
      try { setAdmin(JSON.parse(cached)); } catch { clearAdmin(); }
    }
    refreshAdmin().catch(clearAdmin).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (localStorage.getItem(TOKEN_KEY) && expired()) clearAdmin();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const value = useMemo(() => ({ admin, loading, isAdmin: isAdmin(admin), loginAdmin, logoutAdmin, refreshAdmin }), [admin, loading]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export const useAdminAuth = () => useContext(AdminAuthContext);
