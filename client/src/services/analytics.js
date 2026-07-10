const state = {
  startedAt: Date.now(), requests: 0, successes: 0, failures: 0, retries: 0,
  bytes: 0, loadTimes: [], categoryTimes: new Map(), cancelled: 0
};

const average = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

export const recordRequest = () => { state.requests += 1; };
export const recordSuccess = ({ duration = 0, bytes = 0, category } = {}) => {
  state.successes += 1;
  state.bytes += bytes;
  state.loadTimes.push(duration);
  if (state.loadTimes.length > 100) state.loadTimes.shift();
  if (category) state.categoryTimes.set(category, [...(state.categoryTimes.get(category) || []), duration].slice(-20));
};
export const recordFailure = () => { state.failures += 1; };
export const recordRetry = () => { state.retries += 1; };
export const recordCancelled = () => { state.cancelled += 1; };

export const getAnalyticsSnapshot = () => {
  const categories = [...state.categoryTimes.entries()].map(([category, values]) => ({ category, average: average(values) })).sort((a, b) => a.average - b.average);
  return {
    requests: state.requests,
    successRate: state.requests ? Math.round((state.successes / state.requests) * 100) : 100,
    averageLoadTime: average(state.loadTimes),
    averageResponseBytes: state.successes ? Math.round(state.bytes / state.successes) : 0,
    averageRetries: state.requests ? Number((state.retries / state.requests).toFixed(2)) : 0,
    cancelled: state.cancelled,
    fastestCategory: categories[0]?.category || 'N/A',
    slowestCategory: categories.at(-1)?.category || 'N/A',
    uptimeMs: Date.now() - state.startedAt
  };
};
