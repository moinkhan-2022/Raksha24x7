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
import { sosSchemas, validateSchema } from '../middleware/validation.middleware.js';

const router = Router();

router.get('/tracking/:token', getTrackingByToken);

router.use(authMiddleware);
router.post('/start', sosRateLimit, validateSchema({ body: sosSchemas.create, allowUnknownBody: true }), startSos);
router.post('/send', sosRateLimit, validateSchema({ body: sosSchemas.create, allowUnknownBody: true }), sendSos);
router.post('/stop', stopSos);
router.post('/share-location', validateSchema({
  body: {
    sosId: { required: true, type: 'objectId', typeMessage: 'Valid SOS ID is required.' },
    ...sosSchemas.create
  },
  allowUnknownBody: true
}), shareLocation);
router.post('/retry', retrySos);
router.get('/history', getSosHistory);
router.get('/latest', getLatestSos);
router.get('/:id', validateSchema({ params: sosSchemas.idParam }), getSosById);
router.delete('/history/:id', validateSchema({ params: sosSchemas.idParam }), deleteSosHistoryItem);

export default router;
