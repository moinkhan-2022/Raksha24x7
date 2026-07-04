import { calculateDistanceMeters, formatDistance } from '../utils/distance';
import { buildOverpassQuery, validateSearchRadius } from '../utils/overpassQuery';
import { getCategoryMetadata } from '../utils/serviceCategories';

export const OVERPASS_ENDPOINTS = Object.freeze([
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
]);

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 30000;
const responseCache = new Map();
const NA = 'N/A';

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const isAbortError = (error) => error?.name === 'AbortError';

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
};

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
  const houseAndStreet = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return firstValue(tags['addr:full'], [houseAndStreet, tags['addr:suburb'], tags['addr:city'], tags['addr:state'], tags['addr:postcode']].filter(Boolean).join(', '), tags.description);
};

export const normalizeOsmElement = (element, origin) => {
  const latitude = Number(element.lat ?? element.center?.lat);
  const longitude = Number(element.lon ?? element.center?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const tags = element.tags || {};
  const categoryId = detectCategory(tags);
  const metadata = getCategoryMetadata(categoryId);
  const distance = calculateDistanceMeters(origin, { latitude, longitude });
  const placeId = `osm-${element.type}-${element.id}`;
  const openingHours = firstValue(tags.opening_hours);
  const openNow = openingHours === '24/7' ? true : NA;
  const updatedAt = firstValue(element.timestamp, tags['check_date'], tags['survey:date']);

  return {
    id: placeId,
    osmId: `${element.type}/${element.id}`,
    placeId,
    name: firstValue(tags.name, tags.operator, metadata.label),
    category: metadata.label,
    categoryLabel: metadata.label,
    categoryId: metadata.id,
    filterId: metadata.filterId,
    latitude,
    longitude,
    address: buildAddress(tags),
    city: firstValue(tags['addr:city'], tags['addr:town'], tags['addr:village']),
    state: firstValue(tags['addr:state']),
    country: firstValue(tags['addr:country']),
    postalCode: firstValue(tags['addr:postcode']),
    phone: firstValue(tags.phone, tags['contact:phone'], tags['contact:mobile']),
    website: firstValue(tags.website, tags['contact:website']),
    openingHours,
    isOpen: openNow,
    openNow,
    rating: NA,
    reviewCount: NA,
    totalReviews: NA,
    distance,
    distanceMeters: distance,
    distanceLabel: formatDistance(distance),
    icon: metadata.icon,
    favorite: false,
    source: 'OpenStreetMap',
    updatedAt,
    fetchedAt: Date.now(),
    color: metadata.color,
    markerLabel: metadata.markerLabel,
    googleMapsLink: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
  };
};

const cacheKey = (latitude, longitude, radius, categories) => [
  Number(latitude).toFixed(4), Number(longitude).toFixed(4), radius, [...categories].sort().join(',')
].join(':');

const requestOverpass = async (query, { signal } = {}) => {
  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
    const endpoint = OVERPASS_ENDPOINTS[Math.min(attempt, OVERPASS_ENDPOINTS.length - 1)];
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }),
        signal
      });
      if (!response.ok) throw new Error(`OpenStreetMap service returned ${response.status}.`);
      return await response.json();
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
      if (attempt < MAX_ATTEMPTS - 1) await sleep(350 * (attempt + 1));
    }
  }
  if (isAbortError(lastError)) throw new Error('OpenStreetMap request timed out. Please retry.');
  throw new Error(lastError?.message || 'OpenStreetMap services are temporarily unavailable.');
};

export const searchNearbyServices = async ({ latitude, longitude, radius = 5000, categories, force = false, signal } = {}) => {
  const safeRadius = validateSearchRadius(radius);
  const requested = categories?.length ? categories : [
    'hospital', 'police', 'fire', 'pharmacy', 'ambulance', 'blood_bank',
    'women_safety', 'shelter', 'clinic', 'doctors', 'emergency_phone'
  ];
  const key = cacheKey(latitude, longitude, safeRadius, requested);
  const cached = responseCache.get(key);
  if (!force && cached && Date.now() - cached.savedAt < CACHE_TTL_MS) return cached.value;

  const query = buildOverpassQuery({ latitude, longitude, radius: safeRadius, categories: requested });
  const data = await requestOverpass(query, { signal });
  const origin = { latitude, longitude };
  const unique = new Map();
  (data.elements || []).forEach((element) => {
    const service = normalizeOsmElement(element, origin);
    if (service) unique.set(service.placeId, service);
  });
  const services = [...unique.values()].sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
  const value = { services, warnings: [], source: 'OpenStreetMap', fetchedAt: Date.now() };
  responseCache.set(key, { savedAt: Date.now(), value });
  return value;
};

export const fetchNearbyServices = (latitude, longitude, options = {}) => searchNearbyServices({ latitude, longitude, ...options });
const categoryFetcher = (category) => (latitude, longitude, options = {}) => searchNearbyServices({ latitude, longitude, ...options, categories: [category] });
export const getNearbyHospitals = categoryFetcher('hospital');
export const getNearbyPolice = categoryFetcher('police');
export const getNearbyFire = categoryFetcher('fire');
export const getNearbyPharmacies = categoryFetcher('pharmacy');
export const getNearbyAmbulance = categoryFetcher('ambulance');
export const getNearbyBloodBanks = categoryFetcher('blood_bank');
export const getNearbyWomenSafetyCenters = categoryFetcher('women_safety');
export const getNearbyShelters = categoryFetcher('shelter');
export const getNearbyClinics = categoryFetcher('clinic');
export const getNearbyDoctors = categoryFetcher('doctors');
export const getNearbyEmergencyPhones = categoryFetcher('emergency_phone');
// Descriptive aliases keep the service API explicit for feature callers.
export const getNearbyPoliceStations = getNearbyPolice;
export const getNearbyFireStations = getNearbyFire;
export const getNearbyAmbulanceStations = getNearbyAmbulance;

export const reverseGeocode = async (latitude, longitude, { signal } = {}) => {
  const url = new URL(`${NOMINATIM_ENDPOINT}/reverse`);
  url.search = new URLSearchParams({ format: 'jsonv2', lat: latitude, lon: longitude, addressdetails: 1 }).toString();
  const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) throw new Error('Unable to resolve the current address.');
  const data = await response.json();
  return { displayName: data.display_name || NA, address: data.address || {}, source: 'OpenStreetMap Nominatim' };
};

export const clearOsmCache = () => responseCache.clear();
