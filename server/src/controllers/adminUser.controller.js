import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Sos from '../models/sos.model.js';
import PushDevice from '../models/pushDevice.model.js';
import Location from '../models/location.model.js';
import EmailLog from '../email/models/emailLog.model.js';
import Notification from '../notifications/models/notification.model.js';
import { writeAdminAuditLog } from '../services/adminAuth.service.js';

const ADMIN_USER_ROLES = ['admin', 'ADMIN', 'moderator', 'MODERATOR'];
const VALID_STATUSES = ['active', 'inactive', 'blocked', 'suspended', 'banned'];
const MODIFY_ROLES = ['super_admin', 'admin'];
const dayMs = 24 * 60 * 60 * 1000;

const canModifyUsers = (admin) => MODIFY_ROLES.includes(String(admin?.role || '').toLowerCase());
const canPermanentlyDelete = (admin) => String(admin?.role || '').toLowerCase() === 'super_admin';

const requireUserWrite = (req, res) => {
  if (canModifyUsers(req.admin)) return false;
  res.status(403).json({ success: false, message: 'Only Super Admin and Admin can modify users.' });
  return true;
};

const normalizeStatus = (status) => {
  if (['inactive', 'blocked', 'banned', 'suspended'].includes(status)) return status;
  return 'active';
};

const serializeUser = (user, extras = {}) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  avatar: user.avatar,
  profileImage: user.profileImage,
  role: user.role || 'user',
  accountStatus: normalizeStatus(user.accountStatus),
  isEmailVerified: Boolean(user.isEmailVerified),
  emailVerificationStatus: user.isEmailVerified ? 'verified' : (user.emailVerificationStatus || 'pending'),
  gender: user.gender,
  dateOfBirth: user.dateOfBirth,
  bloodGroup: user.bloodGroup,
  medicalNotes: user.medicalNotes,
  address: user.address || '',
  city: user.city || user.address?.city || '',
  state: user.state || user.address?.state || '',
  contacts: user.contacts || [],
  emergencyContactCount: user.emergencyContactCount ?? user.contacts?.length ?? 0,
  sosAlertCount: user.sosAlertCount ?? 0,
  adminNotes: user.adminNotes || '',
  memberSince: user.memberSince,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  deletedAt: user.deletedAt,
  profileCompleted: Boolean(user.profileCompleted),
  profileCompletion: user.profileCompletion ?? calculateProfileCompletion(user),
  ...extras
});

const calculateProfileCompletion = (user) => {
  const fields = [user.name, user.email, user.phone, user.dateOfBirth, user.gender, user.bloodGroup, user.contacts?.length];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
};

const registrationRange = (value) => {
  const now = new Date();
  if (value === 'today') return { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
  if (value === '7d') return { $gte: new Date(Date.now() - 7 * dayMs) };
  if (value === '30d') return { $gte: new Date(Date.now() - 30 * dayMs) };
  return null;
};

const buildQuery = (params = {}) => {
  const {
    search = '',
    status = 'all',
    email = 'all',
    registration = 'all',
    role = 'all',
    includeDeleted = 'false',
    filter = ''
  } = params;
  const query = includeDeleted === 'true' || status === 'deleted' ? {} : { deletedAt: null };
  const normalizedStatus = status !== 'all' ? status : filter;
  const trimmed = String(search || '').trim();

  if (trimmed) {
    query.$or = [
      { name: { $regex: trimmed, $options: 'i' } },
      { email: { $regex: trimmed, $options: 'i' } },
      { phone: { $regex: trimmed, $options: 'i' } },
      { city: { $regex: trimmed, $options: 'i' } },
      { state: { $regex: trimmed, $options: 'i' } },
      { address: { $regex: trimmed, $options: 'i' } },
      { 'address.city': { $regex: trimmed, $options: 'i' } },
      { 'address.state': { $regex: trimmed, $options: 'i' } },
      { 'contacts.phone': { $regex: trimmed, $options: 'i' } },
      { 'contacts.name': { $regex: trimmed, $options: 'i' } }
    ];
    if (/^[a-f\d]{24}$/i.test(trimmed)) query.$or.push({ _id: new mongoose.Types.ObjectId(trimmed) });
  }

  if (['active', 'inactive', 'blocked', 'suspended', 'banned'].includes(normalizedStatus)) query.accountStatus = normalizedStatus;
  if (normalizedStatus === 'deleted') query.deletedAt = { $ne: null };
  if (email === 'verified' || filter === 'verified') query.isEmailVerified = true;
  if (email === 'unverified' || filter === 'unverified') query.isEmailVerified = { $ne: true };
  if (role === 'admin' || filter === 'admin') query.role = { $in: ADMIN_USER_ROLES };
  if (role === 'user' || filter === 'user') query.role = 'user';
  const createdAt = registrationRange(registration);
  if (createdAt) query.createdAt = createdAt;
  return query;
};

const sortMap = {
  alphabetical: { name: 1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  last_login: { lastLogin: -1 },
  registration: { createdAt: -1 },
  recently_active: { lastLogin: -1 }
};

const userRowsWithCounts = async ({ query, sort, page, limit }) => User.aggregate([
  { $match: query },
  { $sort: sort },
  { $skip: (page - 1) * limit },
  { $limit: limit },
  {
    $lookup: {
      from: 'sos',
      localField: '_id',
      foreignField: 'userId',
      as: 'sosAlerts'
    }
  },
  {
    $addFields: {
      emergencyContactCount: { $size: { $ifNull: ['$contacts', []] } },
      sosAlertCount: { $size: '$sosAlerts' }
    }
  },
  { $project: { password: 0, resetPasswordToken: 0, resetPasswordExpire: 0, sosAlerts: 0 } }
]);

export const listAdminUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(5, Number(req.query.limit || 10)));
    const sort = sortMap[String(req.query.sort || 'newest')] || sortMap.newest;
    const query = buildQuery(req.query);
    const [users, total] = await Promise.all([
      userRowsWithCounts({ query, sort, page, limit }),
      User.countDocuments(query)
    ]);
    return res.status(200).json({
      success: true,
      users: users.map((user) => serializeUser(user)),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load users.' });
  }
};

export const getAdminUserDetails = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id }).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const [pushDevice, latestLocation, sosStats] = await Promise.all([
      PushDevice.findOne({ userId: user._id, isActive: true }).sort({ lastActiveAt: -1 }).lean(),
      Location.findOne({ userId: user._id }).sort({ createdAt: -1 }).lean(),
      Sos.aggregate([{ $match: { userId: user._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);
    const stats = sosStats.reduce((acc, item) => ({ ...acc, [item._id || 'unknown']: item.count }), {});
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'viewed_user', message: 'Admin viewed user profile.', metadata: { targetUserId: req.params.id } });
    return res.status(200).json({
      success: true,
      user: serializeUser(user, {
        notificationStatus: pushDevice?.permission || 'unknown',
        locationPermission: latestLocation ? 'available' : 'unknown',
        lastKnownLocation: latestLocation,
        pwaInstalled: pushDevice?.platform === 'pwa',
        sosStats: {
          total: Object.values(stats).reduce((sum, value) => sum + value, 0),
          active: (stats.active || 0) + (stats.sending || 0) + (stats.sent || 0),
          resolved: stats.resolved || 0,
          cancelled: stats.cancelled || 0,
          failed: stats.failed || 0
        }
      })
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load user details.' });
  }
};

export const getAdminUserEmergencyContacts = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('contacts name email').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const contacts = (user.contacts || []).map((contact, index) => ({
      ...contact,
      primary: Boolean(contact.isPrimary || index === 0),
      whatsappAvailable: Boolean(contact.phone)
    }));
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'viewed_user_contacts', message: 'Admin viewed user emergency contacts.', metadata: { targetUserId: req.params.id } });
    return res.status(200).json({ success: true, user: { id: user._id, name: user.name, email: user.email }, contacts, count: contacts.length, primaryContact: contacts.find((item) => item.primary) || null });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load emergency contacts.' });
  }
};

export const getAdminUserActivity = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.id);
    const [user, sos, locations, emails, notifications, devices] = await Promise.all([
      User.findById(userId).select('lastLogin createdAt emailVerificationStatus isEmailVerified passwordResetHistory').lean(),
      Sos.find({ userId }).sort({ createdAt: -1 }).limit(12).select('status emergencyType createdAt resolvedAt').lean(),
      Location.find({ userId }).sort({ createdAt: -1 }).limit(8).select('trackingMode createdAt timestamp').lean(),
      EmailLog.find({ userId }).sort({ createdAt: -1 }).limit(10).select('template status createdAt').lean(),
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(10).select('title type status createdAt').lean(),
      PushDevice.find({ userId }).sort({ lastActiveAt: -1 }).limit(6).select('browser os permission lastActiveAt createdAt').lean()
    ]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const timeline = [
      user.createdAt && { id: 'registered', category: 'Account', title: 'User Registered', status: 'success', time: user.createdAt },
      user.lastLogin && { id: 'last-login', category: 'Login', title: 'Last Login', status: 'success', time: user.lastLogin },
      user.isEmailVerified && { id: 'email-verified', category: 'Email', title: 'Email Verification', status: user.emailVerificationStatus || 'verified', time: user.updatedAt || user.createdAt },
      ...sos.map((item) => ({ id: `sos-${item._id}`, category: 'SOS', title: `SOS ${item.status}`, status: item.status, time: item.createdAt })),
      ...locations.map((item) => ({ id: `location-${item._id}`, category: 'Nearby Searches', title: item.trackingMode === 'live' ? 'Live Location Update' : 'Location Lookup', status: 'recorded', time: item.timestamp || item.createdAt })),
      ...emails.map((item) => ({ id: `email-${item._id}`, category: 'Email', title: item.template, status: item.status, time: item.createdAt })),
      ...notifications.map((item) => ({ id: `notification-${item._id}`, category: 'Notification', title: item.title || item.type, status: item.status, time: item.createdAt })),
      ...devices.map((item) => ({ id: `device-${item._id}`, category: 'Notification Activity', title: `${item.browser || 'Browser'} ${item.permission || ''}`, status: item.permission || 'unknown', time: item.lastActiveAt || item.createdAt }))
    ].filter(Boolean).sort((a, b) => new Date(b.time) - new Date(a.time));
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'viewed_user_activity', message: 'Admin viewed user activity.', metadata: { targetUserId: req.params.id } });
    return res.status(200).json({ success: true, activity: timeline });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load user activity.' });
  }
};

export const updateAdminUser = async (req, res) => {
  if (requireUserWrite(req, res)) return undefined;
  try {
    const { name, phone, accountStatus, adminNotes } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Full name is required.' });
    if (phone && !/^[+\d][\d\s-]{7,18}$/.test(String(phone))) return res.status(400).json({ success: false, message: 'Valid phone number is required.' });
    if (!VALID_STATUSES.includes(accountStatus)) return res.status(400).json({ success: false, message: 'Invalid account status.' });

    const duplicatePhone = phone ? await User.findOne({ _id: { $ne: req.params.id }, phone, deletedAt: null }).select('_id').lean() : null;
    if (duplicatePhone) return res.status(409).json({ success: false, message: 'Phone number already belongs to another user.' });

    const user = await User.findOneAndUpdate(
      { _id: req.params.id },
      { name: name.trim(), phone: String(phone || '').trim(), accountStatus, adminNotes: String(adminNotes || '').trim() },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'updated_user', message: 'Admin updated user.', metadata: { targetUserId: req.params.id } });
    return res.status(200).json({ success: true, message: 'User updated.', user: serializeUser(user) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not update user.' });
  }
};

export const updateAdminUserStatus = async (req, res) => {
  if (requireUserWrite(req, res)) return undefined;
  try {
    const { status } = req.body || {};
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    const user = await User.findOneAndUpdate({ _id: req.params.id }, { accountStatus: status, deletedAt: status === 'active' ? null : undefined }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'updated_status', message: `Admin changed user status to ${status}.`, metadata: { targetUserId: req.params.id, status } });
    return res.status(200).json({ success: true, message: `User ${status}.`, user: serializeUser(user) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not update user status.' });
  }
};

const statusAction = (status, action) => async (req, res) => {
  req.body = { ...(req.body || {}), status };
  await writeAdminAuditLog({ req, adminId: req.admin._id, action, message: `Admin requested ${action}.`, metadata: { targetUserId: req.params.id } });
  return updateAdminUserStatus(req, res);
};

export const suspendAdminUser = statusAction('suspended', 'suspended_user');
export const activateAdminUser = statusAction('active', 'activated_user');

export const deleteAdminUser = async (req, res) => {
  if (requireUserWrite(req, res)) return undefined;
  try {
    const { confirmation, permanent = false } = req.body || {};
    if (confirmation !== 'DELETE') return res.status(400).json({ success: false, message: 'Type DELETE to confirm.' });
    if (permanent && !canPermanentlyDelete(req.admin)) return res.status(403).json({ success: false, message: 'Only Super Admin can permanently delete users.' });
    if (permanent) {
      const user = await User.findByIdAndDelete(req.params.id).select('_id').lean();
      if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
      await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'permanently_deleted_user', message: 'Admin permanently deleted user.', metadata: { targetUserId: req.params.id } });
      return res.status(200).json({ success: true, message: 'User permanently deleted.' });
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date(), deletedBy: req.admin._id, accountStatus: 'suspended' },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'deleted_user', message: 'Admin soft deleted user.', metadata: { targetUserId: req.params.id } });
    return res.status(200).json({ success: true, message: 'User deleted.', user: serializeUser(user) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not delete user.' });
  }
};

export const restoreAdminUser = async (req, res) => {
  if (requireUserWrite(req, res)) return undefined;
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, deletedAt: { $ne: null } },
      { deletedAt: null, deletedBy: null, accountStatus: 'active' },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Deleted user not found.' });
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'restored_user', message: 'Admin restored user.', metadata: { targetUserId: req.params.id } });
    return res.status(200).json({ success: true, message: 'User restored.', user: serializeUser(user) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not restore user.' });
  }
};

export const bulkAdminUserAction = async (req, res) => {
  if (requireUserWrite(req, res)) return undefined;
  try {
    const { ids = [], action } = req.body || {};
    const safeIds = Array.isArray(ids) ? ids.filter((id) => /^[a-f\d]{24}$/i.test(String(id))) : [];
    if (!safeIds.length) return res.status(400).json({ success: false, message: 'Select at least one user.' });
    const update = {};
    if (action === 'activate') Object.assign(update, { accountStatus: 'active', deletedAt: null, deletedBy: null });
    else if (action === 'deactivate') update.accountStatus = 'inactive';
    else if (action === 'suspend') update.accountStatus = 'suspended';
    else if (action === 'delete') Object.assign(update, { deletedAt: new Date(), deletedBy: req.admin._id, accountStatus: 'suspended' });
    else if (action === 'restore') Object.assign(update, { deletedAt: null, deletedBy: null, accountStatus: 'active' });
    else return res.status(400).json({ success: false, message: 'Invalid bulk action.' });
    const result = await User.updateMany({ _id: { $in: safeIds } }, update);
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: `bulk_${action}`, message: 'Admin completed bulk user action.', metadata: { ids: safeIds } });
    return res.status(200).json({ success: true, message: 'Bulk action completed.', modifiedCount: result.modifiedCount || 0 });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not complete bulk action.' });
  }
};

const csvEscape = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`;

export const exportAdminUsers = async (req, res) => {
  try {
    const format = String(req.body?.format || req.query.format || 'csv').toLowerCase();
    const query = buildQuery({ ...req.query, ...(req.body?.filters || {}) });
    const users = await userRowsWithCounts({ query, sort: sortMap.newest, page: 1, limit: 5000 });
    const headers = ['User ID', 'Name', 'Email', 'Phone', 'Role', 'Email Verified', 'Account Status', 'Emergency Contacts', 'SOS Alerts', 'Registration Date', 'Last Login'];
    const rows = users.map((user) => [
      user._id,
      user.name,
      user.email,
      user.phone,
      user.role,
      user.isEmailVerified ? 'Verified' : 'Unverified',
      normalizeStatus(user.accountStatus),
      user.emergencyContactCount,
      user.sosAlertCount,
      user.createdAt ? new Date(user.createdAt).toISOString() : '',
      user.lastLogin ? new Date(user.lastLogin).toISOString() : ''
    ]);
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'exported_users', message: `Admin exported users as ${format}.`, metadata: { format, count: users.length } });
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="raksha-users.pdf"');
      return res.send(Buffer.from(`Raksha24x7 User Export\n\n${csv}`));
    }
    res.setHeader('Content-Type', format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="raksha-users.${format === 'excel' ? 'xls' : 'csv'}"`);
    return res.send(csv);
  } catch {
    return res.status(500).json({ success: false, message: 'Could not export users.' });
  }
};
