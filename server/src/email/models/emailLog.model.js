import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    to: { type: String, required: true, lowercase: true, trim: true, index: true },
    from: { type: String, default: '' },
    subject: { type: String, required: true, trim: true },
    template: { type: String, default: 'custom', index: true },
    provider: { type: String, default: 'dev', index: true },
    status: { type: String, enum: ['queued', 'sent', 'failed', 'skipped'], default: 'queued', index: true },
    messageId: { type: String, default: '' },
    error: { type: String, default: '' },
    retryCount: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

emailLogSchema.index({ userId: 1, createdAt: -1 });
emailLogSchema.index({ status: 1, createdAt: -1 });

const EmailLog = mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema);
export default EmailLog;
