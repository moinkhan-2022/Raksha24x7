import { Router } from 'express';
import {
  createNotificationController,
  getNotification,
  getNotificationSettings,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  markNotificationsUnread,
  removeAllNotifications,
  removeNotification,
  updateNotificationController,
  updateNotificationSettings
} from '../controllers/notification.controller.js';
import { notificationCreateRateLimit } from '../middleware/notificationRateLimit.middleware.js';

const router = Router();

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/settings', getNotificationSettings);
router.patch('/settings', updateNotificationSettings);
router.get('/:id', getNotification);
router.post('/', notificationCreateRateLimit(), createNotificationController);
router.patch('/read', markNotificationsRead);
router.patch('/unread', markNotificationsUnread);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id', updateNotificationController);
router.delete('/all', removeAllNotifications);
router.delete('/:id', removeNotification);

export default router;
