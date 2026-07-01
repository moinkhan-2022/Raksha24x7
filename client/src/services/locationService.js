import api from './api';

export const saveLocation = (payload) => api.post('/location/save', payload);
export const getLocationHistory = () => api.get('/location/history');
export const getLatestLocation = () => api.get('/location/latest');
export const deleteLocationHistory = (id) => (
  id ? api.delete(`/location/history/${id}`) : api.delete('/location/history')
);

const locationService = {
  saveLocation,
  getLocationHistory,
  getLatestLocation,
  deleteLocationHistory
};

export default locationService;
