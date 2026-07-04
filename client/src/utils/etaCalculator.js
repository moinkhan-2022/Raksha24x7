export const TRAVEL_SPEEDS_KMH = {
  DRIVING: 35,
  WALKING: 5,
  BICYCLING: 15
};

export const estimateEtaMinutes = (distanceMeters, travelMode = 'DRIVING', routeDurationSeconds = null) => {
  if (Number.isFinite(routeDurationSeconds) && routeDurationSeconds >= 0) {
    return Math.max(1, Math.round(routeDurationSeconds / 60));
  }
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return null;
  const speed = TRAVEL_SPEEDS_KMH[travelMode] || TRAVEL_SPEEDS_KMH.DRIVING;
  return Math.max(1, Math.round((distanceMeters / 1000 / speed) * 60));
};

export const formatEta = (minutes) => {
  if (!Number.isFinite(minutes)) return 'ETA unavailable';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
};
