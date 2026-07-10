export const createAbortError = (message = 'Request cancelled') => {
  try { return new DOMException(message, 'AbortError'); } catch { return Object.assign(new Error(message), { name: 'AbortError' }); }
};

export const isAbortError = (error) => error?.name === 'AbortError';

export const mergeAbortSignals = (...signals) => {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signals.filter(Boolean).forEach((signal) => {
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
  return controller.signal;
};

export const fetchWithTimeout = async (url, options = {}, timeoutMs = 25000) => {
  const timeoutController = new AbortController();
  const timer = window.setTimeout(() => timeoutController.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: mergeAbortSignals(options.signal, timeoutController.signal) });
  } finally {
    window.clearTimeout(timer);
  }
};

export const responseBytes = (response, payload) => {
  const headerSize = Number(response.headers.get('content-length'));
  if (Number.isFinite(headerSize) && headerSize >= 0) return headerSize;
  return new Blob([JSON.stringify(payload)]).size;
};
