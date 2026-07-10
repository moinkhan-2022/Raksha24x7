import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
const adminHttp = axios.create({ baseURL: '/api/admin' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('raksha_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminHttp.interceptors.request.use((config) => {
  const token = localStorage.getItem('raksha_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (payload) => api.put('/auth/profile', payload),
  changePassword: (payload) => api.put('/auth/change-password', payload),
  google: (idToken) => api.post('/auth/google', { idToken }),
  setupPassword: (payload) => api.post('/auth/setup-password', payload),
  completeProfile: (payload) => api.post('/auth/complete-profile', payload),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`),
  verifyEmailByToken: (token) => api.get(`/auth/verify/${encodeURIComponent(token)}`),
  sendVerificationEmail: () => api.post('/auth/send-verification-email'),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, payload) => api.post(`/auth/reset-password/${token}`, payload),
  resetPasswordWithBodyToken: (payload) => api.post('/auth/reset-password', payload)
};

export const notificationApi = {
  list: (params) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  settings: () => api.get('/notifications/settings'),
  updateSettings: (payload) => api.patch('/notifications/settings', payload),
  create: (payload) => api.post('/notifications', payload),
  markRead: (ids) => api.patch('/notifications/read', { ids }),
  markUnread: (ids) => api.patch('/notifications/unread', { ids }),
  markAllRead: () => api.patch('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${encodeURIComponent(id)}`),
  removeAll: () => api.delete('/notifications/all'),
  registerDevice: (payload) => api.post('/notifications/devices/register', payload),
  unregisterDevice: (deviceId) => api.post('/notifications/devices/unregister', { deviceId }),
  listDevices: () => api.get('/notifications/devices'),
  removeDevice: (deviceId) => api.delete(`/notifications/devices/${encodeURIComponent(deviceId)}`),
  trackAnalytics: (payload) => api.post('/notifications/analytics', payload),
  sendTest: () => api.post('/notifications/test'),
  sendPushToUser: (payload) => api.post('/notifications/push/user', payload),
  sendPushToMany: (payload) => api.post('/notifications/push/multiple', payload),
  broadcastPush: (payload) => api.post('/notifications/push/broadcast', payload),
  sendTopicPush: (payload) => api.post('/notifications/push/topic', payload)
};

export const adminApi = {
  login: (payload) => adminHttp.post('/login', payload),
  logout: () => adminHttp.post('/logout'),
  profile: () => adminHttp.get('/profile'),
  dashboard: () => adminHttp.get('/dashboard'),
  settings: () => adminHttp.get('/settings'),
  updateSettings: (payload) => adminHttp.put('/settings', payload),
  users: (params) => adminHttp.get('/users', { params }),
  userDetails: (id) => adminHttp.get(`/users/${id}`),
  updateUser: (id, payload) => adminHttp.put(`/users/${id}`, payload),
  updateUserStatus: (id, status) => adminHttp.patch(`/users/${id}/status`, { status }),
  deleteUser: (id, confirmation = 'DELETE') => adminHttp.delete(`/users/${id}`, { data: { confirmation } }),
  bulkUsers: (payload) => adminHttp.post('/users/bulk', payload),
  exportUsers: (format = 'csv') => adminHttp.get('/users/export', { params: { format }, responseType: format === 'pdf' ? 'json' : 'blob' })
};

export default api;
