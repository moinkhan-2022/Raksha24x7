const CACHE_PREFIX = 'raksha_osm_cache:';
export const CACHE_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map();
const stats = { hits: 0, misses: 0 };

const storageAvailable = () => typeof window !== 'undefined' && Boolean(window.localStorage);
const readStored = (key) => {
  if (!storageAvailable()) return null;
  try { return JSON.parse(window.localStorage.getItem(`${CACHE_PREFIX}${key}`)); } catch { return null; }
};

export const getCacheEntry = (key, { allowStale = false } = {}) => {
  const entry = memoryCache.get(key) || readStored(key);
  if (!entry) { stats.misses += 1; return null; }
  memoryCache.set(key, entry);
  const stale = Date.now() - entry.timestamp >= (entry.ttl || CACHE_TTL_MS);
  if (stale && !allowStale) { stats.misses += 1; return null; }
  stats.hits += 1;
  return { ...entry, stale };
};

export const setCacheEntry = (key, value, ttl = CACHE_TTL_MS) => {
  const entry = { value, timestamp: Date.now(), ttl };
  memoryCache.set(key, entry);
  if (storageAvailable()) {
    try { window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry)); } catch { /* quota errors should not block live data */ }
  }
  return value;
};

export const removeCacheEntry = (key) => {
  memoryCache.delete(key);
  if (storageAvailable()) window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
};

export const getCacheStats = () => ({ ...stats, size: memoryCache.size, hitRate: stats.hits + stats.misses ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100) : 0 });
export const clearMemoryCache = () => memoryCache.clear();

export const readLocalState = (key, fallback = null) => {
  if (!storageAvailable()) return fallback;
  try { return JSON.parse(window.localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};

export const writeLocalState = (key, value) => {
  if (!storageAvailable()) return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* persistence is an enhancement */ }
};
