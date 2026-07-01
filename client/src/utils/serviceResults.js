export const filterServicesByQuery = (services, searchQuery) => {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return services;
  return services.filter((service) => [
    service.name,
    service.categoryLabel,
    service.categoryId,
    service.filterId,
    service.address,
    service.phone
  ].some((value) => String(value || '').toLowerCase().includes(query)));
};

export const sortServices = (services, sortBy) => [...services].sort((first, second) => {
  if (sortBy === 'rating') return (second.rating ?? -1) - (first.rating ?? -1);
  if (sortBy === 'open') {
    const openDifference = Number(second.openNow === true) - Number(first.openNow === true);
    return openDifference || (first.distanceMeters ?? Infinity) - (second.distanceMeters ?? Infinity);
  }
  if (sortBy === 'name') return first.name.localeCompare(second.name);
  if (sortBy === 'recent') return (second.fetchedAt || 0) - (first.fetchedAt || 0);
  return (first.distanceMeters ?? Infinity) - (second.distanceMeters ?? Infinity);
});
