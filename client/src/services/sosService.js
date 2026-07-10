import api from './api';

const SOS_OFFLINE_QUEUE_KEY = 'raksha_offline_sos_queue';

const readQueue = () => {
  try {
    const value = JSON.parse(localStorage.getItem(SOS_OFFLINE_QUEUE_KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeQueue = (items) => {
  try {
    localStorage.setItem(SOS_OFFLINE_QUEUE_KEY, JSON.stringify(items.slice(-10)));
  } catch {
    // SOS queuing is best-effort and should not crash the app.
  }
};

const queueOfflineSos = (payload) => {
  const item = { id: `offline-sos-${Date.now()}`, payload, queuedAt: new Date().toISOString() };
  writeQueue([...readQueue(), item]);
  window.dispatchEvent(new CustomEvent('raksha:sos-offline-queued', { detail: item }));
  return item;
};

const isNetworkFailure = (error) => !navigator.onLine || !error.response;

const start = async (payload) => {
  try {
    return await api.post('/sos/start', payload);
  } catch (error) {
    if (isNetworkFailure(error)) {
      const queued = queueOfflineSos(payload);
      return {
        data: {
          success: true,
          queuedOffline: true,
          message: 'You are offline. SOS request saved and will retry automatically.',
          offlineRequest: queued
        }
      };
    }
    throw error;
  }
};

export const replayOfflineSosQueue = async () => {
  if (!navigator.onLine) return { replayed: 0, remaining: readQueue().length };
  const queue = readQueue();
  const remaining = [];
  let replayed = 0;

  for (const item of queue) {
    try {
      await api.post('/sos/start', item.payload);
      replayed += 1;
    } catch {
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return { replayed, remaining: remaining.length };
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    replayOfflineSosQueue().catch(() => undefined);
  });
}

const sosService = {
  send: start,
  start,
  stop: (sosId) => api.post('/sos/stop', { sosId }),
  shareLocation: (payload) => api.post('/sos/share-location', payload),
  retry: (sosId) => api.post('/sos/retry', { sosId }),
  history: () => api.get('/sos/history'),
  latest: () => api.get('/sos/latest'),
  get: (id) => api.get(`/sos/${encodeURIComponent(id)}`),
  tracking: (token) => api.get(`/sos/tracking/${encodeURIComponent(token)}`),
  remove: (id) => api.delete(`/sos/history/${id}`)
};

export default sosService;
