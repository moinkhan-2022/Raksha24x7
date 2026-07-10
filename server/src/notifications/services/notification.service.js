import mongoose from 'mongoose';
import User from '../../models/user.model.js';
import Notification from '../models/notification.model.js';
import { notificationErrors } from '../errors/notification.errors.js';
import { buildNotificationQuery, createDeduplicationKey, getPagination, getSort } from '../utils/notificationQuery.js';
import { queueNotification } from './notificationQueue.service.js';
import { logNotificationAction } from './notificationLog.service.js';
import { validateNotificationPayload } from '../validators/notification.validator.js';

const ensureUserExists = async (userId) => {
  const exists = await User.exists({ _id: userId, deletedAt: null });
  if (!exists) throw notificationErrors.invalidUser();
};

const canAccess = (notification, userId) => String(notification.userId) === String(userId);

export const createNotification = async ({ actorId, payload }) => {
  const validated = validateNotificationPayload(payload);
  const userId = payload.userId || actorId;
  await ensureUserExists(userId);
  const deduplicationKey = createDeduplicationKey({ userId, ...validated });
  const recentDuplicate = await Notification.findOne({
    userId,
    deduplicationKey,
    deletedAt: null,
    createdAt: { $gte: new Date(Date.now() - 60_000) }
  }).lean();
  if (recentDuplicate) return recentDuplicate;

  const notification = await Notification.create({
    ...validated,
    userId,
    status: validated.channel === 'in-app' ? 'delivered' : 'queued',
    deliveredAt: validated.channel === 'in-app' ? new Date() : null,
    deduplicationKey
  });
  await queueNotification({ notification, payload: validated }).catch(() => null);
  await logNotificationAction({ action: 'create', userId: actorId, notificationId: notification._id });
  return notification;
};

export const getNotifications = async ({ userId, query }) => {
  const { page, limit, skip } = getPagination(query);
  const filter = buildNotificationQuery({ userId, query });
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort(getSort(query)).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, deletedAt: null, readAt: null })
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }, unreadCount };
};

export const getNotificationById = async ({ userId, id }) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw notificationErrors.notFound();
  const notification = await Notification.findOne({ _id: id, deletedAt: null }).lean();
  if (!notification) throw notificationErrors.notFound();
  if (!canAccess(notification, userId)) throw notificationErrors.permissionDenied();
  return notification;
};

export const updateNotification = async ({ userId, id, payload }) => {
  const existing = await getNotificationById({ userId, id });
  const allowed = {};
  ['title', 'message', 'type', 'priority', 'status', 'metadata'].forEach((key) => {
    if (payload[key] !== undefined) allowed[key] = payload[key];
  });
  const notification = await Notification.findByIdAndUpdate(existing._id, allowed, { new: true, runValidators: true });
  await logNotificationAction({ action: 'update', userId, notificationId: notification._id });
  return notification;
};

export const markRead = async ({ userId, ids = [] }) => {
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const result = await Notification.updateMany(
    { _id: { $in: validIds }, userId, deletedAt: null },
    { $set: { readAt: new Date(), status: 'read' } }
  );
  await logNotificationAction({ action: 'mark-read', userId, metadata: { ids: validIds, modified: result.modifiedCount } });
  return result;
};

export const markUnread = async ({ userId, ids = [] }) => {
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const result = await Notification.updateMany(
    { _id: { $in: validIds }, userId, deletedAt: null },
    { $set: { readAt: null, status: 'delivered' } }
  );
  await logNotificationAction({ action: 'mark-unread', userId, metadata: { ids: validIds, modified: result.modifiedCount } });
  return result;
};

export const markAllRead = async ({ userId }) => {
  const result = await Notification.updateMany({ userId, deletedAt: null, readAt: null }, { $set: { readAt: new Date(), status: 'read' } });
  await logNotificationAction({ action: 'mark-all-read', userId, metadata: { modified: result.modifiedCount } });
  return result;
};

export const deleteNotification = async ({ userId, id }) => {
  const existing = await getNotificationById({ userId, id });
  const notification = await Notification.findByIdAndUpdate(existing._id, { deletedAt: new Date() }, { new: true });
  await logNotificationAction({ action: 'delete', userId, notificationId: notification._id });
  return notification;
};

export const deleteAllNotifications = async ({ userId }) => {
  const result = await Notification.updateMany({ userId, deletedAt: null }, { $set: { deletedAt: new Date() } });
  await logNotificationAction({ action: 'delete-all', userId, metadata: { modified: result.modifiedCount } });
  return result;
};

export const countUnread = (userId) => Notification.countDocuments({ userId, deletedAt: null, readAt: null });

export const sendPush = async () => ({ queued: false, message: 'Push delivery is reserved for later Module 13 parts.' });
export const sendEmail = async () => ({ queued: false, message: 'Email delivery is reserved for later Module 13 parts.' });
export const sendSMS = async () => ({ queued: false, message: 'SMS delivery is reserved for later Module 13 parts.' });
