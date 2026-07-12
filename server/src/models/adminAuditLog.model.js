import mongoose from 'mongoose';

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null, index: true },
    action: { type: String, required: true, index: true },
    status: { type: String, enum: ['success', 'failed'], default: 'success', index: true },
    message: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    browser: { type: String, default: 'Unknown browser' },
    userAgent: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

adminAuditLogSchema.index({ createdAt: -1 });

const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema);
export default AdminAuditLog;
