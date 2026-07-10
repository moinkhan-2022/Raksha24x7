import mongoose from 'mongoose';

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceId: { type: String, required: true, trim: true },
    provider: { type: String, enum: ['fcm', 'web-push', 'native', 'future'], default: 'future' },
    tokenHash: { type: String, required: true, index: true },
    platform: { type: String, default: 'web' },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

deviceTokenSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

const DeviceToken = mongoose.model('DeviceToken', deviceTokenSchema);
export default DeviceToken;
