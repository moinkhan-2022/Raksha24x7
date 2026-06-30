import api from './api';

const contactService = {
  getAll: () => api.get('/contacts'),
  create: (payload) => api.post('/contacts', payload),
  update: (id, payload) => api.put(`/contacts/${id}`, payload),
  remove: (id) => api.delete(`/contacts/${id}`)
};

export default contactService;
