import mongoose from 'mongoose';

const emailVerificationTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'used', 'expired', 'revoked'], default: 'pending', index: true },
    used: { type: Boolean, default: false, index: true },
    usedAt: { type: Date, default: null },
    ip: { type: String, default: '' },
    browser: { type: String, default: '' }
  },
  { timestamps: true }
);

emailVerificationTokenSchema.index({ userId: 1, status: 1, createdAt: -1 });

const EmailVerificationToken = mongoose.models.EmailVerificationToken || mongoose.model('EmailVerificationToken', emailVerificationTokenSchema);
export default EmailVerificationToken;
