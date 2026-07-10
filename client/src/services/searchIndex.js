const searchableText = (service) => [
  service.name, service.categoryLabel, service.categoryId, service.address,
  service.city, service.state, service.phone, service.openingHours
].filter(Boolean).join(' ').toLowerCase();

export const buildSearchIndex = (services) => services.map((service) => ({ service, text: searchableText(service) }));

export const searchIndex = (index, query) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return index.map((entry) => entry.service);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return index.filter((entry) => tokens.every((token) => entry.text.includes(token))).map((entry) => entry.service);
};
