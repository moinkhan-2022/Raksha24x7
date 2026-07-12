import EmailLog from '../models/emailLog.model.js';
import EmailQueue from '../models/emailQueue.model.js';
import { emailTemplates } from '../templates/email.templates.js';
import { emailProviderStatus, sendViaProvider } from './emailProvider.service.js';
import logger, { logError } from '../../config/logger.js';
import { recordTimedOperation } from '../../services/monitoring.service.js';

const shouldSkipDelivery = () => {
  const status = emailProviderStatus();
  return status.provider === 'resend' ? !status.resendConfigured : !status.smtpConfigured;
};

export const sendEmail = async ({
  userId = null,
  to,
  subject,
  html,
  text = '',
  template = 'custom',
  attachments = [],
  inlineImages = [],
  metadata = {}
}) => {
  const providerStatus = emailProviderStatus();
  const log = await EmailLog.create({
    userId,
    to,
    from: providerStatus.from,
    subject,
    template,
    provider: providerStatus.provider,
    status: 'queued',
    metadata
  });

  await EmailQueue.create({
    userId,
    to,
    subject,
    template,
    payload: { html, text, attachments, inlineImages, metadata }
  }).catch(() => undefined);

  if (shouldSkipDelivery()) {
    log.status = 'skipped';
    log.error = `${providerStatus.provider} email provider is not configured.`;
    log.lastAttemptAt = new Date();
    await log.save();
    logger.info('Email skipped because provider is not configured', { template, provider: providerStatus.provider, userId });
    return { skipped: true, logId: log._id, provider: providerStatus.provider };
  }

  try {
    const result = await recordTimedOperation('email.send', () => sendViaProvider({
      to,
      subject,
      html,
      text,
      attachments: attachments.length ? attachments : inlineImages
    }), { template, userId, provider: providerStatus.provider });
    log.status = 'sent';
    log.provider = result.provider || providerStatus.provider;
    log.messageId = result.messageId || '';
    log.lastAttemptAt = new Date();
    log.deliveredAt = new Date();
    await log.save();
    return { success: true, logId: log._id, ...result };
  } catch (error) {
    log.status = 'failed';
    log.error = error.message || 'Email delivery failed.';
    log.retryCount = Number(log.retryCount || 0) + 1;
    log.lastAttemptAt = new Date();
    await log.save();
    logError(error, { scope: 'email_send', template, provider: providerStatus.provider, userId });
    throw error;
  }
};

export const sendTemplateEmail = async ({ template, to, userId = null, data = {}, metadata = {}, attachments = [], inlineImages = [] }) => {
  const renderer = emailTemplates[template];
  if (!renderer) throw new Error(`Unknown email template: ${template}`);
  const rendered = renderer(data);
  return sendEmail({
    userId,
    to,
    template,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    metadata,
    attachments,
    inlineImages
  });
};

export const retryFailedEmails = async ({ limit = 10 } = {}) => {
  const failedLogs = await EmailLog.find({ status: 'failed', retryCount: { $lt: 3 } }).sort({ updatedAt: 1 }).limit(limit);
  const results = [];

  for (const log of failedLogs) {
    log.status = 'queued';
    log.retryCount = Number(log.retryCount || 0) + 1;
    await log.save();
    results.push({ logId: log._id, queued: true });
  }

  return results;
};
