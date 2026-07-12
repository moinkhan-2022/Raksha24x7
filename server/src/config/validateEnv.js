import { isProduction } from './security.js';
import logger from './logger.js';
import { appConfig } from './appConfig.js';

const requiredAlways = ['MONGODB_URI', 'JWT_SECRET', 'ADMIN_JWT_SECRET'];
const requiredProduction = [
  'CLIENT_URL',
  'SERVER_URL',
  'COOKIE_SECRET',
  'SESSION_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];
const smtpConfigured = () => (
  ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'].every(hasValue)
  || ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'].every(hasValue)
  || hasValue('RESEND_API_KEY')
);
const weakDefaults = new Set(['secret', 'password', 'changeme', 'replace_with_strong_secret', 'replace_with_separate_strong_admin_secret', 'replace_with_signed_cookie_secret', 'Raksha24x7Secret123']);
const allowedBackupProviders = new Set(['local', 'atlas', 's3', 'gcs', 'azure']);
const allowedBackupSchedules = new Set(['disabled', 'daily', 'weekly', 'monthly']);

const hasValue = (key) => Boolean(String(process.env[key] || '').trim());
const mask = (value = '') => `${String(value).slice(0, 3)}***${String(value).slice(-3)}`;

const validateSecret = (key, errors, warnings) => {
  const value = String(process.env[key] || '');
  if (!value) return;
  if (value.length < 32) {
    const message = `${key} should be at least 32 characters.`;
    if (isProduction) errors.push(message);
    else warnings.push(message);
  }
  if (weakDefaults.has(value)) {
    const message = `${key} is using a weak/default value (${mask(value)}).`;
    if (isProduction) errors.push(message);
    else warnings.push(message);
  }
};

export const validateEnvironment = () => {
  const errors = [];
  const warnings = [];

  for (const key of requiredAlways) {
    if (!hasValue(key)) errors.push(`Missing required environment variable: ${key}`);
  }

  validateSecret('JWT_SECRET', errors, warnings);
  validateSecret('ADMIN_JWT_SECRET', errors, warnings);
  validateSecret('COOKIE_SECRET', errors, warnings);
  validateSecret('SESSION_SECRET', errors, warnings);

  if (isProduction) {
    for (const key of requiredProduction) {
      if (!hasValue(key)) errors.push(`Missing production environment variable: ${key}`);
    }
    if (!smtpConfigured()) errors.push('Missing production email provider configuration. Set EMAIL_*, SMTP_* or RESEND_API_KEY.');
    if (!hasValue('CORS_ORIGINS') && !hasValue('ALLOWED_ORIGINS')) warnings.push('CORS_ORIGINS is not set. CLIENT_URL will be the only browser origin allowed.');
    if (appConfig.clientUrl.includes('localhost') || appConfig.serverUrl.includes('localhost')) {
      errors.push('Production CLIENT_URL and SERVER_URL must not use localhost.');
    }
    if (!String(process.env.MONGODB_URI || '').includes('mongodb+srv://')) {
      warnings.push('Production MongoDB should usually use a MongoDB Atlas mongodb+srv:// URI.');
    }
  }

  if (process.env.JWT_SECRET && process.env.ADMIN_JWT_SECRET && process.env.JWT_SECRET === process.env.ADMIN_JWT_SECRET) {
    errors.push('JWT_SECRET and ADMIN_JWT_SECRET must be different.');
  }

  if (!allowedBackupProviders.has(appConfig.backup.provider)) {
    errors.push(`BACKUP_PROVIDER must be one of: ${[...allowedBackupProviders].join(', ')}.`);
  }
  if (!allowedBackupSchedules.has(appConfig.backup.schedule)) {
    errors.push(`BACKUP_SCHEDULE must be one of: ${[...allowedBackupSchedules].join(', ')}.`);
  }
  if (appConfig.backup.retentionDays < 1) errors.push('BACKUP_RETENTION_DAYS must be at least 1.');
  if (appConfig.backup.encryption && !appConfig.backup.encryptionKeyConfigured) {
    errors.push('BACKUP_ENCRYPTION_KEY is required when BACKUP_ENCRYPTION=true.');
  }
  if (isProduction && appConfig.backup.enabled && appConfig.backup.provider === 'local') {
    warnings.push('Production BACKUP_PROVIDER=local is suitable only for temporary backups. Prefer MongoDB Atlas snapshots or cloud object storage.');
  }

  if (warnings.length) {
    warnings.forEach((message) => logger.warn('Environment warning', { message }));
  }

  if (errors.length) {
    const error = new Error(`Environment validation failed:\n${errors.map((item) => `- ${item}`).join('\n')}`);
    error.name = 'EnvironmentValidationError';
    throw error;
  }

  return { valid: true, warnings };
};
