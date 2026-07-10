import { createAbortError } from '../utils/requestUtils';
import { recordCancelled } from './analytics';

const MAX_CONCURRENT = 4;
const pending = [];
const inFlight = new Map();
let activeCount = 0;

const drain = () => {
  while (activeCount < MAX_CONCURRENT && pending.length) {
    const item = pending.shift();
    if (item.signal?.aborted) { item.reject(createAbortError()); continue; }
    activeCount += 1;
    item.task()
      .then(item.resolve, item.reject)
      .finally(() => {
        activeCount -= 1;
        inFlight.delete(item.key);
        item.signal?.removeEventListener('abort', item.abortHandler);
        drain();
      });
  }
};

export const enqueueRequest = (key, task, { signal, priority = 0 } = {}) => {
  if (inFlight.has(key)) return inFlight.get(key);
  const promise = new Promise((resolve, reject) => {
    const item = { key, task, signal, priority, resolve, reject };
    pending.push(item);
    pending.sort((first, second) => second.priority - first.priority);
    item.abortHandler = () => {
      const index = pending.indexOf(item);
      if (index >= 0) {
        pending.splice(index, 1);
        inFlight.delete(key);
        recordCancelled();
        reject(createAbortError());
      } else {
        recordCancelled();
      }
    };
    signal?.addEventListener('abort', item.abortHandler, { once: true });
    drain();
  });
  inFlight.set(key, promise);
  return promise;
};

export const getQueueStats = () => ({ activeRequests: activeCount, queuedRequests: pending.length, deduplicatedRequests: inFlight.size });

export const cancelQueuedRequests = () => {
  pending.splice(0).forEach((item) => item.reject(createAbortError()));
  inFlight.clear();
};
