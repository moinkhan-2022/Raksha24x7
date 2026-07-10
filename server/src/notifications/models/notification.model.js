import mongoose from 'mongoose';
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES
} from '../constants/notification.constants.js';

const priorityRank = { low: 1, normal: 2, high: 3, critical: 4 };

const notificationSchema = new mongoose.Schema(
  {
    notificationId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'general', index: true },
    priority: { type: String, enum: NOTIFICATION_PRIORITIES, default: 'normal', index: true },
    priorityRank: { type: Number, default: 2, index: true },
    status: { type: String, enum: NOTIFICATION_STATUSES, default: 'pending', index: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, default: 'in-app', index: true },
    readAt: { type: Date, default: null, index: true },
    deliveredAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    deduplicationKey: { type: String, default: '', index: true }
  },
  { timestamps: true }
);

notificationSchema.pre('validate', function setNotificationDefaults(next) {
  if (!this.notificationId) this.notificationId = `ntf_${new mongoose.Types.ObjectId().toString()}`;
  this.priorityRank = priorityRank[this.priority] || priorityRank.normal;
  next();
});

notificationSchema.index({ userId: 1, deletedAt: 1, priorityRank: -1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1, deletedAt: 1 });
notificationSchema.index({ title: 'text', message: 'text', type: 'text' });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
