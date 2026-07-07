export const EMERGENCY_CATEGORIES = Object.freeze([
  { id: 'police', label: 'Police', icon: '🚓', group: 'police' },
  { id: 'ambulance', label: 'Ambulance', icon: '🚑', group: 'medical' },
  { id: 'fire', label: 'Fire', icon: '🚒', group: 'fire' },
  { id: 'women', label: 'Women Helpline', icon: '👩', group: 'women' },
  { id: 'child', label: 'Child Helpline', icon: '👶', group: 'child' },
  { id: 'cyber', label: 'Cyber Crime', icon: '🛡️', group: 'cyber' },
  { id: 'mental_health', label: 'Mental Health', icon: '🧠', group: 'medical' },
  { id: 'blood_bank', label: 'Blood Bank', icon: '🩸', group: 'medical' },
  { id: 'poison', label: 'Poison Control', icon: '💊', group: 'medical' },
  { id: 'roadside', label: 'Roadside Assistance', icon: '🚗', group: 'roadside' },
  { id: 'disaster', label: 'Disaster Management', icon: '🌊', group: 'disaster' },
  { id: 'electricity', label: 'Electricity Emergency', icon: '⚡', group: 'utilities' },
  { id: 'water', label: 'Water Emergency', icon: '💧', group: 'utilities' },
  { id: 'animal', label: 'Animal Rescue', icon: '🐍', group: 'animal' },
  { id: 'forest', label: 'Forest Department', icon: '🌳', group: 'environment' },
  { id: 'senior', label: 'Senior Citizen Helpline', icon: '📞', group: 'senior' },
  { id: 'hospital', label: 'Hospital Emergency', icon: '🏥', group: 'medical' },
  { id: 'medical_advice', label: 'Medical Advice', icon: '🩺', group: 'medical' },
  { id: 'relief', label: 'Disaster Relief', icon: '🚨', group: 'disaster' },
  { id: 'municipality', label: 'Local Municipality', icon: '📍', group: 'local' }
]);

export const SUPPORTED_COUNTRIES = Object.freeze([
  { code: 'IN', name: 'India', dialCode: '+91' },
  { code: 'US', name: 'USA', dialCode: '+1' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'AU', name: 'Australia', dialCode: '+61' }
]);

const record = (id, service, number, category, country, description, extra = {}) => ({
  id, service, number, category, country, state: 'All States', city: 'All Cities',
  description, availability: 'Available 24×7', lastUpdated: '2026-01-01', source: 'Official public emergency helpline',
  keywords: [], address: '', latitude: null, longitude: null, ...extra
});

export const DEFAULT_EMERGENCY_NUMBERS = Object.freeze([
  record('in-112', 'National Emergency Response', '112', 'police', 'IN', 'Unified emergency response for police, fire and medical assistance.', { keywords: ['national', 'unified', 'sos'], priority: 100 }),
  record('in-100', 'Police Control Room', '100', 'police', 'IN', 'Immediate police assistance and crime reporting.', { keywords: ['crime', 'law', 'security'], priority: 95 }),
  record('in-101', 'Fire Brigade', '101', 'fire', 'IN', 'Fire, rescue and hazardous incident response.', { keywords: ['rescue', 'smoke', 'burn'], priority: 94 }),
  record('in-102', 'National Ambulance Service', '102', 'ambulance', 'IN', 'Ambulance support, including maternal and child transport.', { keywords: ['medical', 'transport', 'pregnancy'], priority: 93 }),
  record('in-108', 'Medical Emergency Service', '108', 'ambulance', 'IN', 'Integrated ambulance and urgent medical response.', { keywords: ['medical', 'accident', 'trauma'], priority: 99 }),
  record('in-1091', 'Women Helpline', '1091', 'women', 'IN', 'Police-supported emergency assistance for women.', { keywords: ['women', 'harassment', 'safety'], priority: 98 }),
  record('in-1098', 'CHILDLINE India', '1098', 'child', 'IN', 'Emergency outreach and protection for children.', { keywords: ['child', 'minor', 'protection'], priority: 97 }),
  record('in-181', 'Women Support Helpline', '181', 'women', 'IN', 'Support, counselling and emergency coordination for women.', { keywords: ['women', 'domestic violence', 'counselling'], priority: 96 }),
  record('in-1930', 'National Cyber Crime Helpline', '1930', 'cyber', 'IN', 'Report financial cyber fraud and online crime quickly.', { keywords: ['fraud', 'online', 'banking', 'cyber'], priority: 92 }),
  record('in-1070', 'Disaster Management Control Room', '1070', 'disaster', 'IN', 'State-level disaster coordination and assistance.', { keywords: ['flood', 'earthquake', 'disaster'], priority: 88 }),
  record('in-1078', 'Road Accident Emergency', '1078', 'roadside', 'IN', 'Emergency assistance and coordination for road accidents.', { keywords: ['road', 'accident', 'highway'], priority: 86 }),
  record('in-1088', 'Mental Health Support', '1088', 'mental_health', 'IN', 'Configurable regional mental-health assistance line; availability may vary.', { availability: 'Regional availability', keywords: ['mental', 'counselling', 'crisis'], priority: 75 }),
  record('in-14567', 'Elderline Senior Citizen Helpline', '14567', 'senior', 'IN', 'Information, guidance and support for senior citizens.', { availability: '08:00–20:00', keywords: ['elderly', 'senior', 'care'] }),
  record('in-104', 'Health Advice Helpline', '104', 'medical_advice', 'IN', 'Public health information and medical guidance in supported states.', { availability: 'Regional availability', keywords: ['doctor', 'advice', 'health'] }),
  record('in-1912', 'Electricity Emergency', '1912', 'electricity', 'IN', 'Electricity supply complaints and electrical emergencies.', { keywords: ['power', 'shock', 'outage'] }),
  record('us-911', 'Emergency Services', '911', 'police', 'US', 'Police, fire and emergency medical response.', { priority: 100, keywords: ['national', 'ambulance', 'fire'] }),
  record('us-988', 'Suicide & Crisis Lifeline', '988', 'mental_health', 'US', 'Confidential mental-health and crisis support.', { priority: 95, keywords: ['crisis', 'suicide', 'mental'] }),
  record('us-poison', 'Poison Control', '1-800-222-1222', 'poison', 'US', 'Urgent poison exposure advice from trained specialists.', { keywords: ['poison', 'medicine', 'chemical'] }),
  record('ca-911', 'Emergency Services', '911', 'police', 'CA', 'Police, fire and emergency medical response.', { priority: 100, keywords: ['national', 'ambulance', 'fire'] }),
  record('ca-988', 'Suicide Crisis Helpline', '988', 'mental_health', 'CA', 'Call or text for immediate suicide crisis support.', { priority: 95, keywords: ['crisis', 'mental'] }),
  record('gb-999', 'Emergency Services', '999', 'police', 'GB', 'Police, fire, ambulance and coastguard emergencies.', { priority: 100, keywords: ['national', 'ambulance', 'fire'] }),
  record('gb-112', 'European Emergency Number', '112', 'police', 'GB', 'Alternative emergency number connecting to UK emergency services.', { priority: 99, keywords: ['national', 'europe'] }),
  record('gb-111', 'NHS Medical Advice', '111', 'medical_advice', 'GB', 'Urgent medical advice when the situation is not life threatening.', { keywords: ['nhs', 'doctor', 'medical'] }),
  record('au-000', 'Emergency Services', '000', 'police', 'AU', 'Police, fire and ambulance emergency response.', { priority: 100, keywords: ['national', 'ambulance', 'fire'] }),
  record('au-112', 'Mobile Emergency Number', '112', 'police', 'AU', 'Emergency access from supported mobile networks.', { priority: 98, keywords: ['mobile', 'national'] }),
  record('au-131126', 'Poisons Information Centre', '13 11 26', 'poison', 'AU', 'Poisoning and medication exposure advice.', { keywords: ['poison', 'medicine', 'chemical'] })
]);

export const categoryById = (id) => EMERGENCY_CATEGORIES.find((category) => category.id === id) || { id, label: id, icon: '📞', group: 'other' };
