import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  relationship: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  isPrimary: { type: Boolean, default: false }
}, { timestamps: true });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    password: { type: String, minlength: 8, select: false },
    authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
    googleId: { type: String, unique: true, sparse: true, default: null, select: false },
    passwordSetupRequired: { type: Boolean, default: false },
    profileCompleted: { type: Boolean, default: false },
    avatar: { type: String, default: '' },
    profileImage: { type: String, default: '' },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say', ''], default: '' },
    bloodGroup: { type: String, default: '', trim: true },
    medicalNotes: { type: String, default: '', trim: true, maxlength: 1000 },
    role: { type: String, enum: ['user', 'admin', 'ADMIN', 'moderator', 'MODERATOR'], default: 'user' },
    lastLogin: { type: Date, default: Date.now },
    memberSince: { type: Date, default: Date.now },
    accountStatus: { type: String, enum: ['active', 'inactive', 'blocked', 'suspended', 'banned'], default: 'active' },
    emailVerificationStatus: { type: String, enum: ['pending', 'verified'], default: 'pending' },
    isEmailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    emailVerificationToken: { type: String, default: null, select: false },
    emailVerificationExpire: { type: Date, default: null, select: false },
    emailVerificationLastSentAt: { type: Date, default: null, select: false },
    passwordChangedAt: { type: Date, default: null },
    passwordResetHistory: {
      type: [{
        requestedAt: Date,
        completedAt: Date,
        ip: String,
        userAgent: String
      }],
      default: [],
      select: false
    },
    failedResetAttempts: { type: Number, default: 0, select: false },
    passwordResetRequestCount: { type: Number, default: 0, select: false },
    passwordResetWindowStart: { type: Date, default: null, select: false },
    adminNotes: { type: String, default: '', trim: true, maxlength: 1000 },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    contacts: {
      type: [contactSchema],
      validate: { validator: (v) => v.length <= 5, message: 'Maximum 5 contacts are allowed' },
      default: []
    },
    resetPasswordToken: { type: String, default: null, select: false },
    resetPasswordExpire: { type: Date, default: null, select: false }
  },
  { timestamps: true }
);

userSchema.pre('save', async function preSave(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = async function comparePassword(plainPassword) {
  if (!this.password) return false;
  return bcrypt.compare(plainPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
