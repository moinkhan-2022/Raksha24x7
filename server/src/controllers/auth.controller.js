import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/user.model.js';
import { signToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from '../utils/email.js';

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
    // temporary debug logs
    // eslint-disable-next-line no-console
    console.log('register req.body:', req.body);

    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password || !req.body.confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(409).json({ success: false, message: 'Email already registered' });

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) return res.status(409).json({ success: false, message: 'Phone number already registered' });

    const user = await User.create({ name, email, phone, password });

    // eslint-disable-next-line no-console
    console.log('created user:', user?._id?.toString());

    const token = signToken({ id: user._id, role: user.role });

    // eslint-disable-next-line no-console
    console.log('jwt created for user:', user?._id?.toString());

    return res.status(201).json({ success: true, message: 'Registered successfully', token, user: safeUser(user) });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('register full error:', error);
    if (error?.code === 11000) {
      if (error?.keyPattern?.email) return res.status(409).json({ success: false, message: 'Email already registered' });
      if (error?.keyPattern?.phone) return res.status(409).json({ success: false, message: 'Phone number already registered' });
      return res.status(409).json({ success: false, message: 'Duplicate data' });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const login = async (req, res) => { try { const { email, password } = req.body; const user = await User.findOne({ email }).select('+password'); if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' }); const ok = await user.comparePassword(password); if (!ok) return res.status(401).json({ success: false, message: 'Invalid email or password' }); user.lastLogin = new Date(); await user.save(); const token = signToken({ id: user._id, role: user.role }); return res.status(200).json({ success: true, message: 'Login successful', token, user: safeUser(user) }); } catch { return res.status(500).json({ success: false, message: 'Server error' }); } };

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpire');
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
      await user.save({ validateBeforeSave: false });

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5176';
      const resetUrl = `${clientUrl}/reset-password/${rawToken}`;
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    }

    return res.status(200).json({ success: true, message: 'If this email exists, a password reset link has been sent.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

    if (!strong.test(password || '')) return res.status(400).json({ success: false, message: 'Weak password' });
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpire: { $gt: new Date() } }).select('+password +resetPasswordToken +resetPasswordExpire');
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProfile = async (req, res) => res.status(200).json({ success: true, user: safeUser(req.user) });
export const updateProfile = async (req, res) => { try { const user = await User.findByIdAndUpdate(req.user._id, req.body, { new: true, runValidators: true }).select('-password'); return res.status(200).json({ success: true, message: 'Profile updated', user: safeUser(user) }); } catch { return res.status(500).json({ success: false, message: 'Server error' }); } };
export const changePassword = async (req, res) => { try { const { currentPassword, newPassword, confirmPassword } = req.body; if (!currentPassword || !newPassword || !confirmPassword) return res.status(400).json({ success: false, message: 'All password fields are required' }); if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' }); if (newPassword !== confirmPassword) return res.status(400).json({ success: false, message: 'Confirm Password must match Password' }); const user = await User.findById(req.user._id).select('+password'); if (!user) return res.status(404).json({ success: false, message: 'User not found' }); const ok = await bcrypt.compare(currentPassword, user.password); if (!ok) return res.status(401).json({ success: false, message: 'Current password is incorrect' }); user.password = newPassword; await user.save(); return res.status(200).json({ success: true, message: 'Password updated successfully' }); } catch { return res.status(500).json({ success: false, message: 'Server error' }); } };
export const logout = async (req, res) => res.status(200).json({ success: true, message: 'Logged out successfully' });
