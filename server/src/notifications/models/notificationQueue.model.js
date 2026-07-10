import mongoose from 'mongoose';
import { NOTIFICATION_CHANNELS, QUEUE_STATUSES } from '../constants/notification.constants.js';

const notificationQueueSchema = new mongoose.Schema(
  {
    notificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, default: 'in-app', index: true },
    queueType: { type: String, enum: ['in-app', 'email', 'sms', 'push', 'browser'], default: 'in-app', index: true },
    status: { type: String, enum: QUEUE_STATUSES, default: 'pending', index: true },
    retryCount: { type: Number, default: 0, min: 0 },
    scheduledFor: { type: Date, default: null, index: true },
    processedAt: { type: Date, default: null },
    errorMessage: { type: String, default: '', maxlength: 500 },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

notificationQueueSchema.index({ status: 1, scheduledFor: 1, createdAt: 1 });

const NotificationQueue = mongoose.model('NotificationQueue', notificationQueueSchema);
export default NotificationQueue;
