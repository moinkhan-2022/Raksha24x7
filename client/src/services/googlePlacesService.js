import { NEARBY_SERVICES_RADIUS, SERVICE_CATEGORIES } from '../utils/serviceCategories.js';

const statusMessage = (status) => {
  if (status === 'REQUEST_DENIED') {
    return 'Google Places request denied. Confirm that Places API is enabled and the API key restrictions allow this site.';
  }
  if (status === 'OVER_QUERY_LIMIT') return 'Google Places request limit reached. Please try again later.';
  if (status === 'INVALID_REQUEST') return 'Google Places received an invalid nearby-search request.';
  if (status === 'UNKNOWN_ERROR') return 'Google Places had a temporary network error. Please retry.';
  return `Google Places search failed (${status || 'unknown error'}).`;
};

// PlacesService uses callbacks, so these wrappers expose a predictable Promise API.
const runNearbySearch = (placesService, category, location) => new Promise((resolve, reject) => {
  placesService.nearbySearch(
    { location, radius: NEARBY_SERVICES_RADIUS, type: category.placeType },
    (results, status) => {
      if (status === 'OK') return resolve(results || []);
      if (status === 'ZERO_RESULTS') return resolve([]);
      return reject(new Error(statusMessage(status)));
    }
  );
});

const runTextSearch = (placesService, category, location) => new Promise((resolve, reject) => {
  placesService.textSearch(
    { query: category.query, location, radius: NEARBY_SERVICES_RADIUS },
    (results, status) => {
      if (status === 'OK') return resolve(results || []);
      if (status === 'ZERO_RESULTS') return resolve([]);
      return reject(new Error(statusMessage(status)));
    }
  );
});

const normalizePlace = (place, category) => {
  const latitude = place.geometry?.location?.lat();
  const longitude = place.geometry?.location?.lng();
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const googlePlaceId = place.place_id || '';
  const placeId = googlePlaceId || `${category.id}-${latitude}-${longitude}-${place.name}`;
  const query = encodeURIComponent(`${latitude},${longitude}`);
  const placeIdQuery = googlePlaceId ? `&query_place_id=${encodeURIComponent(googlePlaceId)}` : '';
  return {
    id: `${category.id}-${placeId}`,
    placeId,
    name: place.name || category.label,
    categoryId: category.id,
    filterId: category.filterId,
    categoryLabel: category.label,
    color: category.color,
    markerLabel: category.markerLabel,
    latitude,
    longitude,
    rating: typeof place.rating === 'number' ? place.rating : null,
    address: place.vicinity || place.formatted_address || 'Address unavailable',
    googleMapsLink: `https://www.google.com/maps/search/?api=1&query=${query}${placeIdQuery}`
  };
};

export const getNearbyEmergencyServices = async (map, location) => {
  if (!map || !window.google?.maps?.places) {
    throw new Error('Google Places library is unavailable. Confirm that Places API is enabled.');
  }

  const placesService = new window.google.maps.places.PlacesService(map);
  const searches = SERVICE_CATEGORIES.map(async (category) => {
    const results = category.searchType === 'nearby'
      ? await runNearbySearch(placesService, category, location)
      : await runTextSearch(placesService, category, location);
    return results.map((place) => normalizePlace(place, category)).filter(Boolean);
  });

  // A single failed category should not hide valid emergency results from others.
  const settled = await Promise.allSettled(searches);
  const failures = settled.filter((result) => result.status === 'rejected');
  const allServices = settled
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value);

  if (failures.length === settled.length) throw failures[0].reason;

  const seenPlaces = new Set();
  const services = allServices.filter((service) => {
    if (seenPlaces.has(service.placeId)) return false;
    seenPlaces.add(service.placeId);
    return true;
  });

  return {
    services,
    warnings: [...new Set(failures.map((result) => result.reason?.message).filter(Boolean))]
  };
};

export default { getNearbyEmergencyServices };
