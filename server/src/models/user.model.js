import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true }
  },
  { _id: true }
);

const medicalInfoSchema = new mongoose.Schema(
  {
    bloodGroup: { type: String, default: '' },
    allergies: { type: String, default: '' },
    medicalConditions: { type: String, default: '' },
    currentMedications: { type: String, default: '' },
    organDonor: { type: Boolean, default: false }
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    darkMode: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true },
    locationPermission: { type: String, enum: ['granted', 'denied', 'prompt'], default: 'prompt' },
    language: { type: String, default: 'en' }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'], default: 'prefer_not_to_say' },
    dateOfBirth: { type: Date, default: null },
    address: { type: String, default: '' },
    emergencyStatus: { type: String, enum: ['safe', 'alert', 'critical'], default: 'safe' },
    emergencyContacts: {
      type: [emergencyContactSchema],
      validate: {
        validator(value) {
          return value.length <= 5;
        },
        message: 'Maximum 5 emergency contacts are allowed'
      },
      default: []
    },
    medicalInfo: { type: medicalInfoSchema, default: () => ({}) },
    settings: { type: settingsSchema, default: () => ({}) }
  },
  { timestamps: true }
);

userSchema.pre('save', async function preSave(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = async function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
