import Admin from '../models/admin.model.js';
import AdminSession from '../models/adminSession.model.js';
import User from '../models/user.model.js';
import Sos from '../models/sos.model.js';
import PushDevice from '../models/pushDevice.model.js';
import {
  createAdminSession,
  revokeAdminSession,
  revokeAllAdminSessions,
  writeAdminAuditLog
} from '../services/adminAuth.service.js';
import { validateStrongPassword } from '../utils/passwordPolicy.js';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;
const nonAdminQuery = { role: { $nin: ['admin', 'ADMIN', 'moderator', 'MODERATOR'] } };

const roleLabel = (role = '') => role.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

const safeAdmin = (admin) => ({
  id: admin._id,
  fullName: admin.fullName,
  name: admin.fullName,
  email: admin.email,
  phoneNumber: admin.phoneNumber,
  phone: admin.phoneNumber,
  role: admin.role,
  roleLabel: roleLabel(admin.role),
  permissions: admin.permissions || [],
  profilePhoto: admin.profilePhoto,
  avatar: admin.profilePhoto,
  profileImage: admin.profilePhoto,
  status: admin.status,
  lastLogin: admin.lastLogin,
  lastLogout: admin.lastLogout,
  twoFactorReady: admin.twoFactorReady,
  createdAt: admin.createdAt,
  updatedAt: admin.updatedAt
});

const sessionDto = (session) => ({
  id: session._id,
  sessionId: session.sessionId,
  loginTime: session.loginTime,
  logoutTime: session.logoutTime,
  expiresAt: session.expiresAt,
  device: session.device,
  browser: session.browser,
  operatingSystem: session.operatingSystem,
  ipAddress: session.ipAddress,
  isActive: session.isActive,
  current: false
});

const incrementFailedLogin = async (admin, req) => {
  admin.loginAttempts = (admin.loginAttempts || 0) + 1;
  if (admin.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    admin.accountLocked = true;
    admin.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
  }
  await admin.save();
  await writeAdminAuditLog({
    req,
    adminId: admin._id,
    action: 'failed_login',
    status: 'failed',
    message: admin.accountLocked ? 'Admin account locked after failed login attempts.' : 'Invalid admin password.'
  });
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password, remember } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'Admin email and password are required.' });

    const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() }).select('+password +loginAttempts +lockUntil');
    if (!admin) {
      await writeAdminAuditLog({ req, action: 'failed_login', status: 'failed', message: 'Admin account not found.', metadata: { email } });
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }
    if (admin.status !== 'active') {
      await writeAdminAuditLog({ req, adminId: admin._id, action: 'failed_login', status: 'failed', message: 'Inactive admin account.' });
      return res.status(403).json({ success: false, message: 'Admin account is not active.' });
    }
    if (admin.accountLocked && admin.lockUntil && admin.lockUntil > new Date()) {
      return res.status(423).json({ success: false, message: 'Admin account is temporarily locked. Try again later.' });
    }

    const valid = await admin.comparePassword(password);
    if (!valid) {
      await incrementFailedLogin(admin, req);
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    admin.loginAttempts = 0;
    admin.accountLocked = false;
    admin.lockUntil = null;
    admin.lastLogin = new Date();
    await admin.save();

    const { token, expiresAt, session } = await createAdminSession({ admin, req, remember: Boolean(remember) });
    await writeAdminAuditLog({ req, adminId: admin._id, action: 'login', message: 'Admin login successful.', metadata: { sessionId: session.sessionId } });

    return res.status(200).json({
      success: true,
      message: 'Admin login successful.',
      token,
      expiresAt: expiresAt.toISOString(),
      sessionId: session.sessionId,
      admin: safeAdmin(admin)
    });
  } catch (error) {
    await writeAdminAuditLog({ req, action: 'failed_login', status: 'failed', message: error.message });
    return res.status(500).json({ success: false, message: 'Admin login failed.' });
  }
};

export const getAdminProfile = async (req, res) => res.status(200).json({ success: true, admin: safeAdmin(req.admin) });
export const getAdminMe = getAdminProfile;

export const updateAdminProfile = async (req, res) => {
  try {
    const { fullName, name, phoneNumber, phone, profilePhoto } = req.body || {};
    if (fullName || name) req.admin.fullName = String(fullName || name).trim().slice(0, 120);
    if (phoneNumber !== undefined || phone !== undefined) req.admin.phoneNumber = String(phoneNumber ?? phone ?? '').trim().slice(0, 30);
    if (profilePhoto !== undefined) req.admin.profilePhoto = String(profilePhoto || '').trim();
    await req.admin.save();
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'profile_update', message: 'Admin profile updated.' });
    return res.status(200).json({ success: true, message: 'Admin profile updated.', admin: safeAdmin(req.admin) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not update admin profile.' });
  }
};

export const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    const passwordError = validateStrongPassword(newPassword);
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    if (newPassword !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });

    const admin = await Admin.findById(req.admin._id).select('+password');
    const valid = await admin.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    const same = await admin.comparePassword(newPassword);
    if (same) return res.status(400).json({ success: false, message: 'New password must be different from current password.' });

    admin.password = newPassword;
    await admin.save();
    await revokeAllAdminSessions(admin._id);
    await writeAdminAuditLog({ req, adminId: admin._id, action: 'password_change', message: 'Admin password changed.' });
    return res.status(200).json({ success: true, message: 'Password changed successfully. Please login again.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not change admin password.' });
  }
};

export const getAdminSessions = async (req, res) => {
  const sessions = await AdminSession.find({ adminId: req.admin._id }).sort({ createdAt: -1 }).limit(20).lean();
  return res.status(200).json({
    success: true,
    sessions: sessions.map((session) => ({ ...sessionDto(session), current: session.sessionId === req.adminSession?.sessionId }))
  });
};

export const deleteAdminSession = async (req, res) => {
  const session = await AdminSession.findOneAndUpdate(
    { _id: req.params.id, adminId: req.admin._id },
    { isActive: false, logoutTime: new Date() },
    { new: true }
  );
  if (!session) return res.status(404).json({ success: false, message: 'Admin session not found.' });
  await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'session_revoked', message: 'Admin session revoked.', metadata: { sessionId: session.sessionId } });
  return res.status(200).json({ success: true, message: 'Session revoked.' });
};

export const adminLogout = async (req, res) => {
  await revokeAdminSession({ sessionId: req.adminSession?.sessionId, adminId: req.admin._id });
  req.admin.lastLogout = new Date();
  await req.admin.save();
  await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'logout', message: 'Admin logged out.' });
  return res.status(200).json({ success: true, message: 'Admin logged out.' });
};

export const adminLogoutAll = async (req, res) => {
  await revokeAllAdminSessions(req.admin._id);
  req.admin.lastLogout = new Date();
  await req.admin.save();
  await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'logout_all', message: 'All admin sessions logged out.' });
  return res.status(200).json({ success: true, message: 'All admin sessions logged out.' });
};

export const getAdminDashboard = async (req, res) => {
  try {
    const [totalUsers, activeUsers, verifiedUsers, users, sosRequests, installedPwas, devices, recentUsers, recentSos] = await Promise.all([
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
      ...recentUsers.map((user) => ({ id: `user-${user._id}`, title: 'New User Registered', description: `${user.name} joined Raksha24x7.`, time: user.createdAt, type: 'user' })),
      ...recentSos.map((item) => ({ id: `sos-${item._id}`, title: 'SOS Request Created', description: `${item.userId?.name || 'A user'} triggered an SOS alert.`, time: item.createdAt, type: 'sos' }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

    return res.status(200).json({ success: true, stats: { totalUsers, activeUsers, verifiedUsers, emergencyContacts, sosRequests, installedPwas, notificationCount }, recentActivity });
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
