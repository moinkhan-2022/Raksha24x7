import { DEFAULT_EMERGENCY_NUMBERS } from '../data/emergencyNumbers';

const KEYS = Object.freeze({
  favorites: 'raksha_emergency_favorites',
  recents: 'raksha_emergency_recents'
});

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const fetchSupabaseNumbers = async () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key || !navigator.onLine) return [];

  const response = await fetch(`${url}/rest/v1/emergency_numbers?select=*&active=eq.true`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });

  if (!response.ok) return [];
  return response.json();
};

export const getEmergencyNumbers = async () => {
  let remote = [];
  try {
    remote = await fetchSupabaseNumbers();
  } catch {
    remote = [];
  }

  return [...new Map([...DEFAULT_EMERGENCY_NUMBERS, ...remote].map((record) => [record.id, record])).values()];
};

export const getFavorites = () => read(KEYS.favorites, []);

export const toggleFavorite = (id) => {
  const current = getFavorites();
  const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
  write(KEYS.favorites, next);
  return next;
};

export const getRecents = () => read(KEYS.recents, []);

export const recordUsage = (record, action) => {
  const current = getRecents().filter((item) => !(item.numberId === record.id && item.action === action));
  const next = [{
    id: `${Date.now()}-${record.id}-${action}`,
    numberId: record.id,
    service: record.service,
    number: record.number,
    action,
    timestamp: Date.now()
  }, ...current].slice(0, 20);

  write(KEYS.recents, next);
  return next;
};

export default {
  getEmergencyNumbers,
  getFavorites,
  toggleFavorite,
  getRecents,
  recordUsage
};
