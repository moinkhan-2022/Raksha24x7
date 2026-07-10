import mongoose from 'mongoose';
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_TYPES
} from '../constants/notification.constants.js';
import { notificationErrors } from '../errors/notification.errors.js';

export const validateNotificationPayload = (payload = {}) => {
  const title = String(payload.title || '').trim();
  const message = String(payload.message || '').trim();
  const type = payload.type || 'general';
  const priority = payload.priority || 'normal';
  const channel = payload.channel || 'in-app';

  if (!title) throw notificationErrors.validation('Notification title is required.');
  if (title.length > 120) throw notificationErrors.validation('Notification title must be 120 characters or less.');
  if (!message) throw notificationErrors.validation('Notification message is required.');
  if (message.length > 1000) throw notificationErrors.validation('Notification message must be 1000 characters or less.');
  if (!NOTIFICATION_TYPES.includes(type)) throw notificationErrors.validation('Invalid notification type.');
  if (!NOTIFICATION_PRIORITIES.includes(priority)) throw notificationErrors.validation('Invalid notification priority.');
  if (!NOTIFICATION_CHANNELS.includes(channel)) throw notificationErrors.validation('Invalid notification channel.');
  if (payload.userId && !mongoose.Types.ObjectId.isValid(payload.userId)) throw notificationErrors.invalidUser();

  return { title, message, type, priority, channel, metadata: payload.metadata || {} };
};
