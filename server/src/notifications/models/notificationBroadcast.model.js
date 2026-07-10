import mongoose from 'mongoose';

const notificationBroadcastSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    type: { type: String, default: 'system', index: true },
    priority: { type: String, default: 'normal', index: true },
    target: {
      users: { type: [mongoose.Schema.Types.ObjectId], default: [] },
      cities: { type: [String], default: [] },
      states: { type: [String], default: [] },
      countries: { type: [String], default: [] },
      roles: { type: [String], default: [] }
    },
    status: { type: String, enum: ['draft', 'scheduled', 'processing', 'sent', 'cancelled', 'failed'], default: 'draft', index: true },
    scheduledFor: { type: Date, default: null, index: true },
    sentAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

notificationBroadcastSchema.index({ status: 1, scheduledFor: 1 });

const NotificationBroadcast = mongoose.models.NotificationBroadcast || mongoose.model('NotificationBroadcast', notificationBroadcastSchema);
export default NotificationBroadcast;
