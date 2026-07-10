import NotificationQueue from '../models/notificationQueue.model.js';
import { notificationErrors } from '../errors/notification.errors.js';

export const queueNotification = async ({ notification, payload = {}, scheduledFor = null }) => {
  try {
    return await NotificationQueue.create({
      notificationId: notification._id,
      userId: notification.userId,
      channel: notification.channel,
      queueType: notification.channel,
      status: 'pending',
      scheduledFor,
      payload
    });
  } catch {
    throw notificationErrors.queue();
  }
};

export const markQueueProcessing = (id) => NotificationQueue.findByIdAndUpdate(id, { status: 'processing' }, { new: true });
export const markQueueDelivered = (id) => NotificationQueue.findByIdAndUpdate(id, { status: 'delivered', processedAt: new Date() }, { new: true });
export const markQueueFailed = (id, errorMessage) => NotificationQueue.findByIdAndUpdate(id, { status: 'failed', errorMessage, $inc: { retryCount: 1 } }, { new: true });
