import { useCallback, useEffect, useMemo, useState } from 'react';

const SESSION_KEY = 'raksha_emergency_mode';
export const EMERGENCY_CATEGORY_ORDER = ['hospital', 'police', 'fire', 'pharmacy', 'ambulance', 'blood_bank', 'women_safety', 'shelter', 'clinic', 'doctors', 'emergency_phone'];

export const getNearestEmergencyServices = (services) => {
  const result = {};
  EMERGENCY_CATEGORY_ORDER.forEach((categoryId) => {
    result[categoryId] = services
      .filter((service) => service.categoryId === categoryId && Number.isFinite(service.distanceMeters))
      .sort((first, second) => first.distanceMeters - second.distanceMeters)[0] || null;
  });
  return result;
};

function useEmergencyMode(services) {
  const [enabled, setEnabled] = useState(() => {
    try { return window.sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  });

  const setMode = useCallback((value) => {
    setEnabled(value);
    try { window.sessionStorage.setItem(SESSION_KEY, value ? '1' : '0'); } catch { /* storage is optional */ }
  }, []);

  const activate = useCallback(() => setMode(true), [setMode]);
  const deactivate = useCallback(() => setMode(false), [setMode]);
  const toggle = useCallback(() => setMode(!enabled), [enabled, setMode]);

  // The existing SOS module can safely opt in later by dispatching this event.
  useEffect(() => {
    const handleSos = () => activate();
    window.addEventListener('raksha:sos-activated', handleSos);
    window.addEventListener('raksha:emergency-mode', handleSos);
    return () => {
      window.removeEventListener('raksha:sos-activated', handleSos);
      window.removeEventListener('raksha:emergency-mode', handleSos);
    };
  }, [activate]);

  const nearestByCategory = useMemo(() => getNearestEmergencyServices(services), [services]);

  const priorityServices = useMemo(
    () => EMERGENCY_CATEGORY_ORDER.map((categoryId) => nearestByCategory[categoryId]).filter(Boolean),
    [nearestByCategory]
  );
  const priorityIds = useMemo(() => new Set(priorityServices.map((service) => service.placeId)), [priorityServices]);

  return { enabled, activate, deactivate, toggle, nearestByCategory, priorityServices, priorityIds };
}

export default useEmergencyMode;
