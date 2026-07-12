import mongoose from 'mongoose';
import EmailLog from '../email/models/emailLog.model.js';
import EmailQueue from '../email/models/emailQueue.model.js';
import { emailTemplates } from '../email/templates/email.templates.js';
import { retryFailedEmails } from '../email/services/email.service.js';
import { writeAdminAuditLog } from '../services/adminAuth.service.js';

const dayMs = 24 * 60 * 60 * 1000;
const WRITE_ROLES = ['super_admin', 'admin'];

const canRetryEmails = (admin) => WRITE_ROLES.includes(String(admin?.role || '').toLowerCase());

const rangeQuery = (range = '7d') => {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'today') return { $gte: startToday, $lte: now };
  if (range === 'yesterday') return { $gte: new Date(startToday.getTime() - dayMs), $lt: startToday };
  if (range === '30d') return { $gte: new Date(Date.now() - 30 * dayMs), $lte: now };
  if (range === 'all') return null;
  return { $gte: new Date(Date.now() - 7 * dayMs), $lte: now };
};

const normalizeStatus = (status) => {
  if (status === 'delivered') return 'sent';
  if (status === 'pending') return 'queued';
  if (['queued', 'sent', 'failed', 'skipped'].includes(status)) return status;
  return 'all';
};

const buildLogQuery = (params = {}) => {
  const query = {};
  const search = String(params.search || '').trim();
  const range = rangeQuery(params.range || '7d');
  const status = normalizeStatus(String(params.status || 'all'));
  if (range) query.createdAt = range;
  if (status !== 'all') query.status = status;
  if (params.provider && params.provider !== 'all') query.provider = String(params.provider).toLowerCase();
  if (params.template && params.template !== 'all') query.template = String(params.template);
  if (search) {
    query.$or = [
      { to: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
      { template: { $regex: search, $options: 'i' } },
      { messageId: { $regex: search, $options: 'i' } },
      { provider: { $regex: search, $options: 'i' } }
    ];
  }
  return query;
};

const sortMap = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  recipient: { to: 1 },
  subject: { subject: 1 },
  status: { status: 1 },
  retry: { retryCount: -1 },
  provider: { provider: 1 }
};

const serializeLog = (log) => ({
  id: log._id,
  to: log.to,
  from: log.from,
  subject: log.subject,
  template: log.template,
  provider: log.provider,
  status: log.deliveredAt ? 'delivered' : log.status,
  rawStatus: log.status,
  messageId: log.messageId,
  error: log.error,
  retryCount: log.retryCount || 0,
  lastAttemptAt: log.lastAttemptAt,
  deliveredAt: log.deliveredAt,
  metadata: log.metadata || {},
  createdAt: log.createdAt,
  updatedAt: log.updatedAt
});

const serializeQueue = (item) => ({
  id: item._id,
  to: item.to,
  subject: item.subject,
  template: item.template,
  status: item.status,
  priority: item.payload?.priority || 'normal',
  retryCount: item.attempts || 0,
  maxAttempts: item.maxAttempts,
  nextAttemptAt: item.nextAttemptAt,
  waitingDuration: item.createdAt ? `${Math.max(0, Math.round((Date.now() - new Date(item.createdAt)) / 60000))} min` : 'N/A',
  lastError: item.lastError,
  sentAt: item.sentAt,
  createdAt: item.createdAt
});

const countByField = async (Model, field, match = {}) => {
  const rows = await Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  return rows.reduce((acc, row) => ({ ...acc, [row._id || 'unknown']: row.count }), {});
};

export const listAdminEmailLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(5, Number(req.query.limit || 10)));
    const query = buildLogQuery(req.query);
    const sort = sortMap[String(req.query.sort || 'newest')] || sortMap.newest;
    const [logs, total, statistics] = await Promise.all([
      EmailLog.find(query).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      EmailLog.countDocuments(query),
      getEmailStatisticsData(req.query)
    ]);
    return res.status(200).json({
      success: true,
      logs: logs.map(serializeLog),
      statistics,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load email logs.' });
  }
};

export const getAdminEmailLogDetails = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Valid email log ID is required.' });
    const log = await EmailLog.findById(req.params.id).lean();
    if (!log) return res.status(404).json({ success: false, message: 'Email log not found.' });
    const queue = await EmailQueue.findOne({ to: log.to, subject: log.subject, template: log.template }).sort({ createdAt: -1 }).lean();
    const preview = buildPreview(log, queue);
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'viewed_email', message: 'Admin viewed email log.', metadata: { emailId: req.params.id } });
    return res.status(200).json({ success: true, log: serializeLog(log), queue: queue ? serializeQueue(queue) : null, preview });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load email details.' });
  }
};

const buildPreview = (log, queue) => {
  const payload = queue?.payload || {};
  if (payload.html || payload.text) return { html: payload.html || '', text: payload.text || '' };
  const renderer = emailTemplates[log.template] || emailTemplates.custom;
  if (renderer) {
    try {
      const rendered = renderer({ name: 'Raksha User', verifyUrl: '#', resetUrl: '#', dashboardUrl: '#', completeProfileUrl: '#', secureUrl: '#' });
      return { html: rendered.html || '', text: rendered.text || '' };
    } catch {
      return { html: '', text: '' };
    }
  }
  return { html: '', text: '' };
};

export const listAdminEmailQueue = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(5, Number(req.query.limit || 10)));
    const query = {};
    if (req.query.status && req.query.status !== 'all') query.status = req.query.status;
    const [queue, total] = await Promise.all([
      EmailQueue.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      EmailQueue.countDocuments(query)
    ]);
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'viewed_email_queue', message: 'Admin viewed email queue.' });
    return res.status(200).json({ success: true, queue: queue.map(serializeQueue), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load email queue.' });
  }
};

const getEmailStatisticsData = async (params = {}) => {
  const range = rangeQuery(params.range || '7d');
  const match = range ? { createdAt: range } : {};
  const [statusCounts, providerCounts, templateCounts, total, queuePending, retried, today, weekly, monthly, deliveredRows] = await Promise.all([
    countByField(EmailLog, 'status', match),
    countByField(EmailLog, 'provider', match),
    countByField(EmailLog, 'template', match),
    EmailLog.countDocuments(match),
    EmailQueue.countDocuments({ status: { $in: ['pending', 'processing'] } }),
    EmailLog.countDocuments({ retryCount: { $gt: 0 }, ...match }),
    EmailLog.countDocuments({ createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) } }),
    EmailLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * dayMs) } }),
    EmailLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * dayMs) } }),
    EmailLog.find({ deliveredAt: { $ne: null }, ...match }).select('createdAt deliveredAt').limit(1000).lean()
  ]);
  const delivered = statusCounts.sent || 0;
  const failed = statusCounts.failed || 0;
  const queued = statusCounts.queued || 0;
  const skipped = statusCounts.skipped || 0;
  const averageMs = deliveredRows.length ? deliveredRows.reduce((sum, item) => sum + (new Date(item.deliveredAt) - new Date(item.createdAt)), 0) / deliveredRows.length : 0;
  const topTemplate = Object.entries(templateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  const topProvider = Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  return {
    total,
    delivered,
    queued,
    failed,
    pending: queuePending,
    retried,
    skipped,
    today,
    weekly,
    monthly,
    deliveryRate: total ? Math.round((delivered / total) * 100) : 0,
    failureRate: total ? Math.round((failed / total) * 100) : 0,
    retryRate: total ? Math.round((retried / total) * 100) : 0,
    averageDeliveryTime: averageMs ? `${Math.max(1, Math.round(averageMs / 1000))} sec` : 'N/A',
    mostUsedTemplate: topTemplate,
    mostUsedProvider: topProvider,
    statusCounts,
    providerCounts,
    templateCounts
  };
};

export const getAdminEmailStatistics = async (req, res) => {
  try {
    return res.status(200).json({ success: true, statistics: await getEmailStatisticsData(req.query) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load email statistics.' });
  }
};

export const retryAdminEmail = async (req, res) => {
  if (!canRetryEmails(req.admin)) return res.status(403).json({ success: false, message: 'Only Super Admin and Admin can retry emails.' });
  try {
    const log = await EmailLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Email log not found.' });
    if (log.status !== 'failed') return res.status(400).json({ success: false, message: 'Only failed emails can be retried.' });
    log.status = 'queued';
    log.retryCount = Number(log.retryCount || 0) + 1;
    log.lastAttemptAt = new Date();
    await log.save();
    await EmailQueue.create({ userId: log.userId, to: log.to, subject: log.subject, template: log.template, status: 'pending', attempts: log.retryCount, payload: { metadata: log.metadata || {}, retryLogId: log._id } }).catch(() => undefined);
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'retried_email', message: 'Admin retried failed email.', metadata: { emailId: req.params.id } });
    return res.status(200).json({ success: true, message: 'Email queued for retry.', log: serializeLog(log) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not retry email.' });
  }
};

export const retryFailedAdminEmails = async (req, res) => {
  if (!canRetryEmails(req.admin)) return res.status(403).json({ success: false, message: 'Only Super Admin and Admin can retry emails.' });
  try {
    const results = await retryFailedEmails({ limit: Math.min(100, Number(req.body?.limit || 25)) });
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'retried_failed_emails', message: 'Admin retried failed emails.', metadata: { count: results.length } });
    return res.status(200).json({ success: true, message: 'Failed emails queued for retry.', results, count: results.length });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not retry failed emails.' });
  }
};

const csvEscape = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`;

export const exportAdminEmailLogs = async (req, res) => {
  try {
    const format = String(req.body?.format || 'csv').toLowerCase();
    const query = buildLogQuery(req.body?.filters || {});
    const logs = await EmailLog.find(query).sort({ createdAt: -1 }).limit(5000).lean();
    const headers = ['Status', 'Recipient', 'Subject', 'Template', 'Provider', 'Message ID', 'Created', 'Delivered', 'Retry Count', 'Error'];
    const rows = logs.map((log) => [serializeLog(log).status, log.to, log.subject, log.template, log.provider, log.messageId, log.createdAt, log.deliveredAt, log.retryCount, log.error]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'exported_email_logs', message: `Admin exported email logs as ${format}.`, metadata: { count: logs.length, format } });
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="raksha-email-logs.pdf"');
      return res.send(Buffer.from(`Raksha24x7 Email Logs Export\n\n${csv}`));
    }
    res.setHeader('Content-Type', format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="raksha-email-logs.${format === 'excel' ? 'xls' : 'csv'}"`);
    return res.send(csv);
  } catch {
    return res.status(500).json({ success: false, message: 'Could not export email logs.' });
  }
};
