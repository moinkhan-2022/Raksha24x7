import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadNearbyCategories, ALL_PARALLEL_CATEGORIES } from '../services/parallelLoader';
import { getAnalyticsSnapshot } from '../services/analytics';
import { getCacheStats } from '../services/cacheService';
import { getCurrentServer, getServerHealth } from '../services/overpassServers';
import { getQueueStats } from '../services/requestQueue';
import { startHealthMonitor } from '../services/healthMonitor';

const initialStatuses = () => Object.fromEntries(ALL_PARALLEL_CATEGORIES.map((category) => [category, 'idle']));

function useNearbyServices({ location, radius, enabled = true, online = true, refreshVersion = 0 }) {
  const [services, setServices] = useState([]);
  const [categoryStatus, setCategoryStatus] = useState(initialStatuses);
  const [categoryErrors, setCategoryErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({});
  const categoryResultsRef = useRef(new Map());
  const loadIdRef = useRef(0);

  useEffect(() => startHealthMonitor(), []);

  const updateServices = useCallback((category, nextServices) => {
    categoryResultsRef.current.set(category, nextServices);
    const unique = new Map();
    categoryResultsRef.current.forEach((items) => items.forEach((service) => unique.set(service.placeId, service)));
    setServices([...unique.values()]);
  }, []);

  useEffect(() => {
    if (!enabled || !location) return undefined;
    const loadId = ++loadIdRef.current;
    const controller = new AbortController();
    categoryResultsRef.current = new Map();
    setServices([]);
    setLoading(true);
    setCategoryStatus(initialStatuses());
    setCategoryErrors({});

    loadNearbyCategories({
      latitude: location.latitude,
      longitude: location.longitude,
      selectedRadius: radius,
      signal: controller.signal,
      online,
      force: refreshVersion > 0,
      onCategory: (category, items) => {
        if (loadId === loadIdRef.current) updateServices(category, items);
      },
      onStatus: (category, status, error) => {
        if (loadId !== loadIdRef.current) return;
        setCategoryStatus((current) => ({ ...current, [category]: status }));
        if (error) setCategoryErrors((current) => ({ ...current, [category]: error }));
      }
    }).finally(() => {
      if (loadId === loadIdRef.current) setLoading(false);
    });

    return () => {
      controller.abort();
      loadIdRef.current += 1;
    };
  }, [enabled, location, online, radius, refreshVersion, updateServices]);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const update = () => setMetrics({
      server: getCurrentServer(), servers: getServerHealth(),
      ...getCacheStats(), ...getQueueStats(), ...getAnalyticsSnapshot()
    });
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const progress = useMemo(() => {
    const complete = Object.values(categoryStatus).filter((status) => ['loaded', 'cached', 'offline', 'unavailable'].includes(status)).length;
    return Math.round((complete / ALL_PARALLEL_CATEGORIES.length) * 100);
  }, [categoryStatus]);

  const warnings = useMemo(() => Object.entries(categoryErrors).map(([category, message]) => `${category}: ${message}`), [categoryErrors]);
  return { services, loading, progress, categoryStatus, warnings, metrics };
}

export default useNearbyServices;
