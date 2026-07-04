const FAVORITES_KEY = 'raksha_nearby_favorites';
const RECENT_KEY = 'raksha_nearby_recent';
const RECENT_LIMIT = 30;

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
  id: service.id || service.placeId,
  osmId: service.osmId || 'N/A',
  placeId: service.placeId,
  name: service.name,
  category: service.categoryLabel || service.category || 'Emergency Service',
  address: service.address || 'N/A',
  city: service.city || 'N/A',
  state: service.state || 'N/A',
  country: service.country || 'N/A',
  postalCode: service.postalCode || 'N/A',
  lat: Number(service.latitude ?? service.lat),
  lng: Number(service.longitude ?? service.lng),
  phone: service.phone || 'N/A',
  website: service.website || 'N/A',
  openingHours: service.openingHours || 'N/A',
  rating: Number.isFinite(Number(service.rating)) ? Number(service.rating) : 'N/A',
  totalReviews: Number.isFinite(Number(service.totalReviews)) ? Number(service.totalReviews) : 'N/A',
  openNow: typeof service.openNow === 'boolean' ? service.openNow : 'N/A',
  categoryId: service.categoryId || 'service',
  filterId: service.filterId || 'all',
  color: service.color || '#64748b',
  markerLabel: service.markerLabel || 'S',
  googleMapsLink: service.googleMapsLink,
  source: service.source || 'OpenStreetMap',
  updatedAt: service.updatedAt || 'N/A',
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
