import User from '../models/user.model.js';
import { signToken } from '../utils/jwt.js';

const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar || user.profileImage,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastLogin: user.lastLogin,
  memberSince: user.memberSince,
  accountStatus: user.accountStatus,
  contacts: user.contacts || []
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
    user.lastLogin = new Date();
    await user.save();
    const token = signToken({ id: user._id, role: user.role });
    return res.status(200).json({ success: true, message: 'Login successful', token, user: safeUser(user) });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProfile = async (req, res) => res.status(200).json({ success: true, user: safeUser(req.user) });
export const updateProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, req.body, { new: true }).select('-password');
  return res.status(200).json({ success: true, message: 'Profile updated', user: safeUser(user) });
};
export const logout = async (req, res) => res.status(200).json({ success: true, message: 'Logged out successfully' });
