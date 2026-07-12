import { Router } from 'express';
import { getHealthSnapshot, getMetricsSnapshot } from '../services/monitoring.service.js';
import { logError } from '../config/logger.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const health = await getHealthSnapshot();
    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status === 'healthy',
      ...health
    });
  } catch (error) {
    logError(error, { requestId: req.requestId, path: req.originalUrl });
    res.status(503).json({
      success: false,
      status: 'degraded',
      database: 'unavailable',
      uptime: Math.round(process.uptime()),
      currentTime: new Date().toISOString(),
      requestId: req.requestId
    });
  }
});

router.get('/metrics', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    metrics: getMetricsSnapshot(),
    requestId: req.requestId
  });
});

export default router;
