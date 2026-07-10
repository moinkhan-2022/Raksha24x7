import NotificationLog from '../models/notificationLog.model.js';

export const logNotificationAction = async ({ action, userId, notificationId, result = 'success', errorMessage = '', metadata = {} }) => {
  try {
    await NotificationLog.create({ action, userId, notificationId, result, errorMessage, metadata });
  } catch {
    // Logging must never break the user-facing notification flow.
  }
};
