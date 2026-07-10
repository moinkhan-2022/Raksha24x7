const roundCoordinate = (value) => Number(value).toFixed(3);

export const nearbyCacheKey = ({ latitude, longitude, radius, category }) => [
  'nearby', roundCoordinate(latitude), roundCoordinate(longitude), Number(radius), category
].join(':');

export const environmentCacheKey = (latitude, longitude) => `environment:${Number(latitude).toFixed(2)}:${Number(longitude).toFixed(2)}`;

export const STORAGE_KEYS = Object.freeze({
  lastSearch: 'raksha_nearby_last_search',
  recentSearches: 'raksha_nearby_recent_searches',
  mapPosition: 'raksha_nearby_map_position',
  environment: 'raksha_nearby_environment'
});
