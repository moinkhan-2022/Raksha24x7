import { getCategoryRadius } from '../utils/radiusStrategy';
import { isAbortError } from '../utils/requestUtils';
import { getCachedCategoryServices, searchNearbyServices } from './osmApi';
import { refreshInBackground } from './backgroundRefresh';

export const PRIORITY_CATEGORIES = Object.freeze(['hospital', 'police', 'ambulance', 'pharmacy', 'fire']);
export const DEFERRED_CATEGORIES = Object.freeze(['clinic', 'doctors', 'shelter', 'women_safety', 'blood_bank', 'emergency_phone']);
export const ALL_PARALLEL_CATEGORIES = Object.freeze([...PRIORITY_CATEGORIES, ...DEFERRED_CATEGORIES]);

const loadCategory = async ({ category, latitude, longitude, selectedRadius, signal, online, force, priority, onCategory, onStatus }) => {
  const radius = getCategoryRadius(category, selectedRadius);
  const cached = getCachedCategoryServices({ latitude, longitude, radius, category, allowStale: true });
  if (cached) {
    onCategory(category, cached.services, { cached: true, stale: cached.stale });
    onStatus(category, online ? 'refreshing' : 'cached');
  }
  if (!online) {
    if (!cached) onStatus(category, 'offline');
    return { category, cached: Boolean(cached) };
  }

  onStatus(category, cached ? 'refreshing' : 'loading');
  try {
    const refresh = () => searchNearbyServices({ latitude, longitude, radius, categories: [category], force: force || Boolean(cached), signal, priority });
    const result = cached ? await refreshInBackground(refresh) : await refresh();
    onCategory(category, result.services, { cached: false, stale: false });
    onStatus(category, 'loaded');
    return { category, count: result.services.length };
  } catch (error) {
    if (isAbortError(error)) throw error;
    onStatus(category, cached ? 'cached' : 'unavailable', error.message);
    return { category, error };
  }
};

export const loadNearbyCategories = async (options) => {
  const run = (category, priority) => loadCategory({ ...options, category, priority });
  const priorityRequests = PRIORITY_CATEGORIES.map((category) => run(category, 10));
  // Give emergency categories a head start without letting one slow server block all lower priorities.
  await Promise.race([
    Promise.allSettled(priorityRequests),
    new Promise((resolve) => window.setTimeout(resolve, 250))
  ]);
  if (options.signal?.aborted) return Promise.allSettled(priorityRequests);
  const deferredRequests = DEFERRED_CATEGORIES.map((category) => run(category, 1));
  return Promise.allSettled([...priorityRequests, ...deferredRequests]);
};
