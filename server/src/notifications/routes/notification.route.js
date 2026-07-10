import { Router } from 'express';
import {
  createNotificationController,
  getNotification,
  getNotificationSettings,
  getNotificationAnalytics,
  getUnreadCount,
  exportNotificationHistory,
  listNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  markNotificationsUnread,
  openNotificationController,
  removeAllNotifications,
  removeNotification,
  removeNotifications,
  undoRemoveNotifications,
  updateNotificationController,
  updateNotificationSettings
} from '../controllers/notification.controller.js';
import { notificationCreateRateLimit } from '../middleware/notificationRateLimit.middleware.js';

const router = Router();

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/analytics/summary', getNotificationAnalytics);
router.get('/export/history.csv', exportNotificationHistory);
router.get('/settings', getNotificationSettings);
router.patch('/settings', updateNotificationSettings);
router.post('/', notificationCreateRateLimit(), createNotificationController);
router.patch('/read', markNotificationsRead);
router.patch('/unread', markNotificationsUnread);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/undo-delete', undoRemoveNotifications);
router.patch('/:id/open', openNotificationController);
router.patch('/:id', updateNotificationController);
router.delete('/all', removeAllNotifications);
router.delete('/bulk', removeNotifications);
router.get('/:id', getNotification);
router.delete('/:id', removeNotification);

export default router;
