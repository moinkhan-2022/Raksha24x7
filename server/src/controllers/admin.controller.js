import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Sos from '../models/sos.model.js';
import PushDevice from '../models/pushDevice.model.js';
import { isAdminRole } from '../middleware/admin.middleware.js';

const safeAdmin = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: String(user.role || '').toUpperCase(),
  avatar: user.avatar,
  profileImage: user.profileImage,
  lastLogin: user.lastLogin,
  accountStatus: user.accountStatus,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const signAdminToken = (user, remember = false) => jwt.sign(
  { id: user._id, role: 'admin', scope: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: remember ? '30d' : '8h' }
);

const nonAdminQuery = { role: { $nin: ['admin', 'ADMIN'] } };

export const adminLogin = async (req, res) => {
  try {
    const { email, password, remember } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'Admin email and password are required.' });

    const admin = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
    if (!admin || !isAdminRole(admin.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Admin account required.' });
    }
    const valid = admin.password ? await bcrypt.compare(password, admin.password) : false;
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    if (admin.accountStatus === 'suspended') return res.status(403).json({ success: false, message: 'Admin account is suspended.' });

    admin.lastLogin = new Date();
    await admin.save();
    const token = signAdminToken(admin, Boolean(remember));
    const expiresAt = new Date(Date.now() + (remember ? 30 * 24 * 60 * 60_000 : 8 * 60 * 60_000)).toISOString();

    return res.status(200).json({
      success: true,
      message: 'Admin login successful.',
      token,
      expiresAt,
      admin: safeAdmin(admin)
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Admin login failed.' });
  }
};

export const getAdminProfile = async (req, res) => {
  return res.status(200).json({ success: true, admin: safeAdmin(req.admin) });
};

export const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      users,
      sosRequests,
      installedPwas,
      devices,
      recentUsers,
      recentSos
    ] = await Promise.all([
      User.countDocuments(nonAdminQuery),
      User.countDocuments({ ...nonAdminQuery, accountStatus: 'active' }),
      User.countDocuments({ ...nonAdminQuery, isEmailVerified: true }),
      User.find(nonAdminQuery).select('contacts').lean(),
      Sos.countDocuments(),
      PushDevice.countDocuments({ platform: 'pwa', isActive: true }),
      PushDevice.find({ isActive: true }).select('analytics').lean(),
      User.find(nonAdminQuery).sort({ createdAt: -1 }).limit(6).select('name email createdAt').lean(),
      Sos.find().sort({ createdAt: -1 }).limit(6).select('status createdAt googleMapLink').populate('userId', 'name email').lean()
    ]);

    const emergencyContacts = users.reduce((sum, user) => sum + (user.contacts?.length || 0), 0);
    const notificationCount = devices.reduce((sum, device) => sum + (device.analytics?.length || 0), 0);
    const recentActivity = [
      ...recentUsers.map((user) => ({
        id: `user-${user._id}`,
        title: 'New User Registered',
        description: `${user.name} joined Raksha24x7.`,
        time: user.createdAt,
        type: 'user'
      })),
      ...recentSos.map((item) => ({
        id: `sos-${item._id}`,
        title: 'SOS Request Created',
        description: `${item.userId?.name || 'A user'} triggered an SOS alert.`,
        time: item.createdAt,
        type: 'sos'
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        verifiedUsers,
        emergencyContacts,
        sosRequests,
        installedPwas,
        notificationCount
      },
      recentActivity
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load admin dashboard.' });
  }
};

export const getAdminSettings = async (req, res) => res.status(200).json({
  success: true,
  settings: {
    applicationName: 'Raksha24x7',
    version: process.env.npm_package_version || '1.0.0',
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@raksha24x7.com'
  }
});

export const updateAdminSettings = async (req, res) => {
  const { applicationName = 'Raksha24x7', version = '1.0.0', maintenanceMode = false, supportEmail = 'support@raksha24x7.com' } = req.body || {};
  return res.status(200).json({
    success: true,
    message: 'Admin settings saved for this session.',
    settings: {
      applicationName: String(applicationName).slice(0, 80),
      version: String(version).slice(0, 40),
      maintenanceMode: Boolean(maintenanceMode),
      supportEmail: String(supportEmail).slice(0, 120)
    }
  });
};

export const adminLogout = async (req, res) => res.status(200).json({ success: true, message: 'Admin logged out.' });
