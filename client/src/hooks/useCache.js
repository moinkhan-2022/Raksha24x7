import { useCallback } from 'react';
import { getCacheEntry, setCacheEntry } from '../services/cacheService';

export default function useCache() {
  return {
    get: useCallback((key, options) => getCacheEntry(key, options), []),
    set: useCallback((key, value, ttl) => setCacheEntry(key, value, ttl), [])
  };
}
