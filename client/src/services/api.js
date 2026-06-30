import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('raksha_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (payload) => api.put('/auth/profile', payload),
  changePassword: (payload) => api.put('/auth/change-password', payload)
};

export default api;
