import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import { signToken } from '../utils/jwt.js';

const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  role: user.role,
  gender: user.gender,
  dateOfBirth: user.dateOfBirth,
  address: user.address,
  emergencyStatus: user.emergencyStatus,
  emergencyContacts: user.emergencyContacts,
  medicalInfo: user.medicalInfo,
  settings: user.settings,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, phone, password });
    const token = signToken({ id: user._id, role: user.role });
    return res.status(201).json({ success: true, message: 'Registered successfully', token, user: safeUser(user) });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const token = signToken({ id: user._id, role: user.role });
    user.password = undefined;
    return res.status(200).json({ success: true, message: 'Login successful', token, user: safeUser(user) });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProfile = async (req, res) => res.status(200).json({ success: true, user: safeUser(req.user) });

export const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');
    return res.status(200).json({ success: true, message: 'Profile updated', user: safeUser(user) });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Update failed' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) return res.status(400).json({ success: false, message: 'All password fields are required' });
    if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    if (newPassword !== confirmPassword) return res.status(400).json({ success: false, message: 'Confirm Password must match Password' });

    const user = await User.findById(req.user._id).select('+password');
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const logout = async (req, res) => res.status(200).json({ success: true, message: 'Logged out successfully' });
