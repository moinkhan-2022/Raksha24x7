import nodemailer from 'nodemailer';

const providerName = () => String(process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : 'smtp')).toLowerCase();
const fromEmail = () => process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@raksha24x7.com';
const fromName = () => process.env.EMAIL_FROM_NAME || 'Raksha24x7';

const formatFrom = () => {
  const from = fromEmail();
  if (from.includes('<')) return from;
  return `${fromName()} <${from}>`;
};

const hasSmtpConfig = () => Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);

const createTransporter = () => nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
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
  resendConfigured: Boolean(process.env.RESEND_API_KEY),
  smtpConfigured: hasSmtpConfig()
});
