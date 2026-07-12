import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Sos from '../models/sos.model.js';
import Location from '../models/location.model.js';
import PushDevice from '../models/pushDevice.model.js';
import EmailLog from '../email/models/emailLog.model.js';
import EmailQueue from '../email/models/emailQueue.model.js';
import Notification from '../notifications/models/notification.model.js';
import NotificationLog from '../notifications/models/notificationLog.model.js';
import AdminAuditLog from '../models/adminAuditLog.model.js';

const nonAdminQuery = { role: { $nin: ['admin', 'ADMIN', 'moderator', 'MODERATOR'] } };
const dayMs = 24 * 60 * 60 * 1000;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

const rangeWindow = (range = '7d') => {
  const now = new Date();
  if (range === 'today') return { start: startOfDay(now), end: now, label: 'Today' };
  if (range === 'yesterday') {
    const yesterday = new Date(Date.now() - dayMs);
    return { start: startOfDay(yesterday), end: endOfDay(yesterday), label: 'Yesterday' };
  }
  if (range === '30d') return { start: new Date(Date.now() - 29 * dayMs), end: now, label: 'Last 30 Days' };
  if (range === 'all') return { start: null, end: now, label: 'All Time' };
  return { start: new Date(Date.now() - 6 * dayMs), end: now, label: 'Last 7 Days' };
};

const createdBetween = ({ start, end }) => (start ? { createdAt: { $gte: start, $lte: end } } : {});
const zero = (value) => Number(value || 0);
const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0);

const countByStatus = async (Model, baseMatch = {}) => {
  const rows = await Model.aggregate([
    { $match: baseMatch },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  return rows.reduce((acc, item) => ({ ...acc, [item._id || 'unknown']: item.count }), {});
};

const countByField = async (Model, field, baseMatch = {}) => {
  const rows = await Model.aggregate([
    { $match: baseMatch },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } }
  ]);
  return rows.reduce((acc, item) => ({ ...acc, [item._id || 'unknown']: item.count }), {});
};

const trend = async (Model, baseMatch = {}, days = 7, dateField = 'createdAt') => {
  const start = new Date(Date.now() - (days - 1) * dayMs);
  const rows = await Model.aggregate([
    { $match: { ...baseMatch, [dateField]: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` } }, value: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const lookup = new Map(rows.map((item) => [item._id, item.value]));
  return Array.from({ length: days }).map((_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), value: lookup.get(key) || 0 };
  });
};

const contactCount = async () => {
  const [row] = await User.aggregate([
    { $match: nonAdminQuery },
    { $project: { count: { $size: { $ifNull: ['$contacts', []] } } } },
    { $group: { _id: null, total: { $sum: '$count' } } }
  ]);
  return row?.total || 0;
};

export const getDashboardOverview = async (req, res) => {
  try {
    const range = rangeWindow(req.query.range);
    const match = createdBetween(range);
    const [
      users,
      sos,
      emails,
      notifications,
      emergencyContacts,
      nearbySearches,
      weeklyActiveUsers,
      todayRegistrations,
      userTrend,
      sosTrend,
      emailStatus,
      notificationTrend
    ] = await Promise.all([
      getDashboardUsersData(range),
      getDashboardSosData(range),
      getDashboardEmailData(range),
      getDashboardNotificationData(range),
      contactCount(),
      Location.countDocuments(match),
      User.countDocuments({ ...nonAdminQuery, lastLogin: { $gte: new Date(Date.now() - 7 * dayMs) } }),
      User.countDocuments({ ...nonAdminQuery, createdAt: { $gte: startOfDay(new Date()) } }),
      trend(User, nonAdminQuery, 7),
      trend(Sos, {}, 7),
      countByStatus(EmailLog, match),
      trend(Notification, {}, 7)
    ]);

    const stats = [
      { key: 'totalUsers', label: 'Total Users', value: users.totalRegisteredUsers, growth: users.newUsersThisWeek, trend: 'up', description: 'Registered platform users' },
      { key: 'totalSosAlerts', label: 'Total SOS Alerts', value: sos.totalSosAlerts, growth: sos.weeklySos, trend: 'up', description: 'SOS records created' },
      { key: 'activeSosSessions', label: 'Active SOS Sessions', value: sos.activeSos, growth: sos.todaySos, trend: sos.activeSos ? 'up' : 'neutral', description: 'Currently active emergencies' },
      { key: 'emergencyContacts', label: 'Emergency Contacts', value: emergencyContacts, growth: 0, trend: 'neutral', description: 'Saved trusted contacts' },
      { key: 'nearbySearches', label: 'Nearby Service Searches', value: nearbySearches, growth: 0, trend: 'neutral', description: 'Location lookups in range' },
      { key: 'emailsSent', label: 'Emails Sent', value: emails.emailsSent, growth: emails.verificationEmails, trend: 'up', description: 'Sent email logs' },
      { key: 'emailsFailed', label: 'Emails Failed', value: emails.emailsFailed, growth: 0, trend: emails.emailsFailed ? 'down' : 'neutral', description: 'Failed email attempts' },
      { key: 'notificationsSent', label: 'Notifications Sent', value: notifications.pushNotifications + notifications.browserNotifications + notifications.emailNotifications, growth: notifications.sosNotifications, trend: 'up', description: 'Notification records' },
      { key: 'weeklyActiveUsers', label: 'Weekly Active Users', value: weeklyActiveUsers, growth: weeklyActiveUsers, trend: 'up', description: 'Users active this week' },
      { key: 'todayRegistrations', label: "Today's Registrations", value: todayRegistrations, growth: todayRegistrations, trend: 'up', description: 'New users today' }
    ];

    return res.status(200).json({
      success: true,
      range: range.label,
      stats,
      users,
      sos,
      emails,
      notifications,
      charts: { userTrend, sosTrend, emailStatus, notificationTrend, monthlyGrowth: await trend(User, nonAdminQuery, 30) }
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load admin dashboard overview.' });
  }
};

const getDashboardUsersData = async (range) => {
  const [totalRegisteredUsers, activeUsersToday, newUsersThisWeek, newUsersThisMonth, verifiedUsers, lastRegisteredUser] = await Promise.all([
    User.countDocuments(nonAdminQuery),
    User.countDocuments({ ...nonAdminQuery, lastLogin: { $gte: startOfDay(new Date()) } }),
    User.countDocuments({ ...nonAdminQuery, createdAt: { $gte: new Date(Date.now() - 7 * dayMs) } }),
    User.countDocuments({ ...nonAdminQuery, createdAt: { $gte: new Date(Date.now() - 30 * dayMs) } }),
    User.countDocuments({ ...nonAdminQuery, isEmailVerified: true }),
    User.findOne(nonAdminQuery).sort({ createdAt: -1 }).select('name email createdAt').lean()
  ]);
  const onlineUsers = await PushDevice.countDocuments({ isActive: true, lastActiveAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) } });
  return {
    totalRegisteredUsers,
    activeUsersToday,
    newUsersThisWeek,
    newUsersThisMonth,
    verifiedUsers,
    unverifiedUsers: Math.max(totalRegisteredUsers - verifiedUsers, 0),
    onlineUsers,
    lastRegisteredUser,
    rangeTotal: await User.countDocuments({ ...nonAdminQuery, ...createdBetween(range) })
  };
};

export const getDashboardUsers = async (req, res) => {
  try {
    return res.status(200).json({ success: true, users: await getDashboardUsersData(rangeWindow(req.query.range)) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load user analytics.' });
  }
};

const getDashboardSosData = async (range) => {
  const statusCounts = await countByStatus(Sos);
  const todayStart = startOfDay(new Date());
  const weekStart = new Date(Date.now() - 7 * dayMs);
  const resolved = await Sos.find({ resolvedAt: { $ne: null } }).select('createdAt resolvedAt').limit(500).lean();
  const averageMs = resolved.length ? resolved.reduce((sum, item) => sum + (new Date(item.resolvedAt) - new Date(item.createdAt)), 0) / resolved.length : 0;
  return {
    totalSosAlerts: await Sos.countDocuments(),
    activeSos: zero(statusCounts.active) + zero(statusCounts.sending) + zero(statusCounts.sent),
    completedSos: zero(statusCounts.resolved),
    cancelledSos: zero(statusCounts.cancelled),
    failedSos: zero(statusCounts.failed),
    averageResponseTime: averageMs ? `${Math.max(Math.round(averageMs / 60000), 1)} min` : 'N/A',
    todaySos: await Sos.countDocuments({ createdAt: { $gte: todayStart } }),
    weeklySos: await Sos.countDocuments({ createdAt: { $gte: weekStart } }),
    rangeTotal: await Sos.countDocuments(createdBetween(range))
  };
};

export const getDashboardSos = async (req, res) => {
  try {
    return res.status(200).json({ success: true, sos: await getDashboardSosData(rangeWindow(req.query.range)) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load SOS analytics.' });
  }
};

const getDashboardEmailData = async (range) => {
  const match = createdBetween(range);
  const [logStatus, pendingEmails, verificationEmails, passwordResetEmails, welcomeEmails] = await Promise.all([
    countByStatus(EmailLog, match),
    EmailQueue.countDocuments({ status: { $in: ['pending', 'processing'] }, ...match }),
    EmailLog.countDocuments({ template: /verification/i, ...match }),
    EmailLog.countDocuments({ template: /password|reset/i, ...match }),
    EmailLog.countDocuments({ template: /welcome/i, ...match })
  ]);
  return {
    emailsSent: zero(logStatus.sent),
    emailsDelivered: await EmailLog.countDocuments({ deliveredAt: { $ne: null }, ...match }),
    emailsFailed: zero(logStatus.failed),
    pendingEmails,
    verificationEmails,
    passwordResetEmails,
    welcomeEmails
  };
};

export const getDashboardEmails = async (req, res) => {
  try {
    return res.status(200).json({ success: true, emails: await getDashboardEmailData(rangeWindow(req.query.range)) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load email analytics.' });
  }
};

const getDashboardNotificationData = async (range) => {
  const match = createdBetween(range);
  const [channels, failedNotifications, sosNotifications, logCounts] = await Promise.all([
    Notification.aggregate([{ $match: match }, { $group: { _id: '$channel', count: { $sum: 1 } } }]),
    Notification.countDocuments({ status: 'failed', ...match }),
    Notification.countDocuments({ type: /sos|emergency/i, ...match }),
    countByField(NotificationLog, 'result', match)
  ]);
  const byChannel = channels.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});
  const totalLogs = zero(logCounts.success) + zero(logCounts.failed);
  return {
    pushNotifications: zero(byChannel.push),
    browserNotifications: zero(byChannel.browser) + zero(byChannel['in-app']),
    sosNotifications,
    emailNotifications: zero(byChannel.email),
    notificationSuccessRate: percent(zero(logCounts.success), totalLogs),
    failedNotifications
  };
};

export const getDashboardNotifications = async (req, res) => {
  try {
    return res.status(200).json({ success: true, notifications: await getDashboardNotificationData(rangeWindow(req.query.range)) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load notification analytics.' });
  }
};

export const getDashboardActivity = async (req, res) => {
  try {
    const [users, sos, emails, notifications, audits] = await Promise.all([
      User.find(nonAdminQuery).sort({ createdAt: -1 }).limit(6).select('name email createdAt').lean(),
      Sos.find().sort({ createdAt: -1 }).limit(6).select('status emergencyType createdAt').populate('userId', 'name email').lean(),
      EmailLog.find().sort({ createdAt: -1 }).limit(6).select('to template status createdAt').lean(),
      Notification.find().sort({ createdAt: -1 }).limit(6).select('title type status createdAt').populate('userId', 'name email').lean(),
      AdminAuditLog.find().sort({ createdAt: -1 }).limit(6).select('action status createdAt').lean()
    ]);
    const activity = [
      ...users.map((user) => ({ id: `user-${user._id}`, category: 'Users', title: 'New User Registered', user: user.name || user.email, status: 'success', time: user.createdAt })),
      ...sos.map((item) => ({ id: `sos-${item._id}`, category: 'SOS', title: item.status === 'resolved' ? 'SOS Completed' : 'SOS Activated', user: item.userId?.name || 'User', status: item.status, time: item.createdAt })),
      ...emails.map((item) => ({ id: `email-${item._id}`, category: 'Email', title: item.template === 'password-reset' ? 'Password Reset' : 'Email Sent', user: item.to, status: item.status, time: item.createdAt })),
      ...notifications.map((item) => ({ id: `notification-${item._id}`, category: 'Notifications', title: item.title || 'Notification Sent', user: item.userId?.name || 'User', status: item.status, time: item.createdAt })),
      ...audits.map((item) => ({ id: `audit-${item._id}`, category: 'Admin', title: item.action.replace(/_/g, ' '), user: 'Admin', status: item.status, time: item.createdAt }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 20);
    return res.status(200).json({ success: true, activity });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load activity feed.' });
  }
};

export const getDashboardSystemHealth = async (req, res) => {
  const started = Date.now();
  try {
    await mongoose.connection.db.admin().ping();
    const responseTime = Date.now() - started;
    return res.status(200).json({
      success: true,
      health: [
        { key: 'backend', label: 'Backend Status', status: 'healthy', detail: 'API responding' },
        { key: 'database', label: 'Database Status', status: 'healthy', detail: 'MongoDB connected' },
        { key: 'email', label: 'Email Service Status', status: process.env.EMAIL_PROVIDER ? 'healthy' : 'warning', detail: process.env.EMAIL_PROVIDER || 'Provider not configured' },
        { key: 'notifications', label: 'Notification Service', status: 'healthy', detail: 'Notification APIs available' },
        { key: 'maps', label: 'Maps Service', status: process.env.VITE_GOOGLE_MAPS_API_KEY ? 'healthy' : 'warning', detail: 'OSM fallback available' },
        { key: 'response', label: 'Server Response Time', status: responseTime < 500 ? 'healthy' : 'warning', detail: `${responseTime} ms` },
        { key: 'api', label: 'API Status', status: 'healthy', detail: 'Admin APIs protected' }
      ]
    });
  } catch {
    return res.status(500).json({
      success: false,
      health: [{ key: 'database', label: 'Database Status', status: 'error', detail: 'MongoDB ping failed' }],
      message: 'Could not load system health.'
    });
  }
};
