import crypto from 'node:crypto';
import mongoose from 'mongoose';
import AdminSettings from '../models/adminSettings.model.js';
import AdminEmergencyNumber from '../models/adminEmergencyNumber.model.js';
import AdminEmailTemplate from '../models/adminEmailTemplate.model.js';
import AdminSettingsHistory from '../models/adminSettingsHistory.model.js';
import { emailProviderStatus } from '../email/services/emailProvider.service.js';
import { sendEmail } from '../email/services/email.service.js';
import { emailTemplates } from '../email/templates/email.templates.js';
import { getClientIp, parseUserAgent, writeAdminAuditLog } from '../services/adminAuth.service.js';

const WRITE_ROLES = ['super_admin', 'admin'];
const SECRET_FIELDS = new Set(['password', 'passwordEncrypted', 'apiKey']);

const canWriteSettings = (admin) => WRITE_ROLES.includes(String(admin?.role || '').toLowerCase());
const requireWrite = (req, res) => {
  if (canWriteSettings(req.admin)) return false;
  res.status(403).json({ success: false, message: 'Only Super Admin and Admin can modify system settings.' });
  return true;
};

const encryptionKey = () => crypto.createHash('sha256').update(process.env.ADMIN_SETTINGS_SECRET || process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'raksha24x7-dev-secret').digest();
const encryptValue = (value = '') => {
  if (!value) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

const maskSettings = (settings) => {
  const plain = settings.toObject ? settings.toObject() : settings;
  const { smtp = {}, ...rest } = plain;
  return {
    ...rest,
    smtp: {
      ...smtp,
      passwordEncrypted: undefined,
      passwordConfigured: Boolean(smtp.passwordEncrypted)
    }
  };
};

const getSettingsDocument = async () => {
  let settings = await AdminSettings.findOne({ key: 'global' }).select('+smtp.passwordEncrypted');
  if (!settings) settings = await AdminSettings.create({ key: 'global' });
  return settings;
};

const logSettingsChange = async ({ req, module, previousValue, newValue }) => {
  const userAgent = req.headers['user-agent'] || '';
  const browser = parseUserAgent(userAgent).browser;
  await AdminSettingsHistory.create({
    adminId: req.admin._id,
    module,
    previousValue: sanitizeSecrets(previousValue),
    newValue: sanitizeSecrets(newValue),
    ipAddress: getClientIp(req),
    browser,
    userAgent
  });
  await writeAdminAuditLog({ req, adminId: req.admin._id, action: `settings_${module}_updated`, message: `Admin updated ${module} settings.` });
};

const sanitizeSecrets = (value) => {
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET_FIELDS.has(key) ? '[MASKED]' : item]));
};

const mergeSection = async (req, res, section, payload) => {
  if (requireWrite(req, res)) return undefined;
  try {
    const settings = await getSettingsDocument();
    const previous = settings[section]?.toObject?.() || settings[section] || {};
    settings[section] = { ...previous, ...payload };
    await settings.save();
    await logSettingsChange({ req, module: section, previousValue: previous, newValue: settings[section]?.toObject?.() || settings[section] });
    return res.status(200).json({ success: true, message: `${section} settings saved.`, settings: maskSettings(settings) });
  } catch {
    return res.status(500).json({ success: false, message: `Could not save ${section} settings.` });
  }
};

export const getAdminSettings = async (req, res) => {
  try {
    const [settings, history, emergencyNumbers, templates, backup] = await Promise.all([
      getSettingsDocument(),
      AdminSettingsHistory.find().sort({ createdAt: -1 }).limit(20).populate('adminId', 'fullName email').lean(),
      ensureEmergencyNumbers(),
      ensureEmailTemplates(),
      getBackupInfo()
    ]);
    return res.status(200).json({
      success: true,
      settings: maskSettings(settings),
      history,
      emergencyNumbers: emergencyNumbers.slice(0, 10),
      emailTemplates: templates,
      backup
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load system settings.' });
  }
};

export const updateGeneralSettings = (req, res) => mergeSection(req, res, 'general', {
  applicationName: String(req.body.applicationName || 'Raksha24x7').slice(0, 80),
  applicationLogo: String(req.body.applicationLogo || '').slice(0, 500),
  supportEmail: String(req.body.supportEmail || '').slice(0, 120),
  supportPhone: String(req.body.supportPhone || '').slice(0, 40),
  companyName: String(req.body.companyName || '').slice(0, 120),
  copyright: String(req.body.copyright || '').slice(0, 200),
  timezone: String(req.body.timezone || 'Asia/Kolkata').slice(0, 80),
  dateFormat: String(req.body.dateFormat || 'DD MMM YYYY').slice(0, 40),
  timeFormat: String(req.body.timeFormat || '12h').slice(0, 20),
  defaultLanguage: String(req.body.defaultLanguage || 'en-IN').slice(0, 20),
  defaultCountry: String(req.body.defaultCountry || 'IN').slice(0, 10).toUpperCase()
});

export const updateSmtpSettings = async (req, res) => {
  if (requireWrite(req, res)) return undefined;
  try {
    const settings = await getSettingsDocument();
    const previous = settings.smtp?.toObject?.() || settings.smtp || {};
    const smtp = {
      provider: String(req.body.provider || previous.provider || 'resend').toLowerCase(),
      host: String(req.body.host || '').slice(0, 120),
      port: Number(req.body.port || 587),
      username: String(req.body.username || '').slice(0, 160),
      senderEmail: String(req.body.senderEmail || '').slice(0, 160),
      senderName: String(req.body.senderName || 'Raksha24x7').slice(0, 80),
      encryption: ['none', 'tls', 'ssl', 'starttls'].includes(req.body.encryption) ? req.body.encryption : 'tls',
      connectionTimeout: Math.max(1000, Number(req.body.connectionTimeout || 10000))
    };
    settings.smtp = { ...previous, ...smtp };
    if (req.body.password) settings.smtp.passwordEncrypted = encryptValue(req.body.password);
    await settings.save();
    await logSettingsChange({ req, module: 'smtp', previousValue: previous, newValue: settings.smtp?.toObject?.() || settings.smtp });
    return res.status(200).json({ success: true, message: 'SMTP settings saved.', settings: maskSettings(settings) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not save SMTP settings.' });
  }
};

export const updateThemeSettings = (req, res) => mergeSection(req, res, 'theme', req.body || {});
export const updateApplicationSettings = (req, res) => mergeSection(req, res, 'application', req.body || {});
export const updateSecuritySettings = (req, res) => mergeSection(req, res, 'security', req.body || {});
export const updateMaintenanceSettings = (req, res) => mergeSection(req, res, 'maintenance', req.body || {});

const defaultTemplateRows = () => Object.entries(emailTemplates).map(([templateId, renderer]) => {
  const sample = renderer({ name: 'Raksha User', verifyUrl: '#', resetUrl: '#', dashboardUrl: '#', completeProfileUrl: '#', secureUrl: '#' });
  return {
    templateId,
    name: templateId.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
    subject: sample.subject || templateId,
    body: sample.html || sample.text || '',
    variables: ['name', 'dashboardUrl', 'verifyUrl', 'resetUrl', 'secureUrl']
  };
});

const ensureEmailTemplates = async () => {
  const count = await AdminEmailTemplate.countDocuments();
  if (!count) await AdminEmailTemplate.insertMany(defaultTemplateRows());
  return AdminEmailTemplate.find().sort({ templateId: 1 }).lean();
};

export const getEmailTemplateSettings = async (req, res) => {
  try {
    return res.status(200).json({ success: true, templates: await ensureEmailTemplates() });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load email templates.' });
  }
};

export const updateEmailTemplateSetting = async (req, res) => {
  if (requireWrite(req, res)) return undefined;
  try {
    const previous = await AdminEmailTemplate.findOne({ templateId: req.params.id }).lean();
    const template = await AdminEmailTemplate.findOneAndUpdate(
      { templateId: req.params.id },
      {
        subject: String(req.body.subject || '').slice(0, 200),
        body: String(req.body.body || ''),
        enabled: req.body.enabled !== false,
        updatedBy: req.admin._id,
        $inc: { version: 1 }
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    await logSettingsChange({ req, module: `email-template:${req.params.id}`, previousValue: previous || {}, newValue: template });
    return res.status(200).json({ success: true, message: 'Email template saved.', template });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not save email template.' });
  }
};

export const sendEmailTemplateTest = async (req, res) => {
  if (requireWrite(req, res)) return undefined;
  try {
    const to = req.body.to || req.admin.email;
    const template = await AdminEmailTemplate.findOne({ templateId: req.body.templateId || req.params.id }).lean();
    if (!template) return res.status(404).json({ success: false, message: 'Template not found.' });
    await sendEmail({ to, subject: `[Test] ${template.subject}`, html: template.body, text: template.subject, template: template.templateId, metadata: { adminTest: true } });
    await writeAdminAuditLog({ req, adminId: req.admin._id, action: 'settings_email_template_test', message: 'Admin sent test email template.', metadata: { templateId: template.templateId, to } });
    return res.status(200).json({ success: true, message: 'Test email queued/sent.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Could not send test email.' });
  }
};

const defaultEmergencyNumbers = [
  { service: 'Police', number: '100', category: 'police', country: 'IN', priority: 95 },
  { service: 'National Emergency Response', number: '112', category: 'police', country: 'IN', priority: 100 },
  { service: 'Ambulance', number: '108', category: 'ambulance', country: 'IN', priority: 99 },
  { service: 'Fire Brigade', number: '101', category: 'fire', country: 'IN', priority: 94 },
  { service: 'Women Helpline', number: '1091', category: 'women', country: 'IN', priority: 98 },
  { service: 'Child Helpline', number: '1098', category: 'child', country: 'IN', priority: 97 }
];

const ensureEmergencyNumbers = async () => {
  const count = await AdminEmergencyNumber.countDocuments();
  if (!count) await AdminEmergencyNumber.insertMany(defaultEmergencyNumbers);
  return AdminEmergencyNumber.find().sort({ priority: -1, service: 1 }).lean();
};

export const listEmergencyNumbers = async (req, res) => {
  try {
    await ensureEmergencyNumbers();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(5, Number(req.query.limit || 10)));
    const query = {};
    if (req.query.search) query.$or = [{ service: { $regex: req.query.search, $options: 'i' } }, { number: { $regex: req.query.search, $options: 'i' } }];
    if (req.query.country && req.query.country !== 'all') query.country = String(req.query.country).toUpperCase();
    if (req.query.category && req.query.category !== 'all') query.category = req.query.category;
    if (req.query.enabled && req.query.enabled !== 'all') query.enabled = req.query.enabled === 'true';
    const [items, total] = await Promise.all([
      AdminEmergencyNumber.find(query).sort({ priority: -1, service: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      AdminEmergencyNumber.countDocuments(query)
    ]);
    return res.status(200).json({ success: true, items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not load emergency numbers.' });
  }
};

export const createEmergencyNumber = async (req, res) => {
  if (requireWrite(req, res)) return undefined;
  try {
    const item = await AdminEmergencyNumber.create({ ...req.body, createdBy: req.admin._id, updatedBy: req.admin._id });
    await logSettingsChange({ req, module: 'emergency-number:create', previousValue: {}, newValue: item.toObject() });
    return res.status(201).json({ success: true, message: 'Emergency number added.', item });
  } catch (error) {
    return res.status(error.code === 11000 ? 409 : 500).json({ success: false, message: error.code === 11000 ? 'Emergency number already exists for this country/category.' : 'Could not add emergency number.' });
  }
};

export const updateEmergencyNumber = async (req, res) => {
  if (requireWrite(req, res)) return undefined;
  try {
    const previous = await AdminEmergencyNumber.findById(req.params.id).lean();
    const item = await AdminEmergencyNumber.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.admin._id }, { new: true, runValidators: true }).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Emergency number not found.' });
    await logSettingsChange({ req, module: 'emergency-number:update', previousValue: previous || {}, newValue: item });
    return res.status(200).json({ success: true, message: 'Emergency number updated.', item });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not update emergency number.' });
  }
};

export const deleteEmergencyNumber = async (req, res) => {
  if (requireWrite(req, res)) return undefined;
  try {
    const item = await AdminEmergencyNumber.findByIdAndDelete(req.params.id).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Emergency number not found.' });
    await logSettingsChange({ req, module: 'emergency-number:delete', previousValue: item, newValue: {} });
    return res.status(200).json({ success: true, message: 'Emergency number deleted.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not delete emergency number.' });
  }
};

export const testSmtpSettings = async (req, res) => {
  if (requireWrite(req, res)) return undefined;
  try {
    const settings = await getSettingsDocument();
    const status = emailProviderStatus();
    const success = status.provider === 'resend' ? status.resendConfigured : status.smtpConfigured;
    settings.smtp.lastTestedAt = new Date();
    settings.smtp.lastTestStatus = success ? 'success' : 'failed';
    settings.smtp.lastTestMessage = success ? `${status.provider} appears configured.` : `${status.provider} is not fully configured.`;
    await settings.save();
    return res.status(success ? 200 : 400).json({ success, message: settings.smtp.lastTestMessage, status: { ...status, from: status.from } });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not test SMTP settings.' });
  }
};

const getBackupInfo = async () => {
  const provider = emailProviderStatus();
  return {
    databaseStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    lastBackup: null,
    backupSize: 'N/A',
    storageUsage: 'N/A',
    environmentStatus: process.env.NODE_ENV || 'development',
    emailProviderStatus: provider.provider,
    mapsServiceStatus: 'OpenStreetMap fallback ready',
    notificationServiceStatus: 'available'
  };
};
