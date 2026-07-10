import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    notificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification', default: null, index: true },
    result: { type: String, enum: ['success', 'failed'], default: 'success', index: true },
    errorMessage: { type: String, default: '', maxlength: 500 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

notificationLogSchema.index({ createdAt: -1 });

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);
export default NotificationLog;
