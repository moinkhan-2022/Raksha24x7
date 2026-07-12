import { isProduction } from './security.js';
import logger from './logger.js';

const requiredAlways = ['MONGODB_URI', 'JWT_SECRET', 'ADMIN_JWT_SECRET'];
const productionRecommended = ['CLIENT_URL', 'GOOGLE_CLIENT_ID'];
const smtpConfigured = () => (
  ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'].every(hasValue)
  || ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'].every(hasValue)
  || hasValue('RESEND_API_KEY')
);
const weakDefaults = new Set(['secret', 'password', 'changeme', 'replace_with_strong_secret', 'Raksha24x7Secret123']);

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

  if (isProduction) {
    for (const key of productionRecommended) {
      if (!hasValue(key)) errors.push(`Missing production environment variable: ${key}`);
    }
    if (!smtpConfigured()) warnings.push('No production email provider is fully configured. Set EMAIL_*, SMTP_* or RESEND_API_KEY.');
  }

  if (process.env.JWT_SECRET && process.env.ADMIN_JWT_SECRET && process.env.JWT_SECRET === process.env.ADMIN_JWT_SECRET) {
    errors.push('JWT_SECRET and ADMIN_JWT_SECRET must be different.');
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
