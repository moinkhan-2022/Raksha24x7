import mongoose from 'mongoose';

const adminSessionSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    tokenId: { type: String, required: true, unique: true, index: true },
    loginTime: { type: Date, default: Date.now },
    logoutTime: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },
    device: { type: String, default: 'Unknown device' },
    browser: { type: String, default: 'Unknown browser' },
    operatingSystem: { type: String, default: 'Unknown OS' },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

adminSessionSchema.index({ adminId: 1, isActive: 1, expiresAt: 1 });

const AdminSession = mongoose.model('AdminSession', adminSessionSchema);
export default AdminSession;
