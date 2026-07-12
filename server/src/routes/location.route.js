import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import {
  deleteLocationHistory,
  deleteLocationHistoryItem,
  getLatestLocation,
  getLocationHistory,
  saveLocation
} from '../controllers/location.controller.js';
import { locationSchemas, sosSchemas, validateSchema } from '../middleware/validation.middleware.js';

const router = Router();
router.use(authMiddleware);

router.post('/save', validateSchema({ body: locationSchemas.save, allowUnknownBody: false }), saveLocation);
router.get('/latest', getLatestLocation);
router.get('/history', getLocationHistory);
router.delete('/history/:id', validateSchema({ params: sosSchemas.idParam }), deleteLocationHistoryItem);
router.delete('/history', deleteLocationHistory);

export default router;
