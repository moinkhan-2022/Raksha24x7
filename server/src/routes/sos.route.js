import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import sosRateLimit from '../middleware/sos-rate-limit.middleware.js';
import {
  deleteSosHistoryItem,
  getLatestSos,
  getSosById,
  getSosHistory,
  getTrackingByToken,
  retrySos,
  sendSos,
  shareLocation,
  startSos,
  stopSos
} from '../controllers/sos.controller.js';

const router = Router();

router.get('/tracking/:token', getTrackingByToken);

router.use(authMiddleware);
router.post('/start', sosRateLimit, startSos);
router.post('/send', sosRateLimit, sendSos);
router.post('/stop', stopSos);
router.post('/share-location', shareLocation);
router.post('/retry', retrySos);
router.get('/history', getSosHistory);
router.get('/latest', getLatestSos);
router.get('/:id', getSosById);
router.delete('/history/:id', deleteSosHistoryItem);

export default router;
