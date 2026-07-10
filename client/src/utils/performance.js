export const now = () => globalThis.performance?.now?.() ?? Date.now();
export const elapsed = (startedAt) => Math.max(0, Math.round(now() - startedAt));

export const scheduleIdle = (callback) => {
  if (window.requestIdleCallback) return window.requestIdleCallback(callback, { timeout: 1000 });
  return window.setTimeout(callback, 16);
};

export const cancelIdle = (id) => {
  if (window.cancelIdleCallback) window.cancelIdleCallback(id);
  else window.clearTimeout(id);
};
