const FAVORITES_KEY = 'raksha_nearby_favorites';
const RECENT_KEY = 'raksha_nearby_recent';
const RECENT_LIMIT = 8;

const storageAvailable = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const readItems = (key) => {
  if (!storageAvailable()) return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeItems = (key, items) => {
  if (!storageAvailable()) throw new Error('Local storage is unavailable');
  window.localStorage.setItem(key, JSON.stringify(items));
};

const toStoredService = (service) => ({
  placeId: service.placeId,
  name: service.name,
  category: service.categoryLabel || service.category || 'Emergency Service',
  address: service.address || 'Address unavailable',
  lat: Number(service.latitude ?? service.lat),
  lng: Number(service.longitude ?? service.lng),
  phone: service.phone || null,
  rating: Number.isFinite(service.rating) ? service.rating : null,
  totalReviews: Number.isFinite(service.totalReviews) ? service.totalReviews : null,
  openNow: typeof service.openNow === 'boolean' ? service.openNow : null,
  categoryId: service.categoryId || 'service',
  filterId: service.filterId || 'all',
  color: service.color || '#64748b',
  markerLabel: service.markerLabel || 'S',
  googleMapsLink: service.googleMapsLink,
  fetchedAt: service.fetchedAt || Date.now()
});

export const storedServiceToNearby = (service) => ({
  ...service,
  id: `stored-${service.placeId}`,
  categoryLabel: service.category,
  latitude: Number(service.lat),
  longitude: Number(service.lng),
  fetchedAt: service.fetchedAt || 0
});

export const getFavoriteServices = () => readItems(FAVORITES_KEY);

export const toggleFavoriteService = (service) => {
  const current = getFavoriteServices();
  const exists = current.some((item) => item.placeId === service.placeId);
  const favorites = exists
    ? current.filter((item) => item.placeId !== service.placeId)
    : [{ ...toStoredService(service), savedAt: Date.now() }, ...current];
  writeItems(FAVORITES_KEY, favorites);
  return { favorites, isFavorite: !exists };
};

export const getRecentlyViewedServices = () => readItems(RECENT_KEY);

export const addRecentlyViewedService = (service) => {
  const recent = getRecentlyViewedServices().filter((item) => item.placeId !== service.placeId);
  const next = [{ ...toStoredService(service), viewedAt: Date.now() }, ...recent].slice(0, RECENT_LIMIT);
  writeItems(RECENT_KEY, next);
  return next;
};
