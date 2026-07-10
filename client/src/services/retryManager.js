import { recordRetry } from './analytics';
import { createAbortError } from '../utils/requestUtils';

export const RETRY_DELAYS = Object.freeze([300, 700, 1500]);
const wait = (delay, signal) => new Promise((resolve, reject) => {
  const timer = window.setTimeout(resolve, delay);
  signal?.addEventListener('abort', () => { window.clearTimeout(timer); reject(signal.reason || createAbortError()); }, { once: true });
});

export const withRetry = async (operation, { signal, onRetry, delays = RETRY_DELAYS } = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    if (signal?.aborted) throw signal.reason || new DOMException('Cancelled', 'AbortError');
    try { return await operation(attempt); } catch (error) {
      // Caller cancellation stops immediately; internal request timeouts are retried.
      if (signal?.aborted) throw error;
      lastError = error;
      if (attempt === delays.length) break;
      recordRetry();
      onRetry?.(attempt + 1, error);
      await wait(delays[attempt], signal);
    }
  }
  throw lastError;
};
