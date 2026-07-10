import { buildOverpassQuery } from './overpassQuery';

// `out center tags` requests only coordinates and tags needed by cards and markers.
export const buildOptimizedCategoryQuery = ({ latitude, longitude, radius, category }) => buildOverpassQuery({
  latitude,
  longitude,
  radius,
  categories: [category]
});
