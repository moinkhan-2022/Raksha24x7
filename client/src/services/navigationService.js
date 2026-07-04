const ROUTE_HISTORY_KEY = 'raksha_recent_emergency_routes';
const ROUTE_HISTORY_LIMIT = 10;

export const TRAVEL_MODES = ['DRIVING', 'WALKING', 'BICYCLING'];

const coordinates = (value) => ({
  lat: Number(value?.latitude ?? value?.lat),
  lng: Number(value?.longitude ?? value?.lng)
});

export const buildGoogleMapsNavigationUrl = (origin, destination, travelMode = 'DRIVING') => {
  const to = coordinates(destination);
  const normalizedMode = travelMode || 'DRIVING';
  const mode = normalizedMode === 'BICYCLING' ? 'bicycling' : normalizedMode.toLowerCase();
  // Google Maps uses the device's current location when origin is omitted.
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}&travelmode=${mode}`;
};

export const requestDirections = async (origin, destination, travelMode = 'DRIVING') => {
  const distanceMeters = calculateDistanceMeters(origin, destination);
  if (!Number.isFinite(distanceMeters)) throw new Error('Route coordinates are unavailable.');
  const etaMinutes = estimateEtaMinutes(distanceMeters, travelMode);
  return {
    distanceText: formatDistance(distanceMeters),
    distanceMeters,
    durationText: formatEta(etaMinutes),
    durationSeconds: Number.isFinite(etaMinutes) ? etaMinutes * 60 : null,
    estimated: true
  };
};

export const routeSummary = (directions) => {
  if (directions?.estimated) return directions;
  const leg = directions?.routes?.[0]?.legs?.[0];
  if (!leg) return null;
  return {
    distanceText: leg.distance?.text || 'Distance unavailable',
    distanceMeters: leg.distance?.value ?? null,
    durationText: leg.duration?.text || 'ETA unavailable',
    durationSeconds: leg.duration?.value ?? null,
    startAddress: leg.start_address || '',
    endAddress: leg.end_address || ''
  };
};

const readHistory = () => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ROUTE_HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getRecentRoutes = () => readHistory();

export const saveRecentRoute = (route) => {
  if (typeof window === 'undefined' || !window.localStorage) return readHistory();
  const key = `${route.placeId || route.name}-${route.travelMode}`;
  const previous = readHistory().filter((item) => item.key !== key);
  const next = [{ ...route, key, navigatedAt: Date.now() }, ...previous].slice(0, ROUTE_HISTORY_LIMIT);
  window.localStorage.setItem(ROUTE_HISTORY_KEY, JSON.stringify(next));
  return next;
};

export default { buildGoogleMapsNavigationUrl, requestDirections, routeSummary, getRecentRoutes, saveRecentRoute };
import { calculateDistanceMeters, formatDistance } from '../utils/distance';
import { estimateEtaMinutes, formatEta } from '../utils/etaCalculator';
