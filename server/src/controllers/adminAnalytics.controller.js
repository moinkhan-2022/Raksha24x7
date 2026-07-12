import os from 'node:os';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Sos from '../models/sos.model.js';
import Location from '../models/location.model.js';
import PushDevice from '../models/pushDevice.model.js';
import AdminAuditLog from '../models/adminAuditLog.model.js';
import AdminSettingsHistory from '../models/adminSettingsHistory.model.js';
import EmailLog from '../email/models/emailLog.model.js';
import EmailQueue from '../email/models/emailQueue.model.js';
import Notification from '../notifications/models/notification.model.js';
import NotificationLog from '../notifications/models/notificationLog.model.js';
import { emailProviderStatus } from '../email/services/emailProvider.service.js';
import { writeAdminAuditLog } from '../services/adminAuth.service.js';

const dayMs = 24 * 60 * 60 * 1000;
const nonAdminQuery = { role: { $nin: ['admin', 'ADMIN', 'moderator', 'MODERATOR'] } };
const reportPermissions = ['*', 'reports:manage', 'reports:review', 'activity:monitor'];

const startOfDay = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const percent = (part, total) => (total ? Math.round((Number(part || 0) / Number(total || 0)) * 100) : 0);
const safeNumber = (value) => Number(value || 0);
const canReadReports = (admin) => admin?.role === 'super_admin' || (admin?.permissions || []).some((item) => reportPermissions.includes(item));

const requireReportsAccess = (req, res) => {
  if (!canReadReports(req.admin)) {
    res.status(403).json({ success: false, message: 'Missing required admin reports permission.' });
    return false;
  }
  return true;
};

const getRange = (query = {}) => {
  const now = new Date();
  if (query.startDate && query.endDate) {
    return { start: new Date(query.startDate), end: new Date(query.endDate), label: 'Custom Range', days: 30 };
  }
  const type = query.range || query.period || '30d';
  if (type === 'today' || type === 'daily') return { start: startOfDay(now), end: now, label: 'Today', days: 1 };
  if (type === '7d' || type === 'weekly') return { start: new Date(Date.now() - 6 * dayMs), end: now, label: 'Last 7 Days', days: 7 };
  if (type === 'yearly' || type === '365d') return { start: new Date(Date.now() - 364 * dayMs), end: now, label: 'Last 12 Months', days: 365 };
  if (type === 'all') return { start: null, end: now, label: 'All Time', days: 365 };
  return { start: new Date(Date.now() - 29 * dayMs), end: now, label: 'Last 30 Days', days: 30 };
};

const createdMatch = (range, field = 'createdAt') => (range.start ? { [field]: { $gte: range.start, $lte: range.end } } : {});

const countByField = async (Model, field, match = {}) => {
  const rows = await Model.aggregate([
    { $match: match },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  return rows.reduce((acc, item) => ({ ...acc, [item._id || 'unknown']: item.count }), {});
};

const trend = async (Model, match = {}, days = 30, dateField = 'createdAt') => {
  const boundedDays = Math.min(Math.max(Number(days || 30), 1), 60);
  const start = new Date(Date.now() - (boundedDays - 1) * dayMs);
  const rows = await Model.aggregate([
    { $match: { ...match, [dateField]: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` } }, value: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const lookup = new Map(rows.map((item) => [item._id, item.value]));
  return Array.from({ length: boundedDays }).map((_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), value: lookup.get(key) || 0, date: key };
  });
};

const previousComparison = async (Model, baseMatch, range, dateField = 'createdAt') => {
  if (!range.start) return { current: await Model.countDocuments(baseMatch), previous: 0, changePercent: 0 };
  const duration = range.end - range.start;
  const previousStart = new Date(range.start.getTime() - duration);
  const previousEnd = new Date(range.start.getTime());
  const [current, previous] = await Promise.all([
    Model.countDocuments({ ...baseMatch, ...createdMatch(range, dateField) }),
    Model.countDocuments({ ...baseMatch, [dateField]: { $gte: previousStart, $lt: previousEnd } })
  ]);
  return { current, previous, changePercent: previous ? Math.round(((current - previous) / previous) * 100) : (current ? 100 : 0) };
};

const topList = async (Model, field, match = {}, limit = 5) => Model.aggregate([
  { $match: match },
  { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: limit },
  { $project: { _id: 0, label: { $ifNull: ['$_id', 'Unknown'] }, value: '$count' } }
]);

const userAnalyticsData = async (range) => {
  const today = startOfDay(new Date());
  const week = new Date(Date.now() - 6 * dayMs);
  const month = new Date(Date.now() - 29 * dayMs);
  const [totalUsers, todayRegistrations, weeklyRegistrations, monthlyRegistrations, verifiedUsers, activeUsers, userTrend, comparison] = await Promise.all([
    User.countDocuments(nonAdminQuery),
    User.countDocuments({ ...nonAdminQuery, createdAt: { $gte: today } }),
    User.countDocuments({ ...nonAdminQuery, createdAt: { $gte: week } }),
    User.countDocuments({ ...nonAdminQuery, createdAt: { $gte: month } }),
    User.countDocuments({ ...nonAdminQuery, isEmailVerified: true }),
    User.countDocuments({ ...nonAdminQuery, lastLogin: { $gte: month } }),
    trend(User, nonAdminQuery, range.days),
    previousComparison(User, nonAdminQuery, range)
  ]);
  const inactiveUsers = Math.max(totalUsers - activeUsers, 0);
  return {
    totalUsers,
    todayRegistrations,
    weeklyRegistrations,
    monthlyRegistrations,
    verifiedUsers,
    unverifiedUsers: Math.max(totalUsers - verifiedUsers, 0),
    activeUsers,
    inactiveUsers,
    averageDailyLogins: Math.round(activeUsers / Math.max(range.days || 30, 1)),
    userGrowthRate: comparison.changePercent,
    comparison,
    charts: { userGrowth: userTrend, dailyActiveUsers: await trend(User, { ...nonAdminQuery, lastLogin: { $ne: null } }, Math.min(range.days, 30), 'lastLogin') }
  };
};

const sosAnalyticsData = async (range) => {
  const today = startOfDay(new Date());
  const status = await countByField(Sos, 'status', createdMatch(range));
  const resolved = await Sos.find({ resolvedAt: { $ne: null } }).select('createdAt resolvedAt').limit(1000).lean();
  const averageDurationMs = resolved.length ? resolved.reduce((sum, item) => sum + (new Date(item.resolvedAt) - new Date(item.createdAt)), 0) / resolved.length : 0;
  const peakRows = await Sos.aggregate([
    { $match: createdMatch(range) },
    { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  return {
    totalSos: await Sos.countDocuments(),
    todaySos: await Sos.countDocuments({ createdAt: { $gte: today } }),
    weeklySos: await Sos.countDocuments({ createdAt: { $gte: new Date(Date.now() - 6 * dayMs) } }),
    monthlySos: await Sos.countDocuments({ createdAt: { $gte: new Date(Date.now() - 29 * dayMs) } }),
    completedSos: safeNumber(status.resolved),
    cancelledSos: safeNumber(status.cancelled),
    failedSos: safeNumber(status.failed),
    activeSos: safeNumber(status.active) + safeNumber(status.sending) + safeNumber(status.sent),
    averageSosDuration: averageDurationMs ? `${Math.max(Math.round(averageDurationMs / 60000), 1)} min` : 'N/A',
    averageResponseTime: averageDurationMs ? `${Math.max(Math.round(averageDurationMs / 60000), 1)} min` : 'N/A',
    peakSosHours: peakRows.map((item) => ({ label: `${String(item._id).padStart(2, '0')}:00`, value: item.count })),
    comparison: await previousComparison(Sos, {}, range),
    charts: { sosTrends: await trend(Sos, {}, range.days) }
  };
};

const locationAnalyticsData = async (range) => {
  const match = createdMatch(range);
  const [trackingModes, locationTrend, commonAreas] = await Promise.all([
    countByField(Location, 'trackingMode', match),
    trend(Location, {}, Math.min(range.days, 30)),
    Location.aggregate([
      { $match: match },
      { $group: { _id: { lat: { $round: ['$latitude', 2] }, lng: { $round: ['$longitude', 2] } }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
      { $project: { _id: 0, label: { $concat: [{ $toString: '$_id.lat' }, ', ', { $toString: '$_id.lng' }] }, value: '$count' } }
    ])
  ]);
  return {
    mostCommonCities: commonAreas,
    mostCommonStates: [],
    mostActiveAreas: commonAreas,
    nearbySearches: await Location.countDocuments(match),
    liveTrackingSessions: safeNumber(trackingModes.live),
    locationSharingSessions: safeNumber(trackingModes.current),
    mapUsageStatistics: { savedLocations: await Location.countDocuments(), rangeLocations: await Location.countDocuments(match) },
    comparison: await previousComparison(Location, {}, range),
    charts: { nearbyServicesUsage: locationTrend }
  };
};

const emailAnalyticsData = async (range) => {
  const match = createdMatch(range);
  const [status, templates, queued] = await Promise.all([
    countByField(EmailLog, 'status', match),
    countByField(EmailLog, 'template', match),
    EmailQueue.countDocuments({ status: { $in: ['pending', 'processing'] }, ...match })
  ]);
  const total = Object.values(status).reduce((sum, value) => sum + value, 0);
  return {
    emailsSent: safeNumber(status.sent),
    delivered: await EmailLog.countDocuments({ deliveredAt: { $ne: null }, ...match }),
    queued,
    failed: safeNumber(status.failed),
    skipped: safeNumber(status.skipped),
    verificationEmails: Object.entries(templates).filter(([key]) => /verification/i.test(key)).reduce((sum, [, value]) => sum + value, 0),
    forgotPasswordEmails: Object.entries(templates).filter(([key]) => /forgot/i.test(key)).reduce((sum, [, value]) => sum + value, 0),
    resetPasswordEmails: Object.entries(templates).filter(([key]) => /reset|password/i.test(key)).reduce((sum, [, value]) => sum + value, 0),
    welcomeEmails: Object.entries(templates).filter(([key]) => /welcome/i.test(key)).reduce((sum, [, value]) => sum + value, 0),
    providerSuccessRate: percent(safeNumber(status.sent), total),
    byTemplate: templates,
    comparison: await previousComparison(EmailLog, {}, range),
    charts: { emailDelivery: Object.entries(status).map(([label, value]) => ({ label, value })), emailTrend: await trend(EmailLog, {}, Math.min(range.days, 30)) }
  };
};

const notificationAnalyticsData = async (range) => {
  const match = createdMatch(range);
  const [channels, types, results] = await Promise.all([
    countByField(Notification, 'channel', match),
    countByField(Notification, 'type', match),
    countByField(NotificationLog, 'result', match)
  ]);
  const totalLogs = safeNumber(results.success) + safeNumber(results.failed);
  return {
    browserNotifications: safeNumber(channels.browser) + safeNumber(channels['in-app']),
    pushNotifications: safeNumber(channels.push),
    sosNotifications: Object.entries(types).filter(([key]) => /sos|emergency/i.test(key)).reduce((sum, [, value]) => sum + value, 0),
    reminderNotifications: safeNumber(types.reminder),
    failedNotifications: safeNumber(results.failed) + await Notification.countDocuments({ status: 'failed', ...match }),
    deliverySuccessRate: percent(safeNumber(results.success), totalLogs),
    byChannel: channels,
    byType: types,
    comparison: await previousComparison(Notification, {}, range),
    charts: { notificationStatistics: Object.entries(channels).map(([label, value]) => ({ label, value })), notificationTrend: await trend(Notification, {}, Math.min(range.days, 30)) }
  };
};

export const getAnalyticsUsers = async (req, res) => {
  if (!requireReportsAccess(req, res)) return;
  try {
    return res.status(200).json({ success: true, range: getRange(req.query).label, users: await userAnalyticsData(getRange(req.query)) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not load user analytics.', error: error.message });
  }
};

export const getAnalyticsSos = async (req, res) => {
  if (!requireReportsAccess(req, res)) return;
  try {
    return res.status(200).json({ success: true, range: getRange(req.query).label, sos: await sosAnalyticsData(getRange(req.query)) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not load SOS analytics.', error: error.message });
  }
};

export const getAnalyticsLocation = async (req, res) => {
  if (!requireReportsAccess(req, res)) return;
  try {
    return res.status(200).json({ success: true, range: getRange(req.query).label, location: await locationAnalyticsData(getRange(req.query)) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not load location analytics.', error: error.message });
  }
};

export const getAnalyticsEmail = async (req, res) => {
  if (!requireReportsAccess(req, res)) return;
  try {
    return res.status(200).json({ success: true, range: getRange(req.query).label, email: await emailAnalyticsData(getRange(req.query)) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not load email analytics.', error: error.message });
  }
};

export const getAnalyticsNotifications = async (req, res) => {
  if (!requireReportsAccess(req, res)) return;
  try {
    return res.status(200).json({ success: true, range: getRange(req.query).label, notifications: await notificationAnalyticsData(getRange(req.query)) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not load notification analytics.', error: error.message });
  }
};

export const getAnalyticsSystem = async (req, res) => {
  if (!requireReportsAccess(req, res)) return;
  const started = Date.now();
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const dbStats = mongoose.connection.db ? await mongoose.connection.db.stats().catch(() => null) : null;
    const memory = process.memoryUsage();
    const emailStatus = emailProviderStatus();
    const emailConfigured = emailStatus.provider === 'resend' ? emailStatus.resendConfigured : emailStatus.smtpConfigured;
    return res.status(200).json({
      success: true,
      system: {
        serverStatus: 'online',
        databaseStatus: dbStatus,
        mongoDbConnection: dbStatus,
        emailProviderStatus: emailStatus.provider ? `${emailStatus.provider}: ${emailConfigured ? 'configured' : 'not configured'}` : 'not configured',
        mapsServiceStatus: process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY ? 'configured' : 'OSM fallback active',
        notificationServiceStatus: 'available',
        storageUsage: dbStats ? `${Math.round((dbStats.storageSize || 0) / 1024 / 1024)} MB` : 'N/A',
        memoryUsage: `${Math.round(memory.rss / 1024 / 1024)} MB`,
        cpuUsage: `${os.loadavg()[0].toFixed(2)} load avg`,
        applicationVersion: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        serverUptime: `${Math.floor(process.uptime() / 60)} min`,
        responseTime: `${Date.now() - started} ms`,
        devices: await PushDevice.countDocuments({ isActive: true })
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not load system overview.', error: error.message });
  }
};

const buildReport = async (range) => {
  const [users, sos, location, email, notifications, system] = await Promise.all([
    userAnalyticsData(range),
    sosAnalyticsData(range),
    locationAnalyticsData(range),
    emailAnalyticsData(range),
    notificationAnalyticsData(range),
    Promise.resolve({ generatedAt: new Date(), environment: process.env.NODE_ENV || 'development' })
  ]);
  return {
    title: `Raksha24x7 ${range.label} Admin Report`,
    generatedAt: new Date(),
    range: range.label,
    summary: [
      { label: 'Total Users', value: users.totalUsers },
      { label: 'Total SOS', value: sos.totalSos },
      { label: 'Emails Sent', value: email.emailsSent },
      { label: 'Notifications', value: notifications.browserNotifications + notifications.pushNotifications },
      { label: 'Location Events', value: location.mapUsageStatistics.rangeLocations }
    ],
    tables: { users, sos, location, email, notifications, system },
    charts: {
      userGrowth: users.charts.userGrowth,
      sosTrends: sos.charts.sosTrends,
      emailDelivery: email.charts.emailDelivery,
      notificationStatistics: notifications.charts.notificationStatistics,
      nearbyServicesUsage: location.charts.nearbyServicesUsage,
      dailyActiveUsers: users.charts.dailyActiveUsers
    }
  };
};

export const getReports = async (req, res) => {
  if (!requireReportsAccess(req, res)) return;
  try {
    return res.status(200).json({ success: true, report: await buildReport(getRange(req.query)) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not generate report.', error: error.message });
  }
};

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const reportRows = (report) => [
  ['Section', 'Metric', 'Value'],
  ...report.summary.map((item) => ['Summary', item.label, item.value]),
  ...Object.entries(report.tables.users).filter(([, value]) => typeof value !== 'object').map(([key, value]) => ['Users', key, value]),
  ...Object.entries(report.tables.sos).filter(([, value]) => typeof value !== 'object').map(([key, value]) => ['SOS', key, value]),
  ...Object.entries(report.tables.email).filter(([, value]) => typeof value !== 'object').map(([key, value]) => ['Email', key, value]),
  ...Object.entries(report.tables.notifications).filter(([, value]) => typeof value !== 'object').map(([key, value]) => ['Notifications', key, value])
];

export const exportReports = async (req, res) => {
  if (!requireReportsAccess(req, res)) return;
  try {
    const format = String(req.body.format || 'csv').toLowerCase();
    const report = await buildReport(getRange(req.body.filters || req.query));
    const rows = reportRows(report);
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await writeAdminAuditLog({ req, adminId: req.admin?._id, action: 'report_export', message: `Exported ${format} analytics report`, metadata: { format, range: report.range } });
    if (format === 'json') return res.status(200).json({ success: true, report });
    if (format === 'excel' || format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', 'attachment; filename="raksha24x7-report.xls"');
      return res.send(csv);
    }
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="raksha24x7-report.pdf"');
      return res.send(`Raksha24x7 Admin Report\n${report.range}\n\n${rows.map((row) => row.join(' | ')).join('\n')}`);
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="raksha24x7-report.csv"');
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not export report.', error: error.message });
  }
};

export const getAuditLogs = async (req, res) => {
  if (!requireReportsAccess(req, res)) return;
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const query = {};
    if (req.query.admin) query.adminId = req.query.admin;
    if (req.query.action) query.action = new RegExp(String(req.query.action), 'i');
    if (req.query.severity || req.query.status) query.status = req.query.severity || req.query.status;
    if (req.query.module) query.action = new RegExp(String(req.query.module), 'i');
    if (req.query.search) {
      const search = new RegExp(String(req.query.search), 'i');
      query.$or = [{ action: search }, { message: search }, { browser: search }, { ipAddress: search }];
    }
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
    }
    const [items, total] = await Promise.all([
      AdminAuditLog.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('adminId', 'fullName email role').lean(),
      AdminAuditLog.countDocuments(query)
    ]);
    return res.status(200).json({
      success: true,
      logs: items.map((item) => ({
        id: item._id,
        admin: item.adminId ? { name: item.adminId.fullName, email: item.adminId.email, role: item.adminId.role } : null,
        action: item.action,
        module: String(item.action || '').split('_')[0] || 'admin',
        severity: item.status,
        status: item.status,
        message: item.message,
        ipAddress: item.ipAddress,
        browser: item.browser,
        createdAt: item.createdAt
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not load audit logs.', error: error.message });
  }
};

export const globalAdminSearch = async (req, res) => {
  if (!requireReportsAccess(req, res)) return;
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.status(200).json({ success: true, results: [] });
    const search = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [users, sos, emails, notifications, audits, settings] = await Promise.all([
      User.find({ ...nonAdminQuery, $or: [{ name: search }, { email: search }, { phone: search }] }).limit(5).select('name email createdAt').lean(),
      Sos.find({ $or: [{ emergencyId: search }, { status: search }, { address: search }] }).limit(5).select('emergencyId status createdAt').lean(),
      EmailLog.find({ $or: [{ to: search }, { subject: search }, { template: search }, { status: search }] }).limit(5).select('to subject status createdAt').lean(),
      Notification.find({ $or: [{ title: search }, { message: search }, { type: search }, { status: search }] }).limit(5).select('title type status createdAt').lean(),
      AdminAuditLog.find({ $or: [{ action: search }, { message: search }] }).limit(5).select('action status createdAt').lean(),
      AdminSettingsHistory.find({ $or: [{ section: search }, { action: search }] }).limit(5).select('section action createdAt').lean()
    ]);
    const results = [
      ...users.map((item) => ({ type: 'User', title: item.name || item.email, subtitle: item.email, date: item.createdAt, url: '/admin/users' })),
      ...sos.map((item) => ({ type: 'SOS', title: item.emergencyId, subtitle: item.status, date: item.createdAt, url: '/admin/sos' })),
      ...emails.map((item) => ({ type: 'Email', title: item.subject, subtitle: `${item.to} • ${item.status}`, date: item.createdAt, url: '/admin/email' })),
      ...notifications.map((item) => ({ type: 'Notification', title: item.title, subtitle: `${item.type} • ${item.status}`, date: item.createdAt, url: '/admin/analytics' })),
      ...audits.map((item) => ({ type: 'Audit', title: item.action, subtitle: item.status, date: item.createdAt, url: '/admin/analytics' })),
      ...settings.map((item) => ({ type: 'Settings', title: item.section, subtitle: item.action, date: item.createdAt, url: '/admin/settings' }))
    ];
    return res.status(200).json({ success: true, results });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not complete admin search.', error: error.message });
  }
};
