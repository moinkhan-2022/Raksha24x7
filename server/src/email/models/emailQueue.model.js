import mongoose from 'mongoose';

const emailQueueSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    to: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, required: true, trim: true },
    template: { type: String, default: 'custom', index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'], default: 'pending', index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    lastError: { type: String, default: '' },
    sentAt: { type: Date, default: null }
  },
  { timestamps: true }
);

emailQueueSchema.index({ status: 1, nextAttemptAt: 1 });

const EmailQueue = mongoose.models.EmailQueue || mongoose.model('EmailQueue', emailQueueSchema);
export default EmailQueue;
