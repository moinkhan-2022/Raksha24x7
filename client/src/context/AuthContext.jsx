import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getProfile = async () => {
    const { data } = await authApi.getProfile();
    setUser(data.user);
    return data.user;
  };

  const updateProfile = async (payload) => {
    const { data } = await authApi.updateProfile(payload);
    setUser(data.user);
    return data;
  };

  const changePassword = async (payload) => authApi.changePassword(payload);

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    localStorage.setItem('raksha_token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('raksha_token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('raksha_token');
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem('raksha_token');
    if (!token) return setLoading(false);
    getProfile().catch(() => { localStorage.removeItem('raksha_token'); setUser(null); }).finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout, register, getProfile, updateProfile, changePassword }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
