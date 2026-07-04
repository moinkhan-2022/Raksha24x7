export const ALLOWED_SEARCH_RADII = Object.freeze([500, 1000, 2000, 5000, 10000, 20000]);

export const OVERPASS_CATEGORY_SELECTORS = Object.freeze({
  hospital: ['["amenity"="hospital"]'],
  police: ['["amenity"="police"]'],
  fire: ['["amenity"="fire_station"]'],
  pharmacy: ['["amenity"="pharmacy"]'],
  ambulance: ['["emergency"="ambulance_station"]', '["healthcare"="ambulance_station"]'],
  blood_bank: ['["healthcare"="blood_bank"]', '["amenity"="blood_bank"]', '["name"~"blood bank",i]'],
  women_safety: [
    '["safe_home"]',
    '["women"]',
    '["social_facility"~"shelter|safe_home"]["social_facility:for"~"women",i]',
    '["name"~"women.*(police|help|safety|centre|center|shelter)",i]'
  ],
  shelter: ['["amenity"="shelter"]', '["emergency"="shelter"]'],
  clinic: ['["amenity"="clinic"]', '["healthcare"="clinic"]'],
  doctors: ['["amenity"="doctors"]', '["healthcare"="doctor"]'],
  emergency_phone: ['["emergency"="phone"]']
});

export const validateSearchRadius = (radius = 5000) => {
  const numericRadius = Number(radius);
  if (!ALLOWED_SEARCH_RADII.includes(numericRadius)) {
    throw new RangeError(`Radius must be one of: ${ALLOWED_SEARCH_RADII.join(', ')} metres.`);
  }
  return numericRadius;
};

const validateCoordinate = (value, min, max, label) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < min || numericValue > max) {
    throw new TypeError(`${label} is invalid.`);
  }
  return numericValue;
};

// Overpass nwr covers nodes, ways and relations; ways/relations return a centre.
export const buildOverpassQuery = ({ latitude, longitude, radius = 5000, categories } = {}) => {
  const lat = validateCoordinate(latitude, -90, 90, 'Latitude');
  const lng = validateCoordinate(longitude, -180, 180, 'Longitude');
  const safeRadius = validateSearchRadius(radius);
  const requested = categories?.length ? categories : Object.keys(OVERPASS_CATEGORY_SELECTORS);
  const unknown = requested.filter((category) => !OVERPASS_CATEGORY_SELECTORS[category]);
  if (unknown.length) throw new TypeError(`Unsupported service category: ${unknown.join(', ')}`);

  const selectors = requested.flatMap((category) => OVERPASS_CATEGORY_SELECTORS[category]
    .map((selector) => `nwr${selector}(around:${safeRadius},${lat},${lng});`));

  return `[out:json][timeout:25];\n(\n  ${selectors.join('\n  ')}\n);\nout center tags;`;
};
