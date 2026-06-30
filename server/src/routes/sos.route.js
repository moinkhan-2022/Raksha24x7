import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import sosRateLimit from '../middleware/sos-rate-limit.middleware.js';
import { deleteSosHistoryItem, getLatestSos, getSosHistory, sendSos } from '../controllers/sos.controller.js';

const router = Router();
router.use(authMiddleware);

router.post('/send', sosRateLimit, sendSos);
router.get('/history', getSosHistory);
router.get('/latest', getLatestSos);
router.delete('/history/:id', deleteSosHistoryItem);

export default router;
