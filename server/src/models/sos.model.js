import mongoose from 'mongoose';

const deliveryChannelSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['sms', 'email', 'push', 'browser', 'whatsapp'], required: true },
    provider: { type: String, default: 'pending' },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'opened', 'failed', 'retrying', 'cancelled', 'skipped'],
      default: 'queued',
      index: true
    },
    reason: { type: String, default: '' },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    actionTaken: { type: String, default: '' },
    retryCount: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    queuedAt: { type: Date, default: Date.now },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    openedAt: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: null }
  },
  { _id: false }
);

const sosSchema = new mongoose.Schema(
  {
    emergencyId: { type: String, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    emergencyType: { type: String, default: 'sos', trim: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, default: null },
    address: { type: String, default: '' },
    googleMapLink: { type: String, required: true },
    directionsLink: { type: String, default: '' },
    liveTrackingLink: { type: String, default: '' },
    trackingTokenHash: { type: String, default: null, select: false, index: true },
    trackingExpiresAt: { type: Date, default: null, index: true },
    trackingActive: { type: Boolean, default: true, index: true },
    locationUpdates: {
      type: [{
        latitude: Number,
        longitude: Number,
        accuracy: Number,
        timestamp: { type: Date, default: Date.now }
      }],
      default: []
    },
    message: { type: String, required: true },
    batteryLevel: { type: Number, default: null },
    contacts: { type: [String], default: [] },
    contactNotifications: {
      type: [
        {
          contactId: { type: mongoose.Schema.Types.ObjectId },
          name: String,
          relationship: String,
          phone: String,
          email: String,
          channels: [deliveryChannelSchema]
        }
      ],
      default: []
    },
    notificationPlan: {
      contacts: { type: Number, default: 0 },
      queued: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      channels: { type: [String], default: [] }
    },
    deliverySummary: {
      queued: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      retrying: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 }
    },
    statusTimeline: {
      type: [{
        status: String,
        message: String,
        at: { type: Date, default: Date.now }
      }],
      default: []
    },
    status: {
      type: String,
      enum: ['preparing', 'sending', 'active', 'sent', 'failed', 'resolved', 'cancelled'],
      default: 'preparing',
      index: true
    },
    adminReview: {
      reviewed: { type: Boolean, default: false, index: true },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
      notes: { type: String, default: '', trim: true, maxlength: 2000 },
      notesUpdatedAt: { type: Date, default: null },
      notesUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
    },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

sosSchema.pre('validate', function setEmergencyId(next) {
  if (!this.emergencyId) this.emergencyId = `SOS-${Date.now()}-${new mongoose.Types.ObjectId().toString().slice(-6).toUpperCase()}`;
  next();
});

sosSchema.index({ userId: 1, createdAt: -1 });
sosSchema.index({ status: 1, createdAt: -1 });

const Sos = mongoose.models.Sos || mongoose.model('Sos', sosSchema);
export default Sos;
