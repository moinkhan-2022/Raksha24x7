import { scheduleIdle } from '../utils/performance';

export const refreshInBackground = (refresh) => new Promise((resolve, reject) => {
  scheduleIdle(() => Promise.resolve(refresh()).then(resolve, reject));
});
