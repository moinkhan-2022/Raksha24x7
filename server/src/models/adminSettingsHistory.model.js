import mongoose from 'mongoose';

const adminSettingsHistorySchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    module: { type: String, required: true, index: true },
    previousValue: { type: mongoose.Schema.Types.Mixed, default: {} },
    newValue: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: '' },
    browser: { type: String, default: '' },
    userAgent: { type: String, default: '' }
  },
  { timestamps: true }
);

adminSettingsHistorySchema.index({ createdAt: -1 });

const AdminSettingsHistory = mongoose.model('AdminSettingsHistory', adminSettingsHistorySchema);
export default AdminSettingsHistory;
