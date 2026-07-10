import { useEffect, useState } from 'react';
import { getQueueStats } from '../services/requestQueue';

export default function useRequestQueue() {
  const [stats, setStats] = useState(getQueueStats);
  useEffect(() => {
    const timer = window.setInterval(() => setStats(getQueueStats()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return stats;
}
