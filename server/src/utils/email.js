import { sendEmail as deliverEmail, sendTemplateEmail } from '../email/services/email.service.js';

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';
const nowLabel = () => new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export const sendEmail = deliverEmail;

export const sendWelcomeEmail = ({ to, name, userId }) => sendTemplateEmail({
  to,
  userId,
  template: 'welcome',
  data: {
    name,
    dashboardUrl: `${clientUrl()}/dashboard`,
    completeProfileUrl: `${clientUrl()}/complete-profile`
  }
});

export const sendAccountCreatedEmail = ({ to, name, userId }) => sendTemplateEmail({
  to,
  userId,
  template: 'accountCreated',
  data: { name, dashboardUrl: `${clientUrl()}/dashboard` }
});

export const sendVerificationEmail = ({ to, name, verifyUrl, userId }) => sendTemplateEmail({
  to,
  userId,
  template: 'verification',
  data: { name, verifyUrl }
});

export const sendPasswordResetEmail = ({ to, name, resetUrl, userId }) => sendTemplateEmail({
  to,
  userId,
  template: 'passwordReset',
  data: { name, resetUrl }
});

export const sendPasswordChangedEmail = ({ to, name, userId, req }) => sendTemplateEmail({
  to,
  userId,
  template: 'passwordChanged',
  data: {
    name,
    time: nowLabel(),
    browser: req?.get?.('user-agent') || 'Unknown browser',
    device: req?.get?.('sec-ch-ua-platform') || 'Unknown device',
    location: 'Unavailable',
    secureUrl: `${clientUrl()}/settings/security`
  }
});

export const sendEmailVerifiedEmail = ({ to, name, userId }) => sendTemplateEmail({
  to,
  userId,
  template: 'emailVerified',
  data: { name, dashboardUrl: `${clientUrl()}/dashboard` }
});

export const sendLoginSecurityAlertEmail = ({ to, name, userId, req }) => sendTemplateEmail({
  to,
  userId,
  template: 'loginSecurityAlert',
  data: {
    name,
    time: nowLabel(),
    ip: req?.ip || req?.headers?.['x-forwarded-for'] || 'Unknown IP',
    browser: req?.get?.('user-agent') || 'Unknown browser',
    device: req?.get?.('sec-ch-ua-platform') || 'Unknown device',
    location: 'Unavailable',
    secureUrl: `${clientUrl()}/settings/security`
  }
});
