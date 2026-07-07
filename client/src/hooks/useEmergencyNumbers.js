import { useCallback, useEffect, useMemo, useState } from 'react';
import emergencyNumbersService from '../services/emergencyNumbersService';
import { matchesEmergencySearch, normalizePhone } from '../utils/emergencyNumberUtils';

const defaultFilters = {
  country: 'IN',
  state: 'all',
  city: 'all',
  category: 'all',
  smart: 'all',
  favoritesOnly: false
};

export default function useEmergencyNumbers() {
  const [numbers, setNumbers] = useState([]);
  const [favorites, setFavorites] = useState(emergencyNumbersService.getFavorites);
  const [recents, setRecents] = useState(emergencyNumbersService.getRecents);
  const [filters, setFilters] = useState(defaultFilters);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => (
    emergencyNumbersService
      .getEmergencyNumbers()
      .then(setNumbers)
      .finally(() => setLoading(false))
  ), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredNumbers = useMemo(() => {
    let result = numbers.filter((item) => item.country === filters.country);

    if (filters.category !== 'all') {
      result = result.filter((item) => item.category === filters.category);
    }

    result = result.filter((item) => matchesEmergencySearch(item, query.trim()));

    return [...result].sort((first, second) => (
      (second.priority || 0) - (first.priority || 0)
      || first.service.localeCompare(second.service)
    ));
  }, [filters.category, filters.country, numbers, query]);

  const toggleFavorite = useCallback((record) => {
    const next = emergencyNumbersService.toggleFavorite(record.id);
    setFavorites(next);
    return next.includes(record.id);
  }, []);

  const useRecord = useCallback((record, action = 'viewed') => {
    if (!record) return recents;
    const next = emergencyNumbersService.recordUsage(record, action);
    setRecents(next);
    return next;
  }, [recents]);

  const call = useCallback((record) => {
    useRecord(record, 'called');
    window.location.href = `tel:${normalizePhone(record.number)}`;
    return true;
  }, [useRecord]);

  const shareWhatsApp = useCallback((record) => {
    const message = `${record.service}: ${record.number}`;
    useRecord(record, 'shared');
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }, [useRecord]);

  return {
    numbers,
    filteredNumbers,
    favorites,
    recents,
    filters,
    query,
    loading,
    setFilters,
    setQuery,
    toggleFavorite,
    useRecord,
    call,
    shareWhatsApp,
    refresh
  };
}
