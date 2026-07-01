const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees) => degrees * (Math.PI / 180);

const coordinates = (value) => ({
  latitude: Number(value?.latitude ?? value?.lat),
  longitude: Number(value?.longitude ?? value?.lng)
});

export const calculateDistanceMeters = (origin, destination) => {
  const from = coordinates(origin);
  const to = coordinates(destination);
  if (![from.latitude, from.longitude, to.latitude, to.longitude].every(Number.isFinite)) return null;

  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  // Haversine calculates the shortest distance over the earth's surface.
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_METERS * angularDistance;
};

export const formatDistance = (distanceMeters) => {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return 'Distance unavailable';
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10000 ? 1 : 0)} km`;
};

export const getServiceDistance = (userLocation, service) => {
  const distanceMeters = calculateDistanceMeters(userLocation, service);
  return { distanceMeters, distanceLabel: formatDistance(distanceMeters) };
};
