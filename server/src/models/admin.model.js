import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ADMIN_ROLES = ['super_admin', 'admin', 'moderator', 'support'];

export const ROLE_PERMISSIONS = Object.freeze({
  super_admin: ['*'],
  admin: ['users:manage', 'sos:manage', 'reports:manage', 'emergency_services:manage', 'settings:read', 'profile:manage', 'sessions:manage'],
  moderator: ['reports:review', 'activity:monitor', 'profile:manage', 'sessions:read'],
  support: ['users:read', 'sos:read', 'profile:manage', 'sessions:read']
});

const adminSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ADMIN_ROLES, default: 'support', index: true },
    permissions: { type: [String], default: undefined },
    profilePhoto: { type: String, default: '' },
    phoneNumber: { type: String, default: '', trim: true },
    status: { type: String, enum: ['active', 'inactive', 'disabled', 'suspended'], default: 'active', index: true },
    lastLogin: { type: Date, default: null },
    lastLogout: { type: Date, default: null },
    loginAttempts: { type: Number, default: 0, select: false },
    accountLocked: { type: Boolean, default: false, index: true },
    lockUntil: { type: Date, default: null, select: false },
    twoFactorReady: { type: Boolean, default: false }
  },
  { timestamps: true }
);

adminSchema.pre('validate', function assignPermissions(next) {
  if (!this.permissions?.length) this.permissions = ROLE_PERMISSIONS[this.role] || ROLE_PERMISSIONS.support;
  next();
});

adminSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

adminSchema.methods.comparePassword = async function comparePassword(plainPassword) {
  if (!this.password) return false;
  return bcrypt.compare(plainPassword, this.password);
};

adminSchema.methods.hasPermission = function hasPermission(permission) {
  return this.permissions?.includes('*') || this.permissions?.includes(permission);
};

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
