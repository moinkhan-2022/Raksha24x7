import api from './api';

const profileService = {
  getProfile: () => api.get('/profile'),
  updateProfile: (payload) => api.put('/profile', payload),
  uploadPhoto: (file) => {
    const form = new FormData();
    form.append('photo', file);
    return api.post('/profile/photo', form);
  },
  removePhoto: () => api.delete('/profile/photo'),
  changePassword: (payload) => api.put('/change-password', payload),
  deleteAccount: () => api.delete('/account')
};

export default profileService;
