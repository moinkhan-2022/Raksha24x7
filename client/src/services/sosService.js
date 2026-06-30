import api from './api';

const sosService = {
  send: (payload) => api.post('/sos/send', payload),
  history: () => api.get('/sos/history'),
  latest: () => api.get('/sos/latest'),
  remove: (id) => api.delete(`/sos/history/${id}`)
};

export default sosService;
