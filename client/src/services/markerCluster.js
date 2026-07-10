const cellSizeForZoom = (zoom) => {
  if (zoom >= 16) return 0;
  if (zoom >= 14) return 0.006;
  if (zoom >= 12) return 0.018;
  return 0.05;
};

export const clusterServices = (services, zoom = 14) => {
  const cellSize = cellSizeForZoom(zoom);
  if (!cellSize || services.length < 30) return services.map((service) => ({ type: 'service', id: service.placeId, service }));
  const groups = new Map();
  services.forEach((service) => {
    const key = `${Math.round(service.latitude / cellSize)}:${Math.round(service.longitude / cellSize)}`;
    groups.set(key, [...(groups.get(key) || []), service]);
  });
  return [...groups.entries()].map(([key, members]) => members.length === 1
    ? { type: 'service', id: members[0].placeId, service: members[0] }
    : {
      type: 'cluster', id: `cluster-${key}`, count: members.length, services: members,
      latitude: members.reduce((sum, item) => sum + item.latitude, 0) / members.length,
      longitude: members.reduce((sum, item) => sum + item.longitude, 0) / members.length
    });
};
