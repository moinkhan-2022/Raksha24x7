import { NotificationError } from '../errors/notification.errors.js';
import { toPublicNotification } from '../utils/notificationResponse.js';
import {
  countUnread,
  createNotification,
  deleteAllNotifications,
  deleteNotification,
  deleteNotifications,
  exportNotifications,
  getNotificationById,
  getNotifications,
  markAllRead,
  markRead,
  markUnread,
  openNotification,
  undoDeleteNotifications,
  updateNotification
} from '../services/notification.service.js';
import { getOrCreateSettings, updateSettings } from '../services/notificationSettings.service.js';
import { getUserNotificationAnalytics } from '../services/notificationAnalytics.service.js';

const handleNotificationError = (res, error) => {
  if (error instanceof NotificationError) {
    return res.status(error.statusCode).json({ success: false, code: error.code, message: error.message });
  }
  return res.status(500).json({ success: false, message: 'Notification request failed.' });
};

export const listNotifications = async (req, res) => {
  try {
    const result = await getNotifications({ userId: req.user._id, query: req.query });
    return res.status(200).json({
      success: true,
      notifications: result.items.map(toPublicNotification),
      pagination: result.pagination,
      unreadCount: result.unreadCount,
      readCount: result.readCount
    });
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const openNotificationController = async (req, res) => {
  try {
    const notification = await openNotification({ userId: req.user._id, id: req.params.id });
    return res.status(200).json({ success: true, message: 'Notification opened.', notification: toPublicNotification(notification) });
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const getNotification = async (req, res) => {
  try {
    const notification = await getNotificationById({ userId: req.user._id, id: req.params.id });
    return res.status(200).json({ success: true, notification: toPublicNotification(notification) });
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const createNotificationController = async (req, res) => {
  try {
    const notification = await createNotification({ actorId: req.user._id, payload: req.body });
    return res.status(201).json({ success: true, message: 'Notification created.', notification: toPublicNotification(notification) });
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const updateNotificationController = async (req, res) => {
  try {
    const notification = await updateNotification({ userId: req.user._id, id: req.params.id, payload: req.body });
    return res.status(200).json({ success: true, message: 'Notification updated.', notification: toPublicNotification(notification) });
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const markNotificationsRead = async (req, res) => {
  try {
    const result = await markRead({ userId: req.user._id, ids: req.body.ids || req.body.notificationIds || [] });
    return res.status(200).json({ success: true, message: 'Notifications marked as read.', modified: result.modifiedCount });
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const markNotificationsUnread = async (req, res) => {
  try {
    const result = await markUnread({ userId: req.user._id, ids: req.body.ids || req.body.notificationIds || [] });
    return res.status(200).json({ success: true, message: 'Notifications marked as unread.', modified: result.modifiedCount });
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await markAllRead({ userId: req.user._id });
    return res.status(200).json({ success: true, message: 'All notifications marked as read.', modified: result.modifiedCount });
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const removeNotification = async (req, res) => {
  try {
    await deleteNotification({ userId: req.user._id, id: req.params.id });
    return res.status(200).json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const removeNotifications = async (req, res) => {
  try {
    const ids = req.body.ids || req.body.notificationIds || [];
    const result = await deleteNotifications({ userId: req.user._id, ids });
    return res.status(200).json({ success: true, message: 'Notifications deleted.', modified: result.modifiedCount, undoIds: ids });
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const undoRemoveNotifications = async (req, res) => {
  try {
    const ids = req.body.ids || req.body.notificationIds || [];
    const result = await undoDeleteNotifications({ userId: req.user._id, ids });
    return res.status(200).json({ success: true, message: 'Delete undone.', modified: result.modifiedCount });
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const removeAllNotifications = async (req, res) => {
  try {
    const result = await deleteAllNotifications({ userId: req.user._id });
    return res.status(200).json({ success: true, message: 'All notifications deleted.', modified: result.modifiedCount });
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await countUnread(req.user._id);
    return res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const getNotificationAnalytics = async (req, res) => {
  try {
    const analytics = await getUserNotificationAnalytics(req.user._id);
    return res.status(200).json({ success: true, analytics });
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const exportNotificationHistory = async (req, res) => {
  try {
    const items = await exportNotifications({ userId: req.user._id, query: req.query });
    const rows = [
      ['Title', 'Message', 'Type', 'Priority', 'Status', 'Channel', 'Read At', 'Created At'],
      ...items.map((item) => [
        item.title,
        item.message,
        item.type,
        item.priority,
        item.status,
        item.channel,
        item.readAt ? new Date(item.readAt).toISOString() : '',
        item.createdAt ? new Date(item.createdAt).toISOString() : ''
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="raksha-notifications.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return handleNotificationError(res, error);
  }
};

export const getNotificationSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings(req.user._id);
    return res.status(200).json({ success: true, settings });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load notification settings.' });
  }
};

export const updateNotificationSettings = async (req, res) => {
  try {
    const settings = await updateSettings(req.user._id, req.body);
    return res.status(200).json({ success: true, message: 'Notification settings updated.', settings });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not update notification settings.' });
  }
};
