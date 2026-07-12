import nodemailer from 'nodemailer';
import { appConfig } from '../../config/appConfig.js';
import logger, { logError } from '../../config/logger.js';

const providerName = () => appConfig.email.provider;
const fromEmail = () => appConfig.email.from;
const fromName = () => appConfig.email.fromName;

const formatFrom = () => {
  const from = fromEmail();
  if (from.includes('<')) return from;
  return `${fromName()} <${from}>`;
};

const hasSmtpConfig = () => Boolean(appConfig.email.host && appConfig.email.user && appConfig.email.passConfigured);

const createTransporter = () => nodemailer.createTransport({
  host: appConfig.email.host,
  port: appConfig.email.port,
  secure: appConfig.email.port === 465,
  connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 10000),
  greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 10000),
  socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 15000),
  auth: {
    user: appConfig.email.user,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS
  }
});

const sendWithResend = async ({ to, subject, html, text, attachments }) => {
  if (!process.env.RESEND_API_KEY) {
    const error = new Error('RESEND_API_KEY is not configured.');
    error.code = 'EMAIL_PROVIDER_NOT_CONFIGURED';
    throw error;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: formatFrom(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      attachments
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.message || 'Resend email delivery failed.');
    error.response = payload;
    throw error;
  }

  return { provider: 'resend', messageId: payload?.id || '' };
};

const sendWithSmtp = async ({ to, subject, html, text, attachments }) => {
  if (!hasSmtpConfig()) {
    const error = new Error('SMTP email settings are not configured.');
    error.code = 'EMAIL_PROVIDER_NOT_CONFIGURED';
    throw error;
  }

  const transporter = createTransporter();
  const info = await transporter.sendMail({ from: formatFrom(), to, subject, html, text, attachments });
  return { provider: 'smtp', messageId: info?.messageId || '' };
};

export const sendViaProvider = async (email) => {
  const provider = providerName();
  if (provider === 'resend') return sendWithResend(email);
  if (['smtp', 'gmail', 'sendgrid', 'mailgun', 'ses'].includes(provider)) return sendWithSmtp(email);

  const error = new Error(`Unsupported email provider: ${provider}`);
  error.code = 'EMAIL_PROVIDER_UNSUPPORTED';
  throw error;
};

export const emailProviderStatus = () => ({
  provider: providerName(),
  from: formatFrom(),
  resendConfigured: appConfig.email.resendConfigured,
  smtpConfigured: hasSmtpConfig()
});

export const verifyEmailProvider = async () => {
  const provider = providerName();
  try {
    if (provider === 'resend') {
      const configured = appConfig.email.resendConfigured;
      logger.info('Email provider verification completed', { provider, configured });
      return { provider, configured };
    }
    if (['smtp', 'gmail', 'sendgrid', 'mailgun', 'ses'].includes(provider)) {
      if (!hasSmtpConfig()) return { provider, configured: false };
      await createTransporter().verify();
      logger.info('SMTP provider verified', { provider, host: appConfig.email.host, port: appConfig.email.port });
      return { provider, configured: true };
    }
    return { provider, configured: false, unsupported: true };
  } catch (error) {
    logError(error, { scope: 'email_provider_verify', provider });
    return { provider, configured: false, error: error.message };
  }
};
