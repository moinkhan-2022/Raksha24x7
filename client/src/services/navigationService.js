const ROUTE_HISTORY_KEY = 'raksha_recent_emergency_routes';
const ROUTE_HISTORY_LIMIT = 10;

export const TRAVEL_MODES = ['DRIVING', 'WALKING', 'BICYCLING'];

const coordinates = (value) => ({
  lat: Number(value?.latitude ?? value?.lat),
  lng: Number(value?.longitude ?? value?.lng)
});

export const buildGoogleMapsNavigationUrl = (origin, destination, travelMode = 'DRIVING') => {
  const from = coordinates(origin);
  const to = coordinates(destination);
  const originQuery = Number.isFinite(from.lat) && Number.isFinite(from.lng) ? `&origin=${from.lat},${from.lng}` : '';
  const normalizedMode = travelMode || 'DRIVING';
  const mode = normalizedMode === 'BICYCLING' ? 'bicycling' : normalizedMode.toLowerCase();
  return `https://www.google.com/maps/dir/?api=1${originQuery}&destination=${to.lat},${to.lng}&travelmode=${mode}`;
};

export const requestDirections = (origin, destination, travelMode = 'DRIVING') => new Promise((resolve, reject) => {
  if (!window.google?.maps?.DirectionsService) {
    reject(new Error('Google Directions is unavailable. Check the Maps API configuration.'));
    return;
  }

  const from = coordinates(origin);
  const to = coordinates(destination);
  const mode = window.google.maps.TravelMode?.[travelMode] || travelMode;
  const service = new window.google.maps.DirectionsService();
  service.route(
    { origin: from, destination: to, travelMode: mode, provideRouteAlternatives: false },
    (result, status) => {
      if (status === 'OK' && result?.routes?.[0]?.legs?.[0]) resolve(result);
      else if (status === 'ZERO_RESULTS') reject(new Error(`No ${travelMode.toLowerCase()} route is available for this destination.`));
      else reject(new Error(`Google route request failed (${status || 'unknown error'}).`));
    }
  );
});

export const routeSummary = (directions) => {
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
