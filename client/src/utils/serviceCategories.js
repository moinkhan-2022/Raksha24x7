export const NEARBY_SERVICES_RADIUS = 5000;

export const SERVICE_CATEGORIES = Object.freeze([
  { id: 'hospital', filterId: 'hospital', label: 'Hospital', color: '#ef4444', markerLabel: 'H', icon: '\uD83C\uDFE5' },
  { id: 'police', filterId: 'police', label: 'Police Station', color: '#2563eb', markerLabel: 'P', icon: '\uD83D\uDC6E' },
  { id: 'fire', filterId: 'fire', label: 'Fire Station', color: '#f97316', markerLabel: 'F', icon: '\uD83D\uDE92' },
  { id: 'pharmacy', filterId: 'pharmacy', label: 'Pharmacy', color: '#16a34a', markerLabel: 'Rx', icon: '\uD83D\uDC8A' },
  { id: 'ambulance', filterId: 'ambulance', label: 'Ambulance Station', color: '#9333ea', markerLabel: 'A', icon: '\uD83D\uDE91' },
  { id: 'blood_bank', filterId: 'blood_bank', label: 'Blood Bank', color: '#991b1b', markerLabel: 'B', icon: '\uD83E\uDE78' },
  { id: 'women_safety', filterId: 'women_safety', label: 'Women Safety Centre', color: '#ec4899', markerLabel: 'W', icon: '\uD83D\uDEE1\uFE0F' },
  { id: 'shelter', filterId: 'shelter', label: 'Emergency Shelter', color: '#64748b', markerLabel: 'S', icon: '\uD83C\uDFE0' },
  { id: 'clinic', filterId: 'clinic', label: 'Clinic', color: '#38bdf8', markerLabel: 'C', icon: '\uD83E\uDE7A' },
  { id: 'doctors', filterId: 'doctors', label: 'Doctor', color: '#0d9488', markerLabel: 'D', icon: '\uD83D\uDC68\u200D\u2695\uFE0F' },
  { id: 'emergency_phone', filterId: 'emergency_phone', label: 'Emergency Phone', color: '#eab308', markerLabel: '☎', icon: '\uD83D\uDCDE' },
  { id: 'service', filterId: 'all', label: 'Emergency Service', color: '#64748b', markerLabel: 'E', icon: 'map-pin' }
]);

const CATEGORY_BY_ID = new Map(SERVICE_CATEGORIES.map((category) => [category.id, category]));
export const getCategoryMetadata = (categoryId) => CATEGORY_BY_ID.get(categoryId) || CATEGORY_BY_ID.get('service');

export const SERVICE_FILTERS = Object.freeze([
  { id: 'all', label: 'All', color: '#64748b' },
  { id: 'favorites', label: 'Favorites', color: '#f59e0b' },
  ...SERVICE_CATEGORIES.filter(({ id }) => id !== 'service').map(({ filterId, label, color }) => ({ id: filterId, label, color }))
]);
