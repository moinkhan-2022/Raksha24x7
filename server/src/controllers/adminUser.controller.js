import User from '../models/user.model.js';
import PushDevice from '../models/pushDevice.model.js';
import Location from '../models/location.model.js';

const ADMIN_ROLES = ['admin', 'ADMIN'];
const VALID_ROLES = ['user', 'admin', 'ADMIN', 'moderator', 'MODERATOR'];
const VALID_STATUSES = ['active', 'inactive', 'blocked', 'suspended', 'banned'];

const normalizeStatus = (status) => {
  if (status === 'inactive' || status === 'blocked' || status === 'banned') return status;
  if (status === 'suspended') return 'suspended';
  return 'active';
};

const serializeUser = (user, extras = {}) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  profileImage: user.profileImage,
  role: user.role,
  accountStatus: normalizeStatus(user.accountStatus),
  isEmailVerified: Boolean(user.isEmailVerified),
  emailVerificationStatus: user.isEmailVerified ? 'verified' : (user.emailVerificationStatus || 'pending'),
  gender: user.gender,
  dateOfBirth: user.dateOfBirth,
  bloodGroup: user.bloodGroup,
  medicalNotes: user.medicalNotes,
  contacts: user.contacts || [],
  adminNotes: user.adminNotes || '',
  memberSince: user.memberSince,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  deletedAt: user.deletedAt,
  ...extras
});

const buildQuery = ({ search = '', filter = 'all' }) => {
  const query = { deletedAt: null };
  const trimmed = String(search || '').trim();
  if (trimmed) {
    query.$or = [
      { name: { $regex: trimmed, $options: 'i' } },
      { email: { $regex: trimmed, $options: 'i' } },
      { phone: { $regex: trimmed, $options: 'i' } }
    ];
    if (/^[a-f\d]{24}$/i.test(trimmed)) query.$or.push({ _id: trimmed });
  }

  if (filter === 'active') query.accountStatus = 'active';
  if (filter === 'inactive') query.accountStatus = 'inactive';
  if (filter === 'blocked') query.accountStatus = { $in: ['blocked', 'suspended', 'banned'] };
  if (filter === 'verified') query.isEmailVerified = true;
  if (filter === 'unverified') query.isEmailVerified = { $ne: true };
  if (filter === 'admin') query.role = { $in: ADMIN_ROLES };
  if (filter === 'user') query.role = 'user';
  return query;
};

const sortMap = {
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  last_login: { lastLogin: -1 },
  registration: { createdAt: -1 },
  recently_active: { lastLogin: -1 }
};

export const listAdminUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(5, Number(req.query.limit || 10)));
    const filter = String(req.query.filter || 'all');
    const sort = String(req.query.sort || (filter === 'oldest' ? 'oldest' : filter === 'recently_active' ? 'recently_active' : 'newest'));
    const query = buildQuery({ search: req.query.search, filter });
    const finalSort = sortMap[sort] || sortMap.newest;

    const [users, total] = await Promise.all([
      User.find(query).sort(finalSort).skip((page - 1) * limit).limit(limit).select('-password').lean(),
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
    const user = await User.findOne({ _id: req.params.id, deletedAt: null }).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const [pushDevice, latestLocation] = await Promise.all([
      PushDevice.findOne({ userId: user._id, isActive: true }).sort({ lastActiveAt: -1 }).lean(),
      Location.findOne({ userId: user._id }).sort({ createdAt: -1 }).lean()
    ]);
    return res.status(200).json({
      success: true,
      user: serializeUser(user, {
        notificationStatus: pushDevice?.permission || 'unknown',
        locationPermission: latestLocation ? 'available' : 'unknown',
        pwaInstalled: pushDevice?.platform === 'pwa'
      })
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load user details.' });
  }
};

export const updateAdminUser = async (req, res) => {
  try {
    const { name, phone, role, accountStatus, adminNotes } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Full name is required.' });
    if (!/^\d{10}$/.test(String(phone || ''))) return res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required.' });
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role.' });
    if (!VALID_STATUSES.includes(accountStatus)) return res.status(400).json({ success: false, message: 'Invalid account status.' });

    const duplicatePhone = await User.findOne({ _id: { $ne: req.params.id }, phone, deletedAt: null }).select('_id').lean();
    if (duplicatePhone) return res.status(409).json({ success: false, message: 'Phone number already belongs to another user.' });

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      {
        name: name.trim(),
        phone: String(phone).trim(),
        role,
        accountStatus,
        adminNotes: String(adminNotes || '').trim()
      },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, message: 'User updated.', user: serializeUser(user) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not update user.' });
  }
};

export const updateAdminUserStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { accountStatus: status },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, message: `User ${status}.`, user: serializeUser(user) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not update user status.' });
  }
};

export const deleteAdminUser = async (req, res) => {
  try {
    const { confirmation } = req.body || {};
    if (confirmation !== 'DELETE') return res.status(400).json({ success: false, message: 'Type DELETE to confirm.' });
    if (String(req.params.id) === String(req.admin._id)) return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date(), deletedBy: req.admin._id, accountStatus: 'suspended' },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, message: 'User deleted.', user: serializeUser(user) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not delete user.' });
  }
};

export const bulkAdminUserAction = async (req, res) => {
  try {
    const { ids = [], action } = req.body || {};
    const safeIds = Array.isArray(ids) ? ids.filter((id) => /^[a-f\d]{24}$/i.test(String(id))) : [];
    if (!safeIds.length) return res.status(400).json({ success: false, message: 'Select at least one user.' });
    if (safeIds.some((id) => String(id) === String(req.admin._id)) && ['delete', 'ban', 'suspend'].includes(action)) {
      return res.status(400).json({ success: false, message: 'You cannot perform this bulk action on your own admin account.' });
    }
    const update = {};
    if (action === 'activate') update.accountStatus = 'active';
    else if (action === 'deactivate') update.accountStatus = 'inactive';
    else if (action === 'delete') Object.assign(update, { deletedAt: new Date(), deletedBy: req.admin._id, accountStatus: 'suspended' });
    else if (action === 'notify') return res.status(200).json({ success: true, message: 'Send Notification is ready for a future module.', modifiedCount: 0 });
    else return res.status(400).json({ success: false, message: 'Invalid bulk action.' });

    const result = await User.updateMany({ _id: { $in: safeIds }, deletedAt: null }, update);
    return res.status(200).json({ success: true, message: 'Bulk action completed.', modifiedCount: result.modifiedCount || 0 });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not complete bulk action.' });
  }
};

export const exportAdminUsers = async (req, res) => {
  try {
    const format = String(req.query.format || 'csv').toLowerCase();
    if (format === 'pdf') return res.status(200).json({ success: true, message: 'PDF export is future-ready and will be added later.' });
    const users = await User.find({ deletedAt: null }).sort({ createdAt: -1 }).select('-password').lean();
    const headers = ['User ID', 'Name', 'Email', 'Phone', 'Role', 'Email Verified', 'Account Status', 'Registration Date', 'Last Login'];
    const rows = users.map((user) => [
      user._id,
      user.name,
      user.email,
      user.phone,
      user.role,
      user.isEmailVerified ? 'Verified' : 'Unverified',
      normalizeStatus(user.accountStatus),
      user.createdAt ? new Date(user.createdAt).toISOString() : '',
      user.lastLogin ? new Date(user.lastLogin).toISOString() : ''
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    res.setHeader('Content-Type', format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="raksha-users.${format === 'excel' ? 'xls' : 'csv'}"`);
    return res.send(csv);
  } catch {
    return res.status(500).json({ success: false, message: 'Could not export users.' });
  }
};
