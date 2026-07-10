import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import foundationNotificationRoutes from '../notifications/routes/notification.route.js';
import {
  listDevices,
  registerDevice,
  removeCurrentDevice,
  removeDevice,
  broadcastPushNotification,
  sendPushToCurrentUser,
  sendPushToManyUsers,
  sendTestNotification,
  sendTopicPushNotification,
  trackNotificationAnalytics
} from '../controllers/notification.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/devices', listDevices);
router.post('/devices/register', registerDevice);
router.post('/devices/unregister', removeCurrentDevice);
router.delete('/devices/:deviceId', removeDevice);
router.post('/analytics', trackNotificationAnalytics);
router.post('/test', sendTestNotification);
router.post('/push/user', sendPushToCurrentUser);
router.post('/push/multiple', sendPushToManyUsers);
router.post('/push/broadcast', broadcastPushNotification);
router.post('/push/topic', sendTopicPushNotification);
router.use('/', foundationNotificationRoutes);

export default router;
