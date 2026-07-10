import { OVERPASS_SERVERS, recordServerFailure, recordServerSuccess } from './overpassServers';
import { elapsed, now } from '../utils/performance';
import { fetchWithTimeout } from '../utils/requestUtils';

const HEALTH_INTERVAL_MS = 3 * 60 * 1000;
const HEALTH_QUERY = '[out:json][timeout:5];node(0,0,0,0);out 1;';
let timer = null;

export const checkServerHealth = async (url) => {
  const startedAt = now();
  try {
    const endpoint = `${url}?data=${encodeURIComponent(HEALTH_QUERY)}`;
    const response = await fetchWithTimeout(endpoint, { headers: { Accept: 'application/json' } }, 8000);
    if (!response.ok) throw new Error(String(response.status));
    recordServerSuccess(url, elapsed(startedAt));
    return true;
  } catch {
    recordServerFailure(url);
    return false;
  }
};

const checkAll = () => Promise.allSettled(OVERPASS_SERVERS.map(checkServerHealth));
export const startHealthMonitor = () => {
  if (timer) return () => {};
  timer = window.setInterval(checkAll, HEALTH_INTERVAL_MS);
  return () => { window.clearInterval(timer); timer = null; };
};
