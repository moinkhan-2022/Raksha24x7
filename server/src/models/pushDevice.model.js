import mongoose from 'mongoose';

const notificationAnalyticsSchema = new mongoose.Schema(
  {
    notificationId: { type: String, default: '' },
    type: { type: String, default: 'general' },
    title: { type: String, default: '' },
    status: { type: String, enum: ['queued', 'delivered', 'opened', 'dismissed', 'failed', 'retried'], default: 'queued' },
    actionTaken: { type: String, default: '' },
    retryCount: { type: Number, default: 0 },
    error: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const pushDeviceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceId: { type: String, required: true, trim: true },
    browser: { type: String, default: 'Unknown' },
    os: { type: String, default: 'Unknown' },
    platform: { type: String, default: 'web' },
    appVersion: { type: String, default: '1.0.0' },
    provider: { type: String, enum: ['fcm', 'web-push', 'native'], default: 'fcm' },
    pushToken: { type: String, required: true, select: false },
    tokenHash: { type: String, required: true, index: true },
    permission: { type: String, enum: ['granted', 'denied', 'default', 'unsupported'], default: 'default' },
    tokenStatus: { type: String, enum: ['active', 'expired', 'invalid', 'revoked'], default: 'active', index: true },
    isActive: { type: Boolean, default: true },
    lastActiveAt: { type: Date, default: Date.now },
    lastTokenRefreshAt: { type: Date, default: Date.now },
    analytics: { type: [notificationAnalyticsSchema], default: [] }
  },
  { timestamps: true }
);

pushDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
pushDeviceSchema.index({ userId: 1, isActive: 1 });
pushDeviceSchema.index({ userId: 1, tokenStatus: 1, permission: 1 });

const PushDevice = mongoose.model('PushDevice', pushDeviceSchema);
export default PushDevice;
