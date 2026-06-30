import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { authApi } from '../services/api';

const AuthContext = createContext(null);

const GUEST_USER = {
  role: 'guest',
  name: 'Guest User',
  email: 'guest@raksha24x7.com',
  isGuest: true
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getProfile = async () => {
    const { data } = await authApi.getProfile();
    setUser(data.user);
    localStorage.setItem('raksha_user', JSON.stringify(data.user));
    return data.user;
  };

  const updateProfile = async (payload) => {
    const { data } = await authApi.updateProfile(payload);
    setUser(data.user);
    localStorage.setItem('raksha_user', JSON.stringify(data.user));
    return data;
  };

  const changePassword = async (payload) => authApi.changePassword(payload);

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    localStorage.setItem('raksha_token', data.token);
    localStorage.removeItem('raksha_guest');
    localStorage.setItem('raksha_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const loginAsGuest = () => {
    localStorage.removeItem('raksha_token');
    localStorage.setItem('raksha_guest', '1');
    localStorage.setItem('raksha_user', JSON.stringify(GUEST_USER));
    setUser(GUEST_USER);
    return GUEST_USER;
  };

  const register = async (payload) => {
    // temporary debug logs
    // eslint-disable-next-line no-console
    console.log('Sending registration:', payload);
    try {
      const response = await api.post('/auth/register', payload);
      // eslint-disable-next-line no-console
      console.log('Response:', response);
      const { data } = response;
      localStorage.setItem('raksha_token', data.token);
      localStorage.removeItem('raksha_guest');
      localStorage.setItem('raksha_user', JSON.stringify(data.user));
      setUser(data.user);
      return data;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.response || error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (!user?.isGuest) await api.post('/auth/logout');
    } catch {
      // ignore logout API error and clear client state anyway
    } finally {
      localStorage.removeItem('raksha_token');
      localStorage.removeItem('raksha_guest');
      localStorage.removeItem('raksha_user');
      setUser(null);
    }
  };

  useEffect(() => {
    const isGuest = localStorage.getItem('raksha_guest') === '1';
    const cachedUser = localStorage.getItem('raksha_user');
    const token = localStorage.getItem('raksha_token');

    if (isGuest) {
      setUser(cachedUser ? JSON.parse(cachedUser) : GUEST_USER);
      setLoading(false);
      return;
    }

    if (!token) {
      setUser(cachedUser ? JSON.parse(cachedUser) : null);
      setLoading(false);
      return;
    }

    getProfile()
      .catch(() => {
        localStorage.removeItem('raksha_token');
        localStorage.removeItem('raksha_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, loginAsGuest, logout, register, getProfile, updateProfile, changePassword }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
