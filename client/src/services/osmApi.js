import { calculateDistanceMeters, formatDistance } from '../utils/distance';
import { nearbyCacheKey } from '../utils/cacheKeys';
import { elapsed, now } from '../utils/performance';
import { buildOptimizedCategoryQuery } from '../utils/queryOptimizer';
import { fetchWithTimeout, responseBytes } from '../utils/requestUtils';
import { getCategoryMetadata } from '../utils/serviceCategories';
import { validateSearchRadius } from '../utils/overpassQuery';
import { recordFailure, recordRequest, recordSuccess } from './analytics';
import { getCacheEntry, setCacheEntry } from './cacheService';
import { getHealthiestServer, OVERPASS_SERVERS, recordServerFailure, recordServerSuccess } from './overpassServers';
import { enqueueRequest } from './requestQueue';
import { withRetry } from './retryManager';

export { OVERPASS_SERVERS as OVERPASS_ENDPOINTS };

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org';
const REQUEST_TIMEOUT_MS = 25000;
const NA = 'N/A';
export const OSM_CATEGORIES = Object.freeze([
  'hospital', 'police', 'fire', 'pharmacy', 'ambulance', 'clinic',
  'doctors', 'shelter', 'women_safety', 'blood_bank', 'emergency_phone'
]);

const detectCategory = (tags = {}) => {
  const name = String(tags.name || '').toLowerCase();
  if (tags.emergency === 'phone') return 'emergency_phone';
  if (tags.emergency === 'ambulance_station' || tags.healthcare === 'ambulance_station') return 'ambulance';
  if (tags.healthcare === 'blood_bank' || tags.amenity === 'blood_bank' || name.includes('blood bank')) return 'blood_bank';
  if (/women.*(police|help|safety|centre|center|shelter)/i.test(name) || String(tags['social_facility:for'] || '').includes('women')) return 'women_safety';
  if (tags.amenity === 'hospital') return 'hospital';
  if (tags.amenity === 'police') return 'police';
  if (tags.amenity === 'fire_station') return 'fire';
  if (tags.amenity === 'pharmacy') return 'pharmacy';
  if (tags.amenity === 'clinic' || tags.healthcare === 'clinic') return 'clinic';
  if (tags.amenity === 'doctors' || tags.healthcare === 'doctor') return 'doctors';
  if (tags.amenity === 'shelter' || tags.emergency === 'shelter') return 'shelter';
  return 'service';
};

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim()) || NA;
const buildAddress = (tags = {}) => {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return firstValue(tags['addr:full'], [street, tags['addr:suburb'], tags['addr:city'], tags['addr:state'], tags['addr:postcode']].filter(Boolean).join(', '), tags.description);
};

export const normalizeOsmElement = (element, origin) => {
  const latitude = Number(element.lat ?? element.center?.lat);
  const longitude = Number(element.lon ?? element.center?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const tags = element.tags || {};
  const metadata = getCategoryMetadata(detectCategory(tags));
  const distance = calculateDistanceMeters(origin, { latitude, longitude });
  const placeId = `osm-${element.type}-${element.id}`;
  const openingHours = firstValue(tags.opening_hours);
  const openNow = openingHours === '24/7' ? true : NA;
  return {
    id: placeId, osmId: `${element.type}/${element.id}`, placeId,
    name: firstValue(tags.name, tags.operator, metadata.label),
    category: metadata.label, categoryLabel: metadata.label, categoryId: metadata.id, filterId: metadata.filterId,
    latitude, longitude, address: buildAddress(tags),
    city: firstValue(tags['addr:city'], tags['addr:town'], tags['addr:village']),
    state: firstValue(tags['addr:state']), country: firstValue(tags['addr:country']), postalCode: firstValue(tags['addr:postcode']),
    phone: firstValue(tags.phone, tags['contact:phone'], tags['contact:mobile']),
    website: firstValue(tags.website, tags['contact:website']), openingHours, isOpen: openNow, openNow,
    rating: NA, reviewCount: NA, totalReviews: NA,
    distance, distanceMeters: distance, distanceLabel: formatDistance(distance), icon: metadata.icon, favorite: false,
    source: 'OpenStreetMap', updatedAt: firstValue(element.timestamp, tags['check_date'], tags['survey:date']), fetchedAt: Date.now(),
    color: metadata.color, markerLabel: metadata.markerLabel,
    googleMapsLink: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
  };
};

const normalizePayload = (data, origin) => {
  const unique = new Map();
  (data.elements || []).forEach((element) => {
    const service = normalizeOsmElement(element, origin);
    if (service) unique.set(service.placeId, service);
  });
  return [...unique.values()].sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
};

export const getCachedCategoryServices = ({ latitude, longitude, radius, category, allowStale = true }) => {
  const key = nearbyCacheKey({ latitude, longitude, radius, category });
  const entry = getCacheEntry(key, { allowStale });
  return entry ? { ...entry.value, stale: entry.stale, fromCache: true } : null;
};

const fetchCategory = async ({ latitude, longitude, radius, category, force = false, signal, priority = 0 }) => {
  const safeRadius = validateSearchRadius(radius);
  const key = nearbyCacheKey({ latitude, longitude, radius: safeRadius, category });
  const cached = getCacheEntry(key);
  if (!force && cached) return { ...cached.value, fromCache: true, stale: false };

  return enqueueRequest(key, () => withRetry(async () => {
    const server = getHealthiestServer();
    const startedAt = now();
    recordRequest();
    try {
      const query = buildOptimizedCategoryQuery({ latitude, longitude, radius: safeRadius, category });
      const response = await fetchWithTimeout(server.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' },
        body: new URLSearchParams({ data: query }),
        signal
      }, REQUEST_TIMEOUT_MS);
      if (!response.ok) throw new Error(`OpenStreetMap server returned ${response.status}.`);
      const data = await response.json();
      const duration = elapsed(startedAt);
      recordServerSuccess(server.url, duration);
      const services = normalizePayload(data, { latitude, longitude });
      const value = { services, category, radius: safeRadius, server: server.url, fetchedAt: Date.now() };
      setCacheEntry(key, value);
      recordSuccess({ duration, bytes: responseBytes(response, data), category });
      return { ...value, fromCache: false, stale: false };
    } catch (error) {
      if (!signal?.aborted) {
        recordServerFailure(server.url);
        recordFailure();
      }
      throw error;
    }
  }, { signal }), { signal, priority });
};

export const searchNearbyServices = async ({ latitude, longitude, radius = 5000, categories = OSM_CATEGORIES, force = false, signal, priority = 0 } = {}) => {
  const results = await Promise.allSettled(categories.map((category, index) => fetchCategory({
    latitude, longitude, radius, category, force, signal, priority: priority || categories.length - index
  })));
  const services = new Map();
  const warnings = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') result.value.services.forEach((service) => services.set(service.placeId, service));
    else if (result.reason?.name !== 'AbortError') warnings.push(`${categories[index]} unavailable.`);
  });
  return { services: [...services.values()], warnings, source: 'OpenStreetMap', fetchedAt: Date.now() };
};

export const fetchNearbyServices = (latitude, longitude, options = {}) => searchNearbyServices({ latitude, longitude, ...options });
const categoryFetcher = (category) => (latitude, longitude, options = {}) => fetchCategory({ latitude, longitude, radius: options.radius || 5000, category, ...options });
export const getNearbyHospitals = categoryFetcher('hospital');
export const getNearbyPoliceStations = categoryFetcher('police');
export const getNearbyFireStations = categoryFetcher('fire');
export const getNearbyPharmacies = categoryFetcher('pharmacy');
export const getNearbyAmbulanceStations = categoryFetcher('ambulance');
export const getNearbyBloodBanks = categoryFetcher('blood_bank');
export const getNearbyWomenSafetyCenters = categoryFetcher('women_safety');
export const getNearbyShelters = categoryFetcher('shelter');
export const getNearbyClinics = categoryFetcher('clinic');
export const getNearbyDoctors = categoryFetcher('doctors');
export const getNearbyEmergencyPhones = categoryFetcher('emergency_phone');
export const getNearbyPolice = getNearbyPoliceStations;
export const getNearbyFire = getNearbyFireStations;
export const getNearbyAmbulance = getNearbyAmbulanceStations;

export const reverseGeocode = async (latitude, longitude, { signal } = {}) => {
  const url = new URL(`${NOMINATIM_ENDPOINT}/reverse`);
  url.search = new URLSearchParams({ format: 'jsonv2', lat: latitude, lon: longitude, addressdetails: 1 }).toString();
  const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) throw new Error('Unable to resolve the current address.');
  const data = await response.json();
  return { displayName: data.display_name || NA, address: data.address || {}, source: 'OpenStreetMap Nominatim' };
};
