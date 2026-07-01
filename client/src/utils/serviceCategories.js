export const NEARBY_SERVICES_RADIUS = 5000;

export const SERVICE_CATEGORIES = [
  {
    id: 'hospital',
    filterId: 'hospital',
    label: 'Hospital',
    searchType: 'nearby',
    placeType: 'hospital',
    color: '#ef4444',
    markerLabel: 'H'
  },
  {
    id: 'police',
    filterId: 'police',
    label: 'Police Station',
    searchType: 'nearby',
    placeType: 'police',
    color: '#2563eb',
    markerLabel: 'P'
  },
  {
    id: 'fire',
    filterId: 'fire',
    label: 'Fire Station',
    searchType: 'nearby',
    placeType: 'fire_station',
    color: '#f97316',
    markerLabel: 'F'
  },
  {
    id: 'pharmacy',
    filterId: 'pharmacy',
    label: 'Pharmacy',
    searchType: 'nearby',
    placeType: 'pharmacy',
    color: '#16a34a',
    markerLabel: 'Rx'
  },
  {
    id: 'ambulance',
    filterId: 'ambulance',
    label: 'Ambulance Service',
    searchType: 'text',
    query: 'ambulance service near me',
    color: '#ec4899',
    markerLabel: 'A'
  },
  {
    id: 'blood_bank',
    filterId: 'blood_bank',
    label: 'Blood Bank',
    searchType: 'text',
    query: 'blood bank near me',
    color: '#991b1b',
    markerLabel: 'B'
  },
  {
    id: 'women_police',
    filterId: 'women_safety',
    label: 'Women Police Station',
    searchType: 'text',
    query: 'women police station near me',
    color: '#9333ea',
    markerLabel: 'W'
  },
  {
    id: 'women_help',
    filterId: 'women_safety',
    label: 'Women Help Center',
    searchType: 'text',
    query: 'women help center near me',
    color: '#7e22ce',
    markerLabel: 'W'
  }
];

// Women-focused searches share one filter while retaining distinct labels.
export const SERVICE_FILTERS = [
  { id: 'all', label: 'All', color: '#64748b' },
  { id: 'hospital', label: 'Hospitals', color: '#ef4444' },
  { id: 'police', label: 'Police', color: '#2563eb' },
  { id: 'fire', label: 'Fire', color: '#f97316' },
  { id: 'pharmacy', label: 'Pharmacy', color: '#16a34a' },
  { id: 'ambulance', label: 'Ambulance', color: '#ec4899' },
  { id: 'blood_bank', label: 'Blood Bank', color: '#991b1b' },
  { id: 'women_safety', label: 'Women Safety', color: '#9333ea' }
];
