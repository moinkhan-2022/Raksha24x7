import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import {
  deleteLocationHistory,
  deleteLocationHistoryItem,
  getLatestLocation,
  getLocationHistory,
  saveLocation
} from '../controllers/location.controller.js';

const router = Router();
router.use(authMiddleware);

router.post('/save', saveLocation);
router.get('/latest', getLatestLocation);
router.get('/history', getLocationHistory);
router.delete('/history/:id', deleteLocationHistoryItem);
router.delete('/history', deleteLocationHistory);

export default router;
