export const OVERPASS_SERVERS = Object.freeze([
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
]);

const serverState = new Map(OVERPASS_SERVERS.map((url) => [url, {
  url, status: 'healthy', successCount: 0, failureCount: 0, averageLatency: 0,
  responseTime: null, lastChecked: null, lastSuccessfulResponse: null
}]));

const score = (server) => {
  const statusPenalty = server.status === 'offline' ? 1_000_000 : server.status === 'slow' ? 10000 : 0;
  const reliabilityPenalty = server.failureCount * 750 - server.successCount * 20;
  return statusPenalty + (server.averageLatency || 2500) + reliabilityPenalty;
};

export const getHealthiestServer = (excluded = new Set()) => [...serverState.values()]
  .filter((server) => !excluded.has(server.url))
  .sort((first, second) => score(first) - score(second))[0] || serverState.get(OVERPASS_SERVERS[0]);

export const recordServerSuccess = (url, latency) => {
  const server = serverState.get(url);
  if (!server) return;
  server.successCount += 1;
  server.responseTime = Math.round(latency);
  server.averageLatency = server.averageLatency ? Math.round((server.averageLatency * 0.7) + (latency * 0.3)) : Math.round(latency);
  server.status = server.averageLatency > 8000 ? 'slow' : 'healthy';
  server.lastChecked = Date.now();
  server.lastSuccessfulResponse = Date.now();
};

export const recordServerFailure = (url) => {
  const server = serverState.get(url);
  if (!server) return;
  server.failureCount += 1;
  server.status = server.failureCount >= 3 && server.failureCount > server.successCount ? 'offline' : 'slow';
  server.lastChecked = Date.now();
};

export const getServerHealth = () => [...serverState.values()].map((server) => ({
  ...server,
  healthy: server.status === 'healthy',
  successRate: server.successCount + server.failureCount
    ? Math.round((server.successCount / (server.successCount + server.failureCount)) * 100)
    : 100
}));
export const getCurrentServer = () => getHealthiestServer().url;
