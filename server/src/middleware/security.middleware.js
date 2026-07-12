import compression from 'compression';
import hpp from 'hpp';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { permissionsPolicy } from '../config/security.js';
import { logSecurityEvent } from '../config/logger.js';
import { appConfig } from '../config/appConfig.js';

const DANGEROUS_KEYS = new Set(['$where', '$regex', '$ne', '$gt', '$gte', '$lt', '$lte', '$or', '$and', '$nor', '$expr', '$function']);
const SCRIPT_PATTERN = /<\s*\/?\s*script\b[^>]*>/gi;
const JS_URL_PATTERN = /javascript\s*:/gi;
const EVENT_HANDLER_PATTERN = /\son[a-z]+\s*=/gi;
const isProduction = process.env.NODE_ENV === 'production';

const sanitizeString = (value) => String(value)
  .replace(/\0/g, '')
  .replace(SCRIPT_PATTERN, '')
  .replace(JS_URL_PATTERN, '')
  .replace(EVENT_HANDLER_PATTERN, ' data-removed=')
  .trim();

const sanitizeObject = (value) => {
  if (Array.isArray(value)) return value.map(sanitizeObject);
  if (!value || typeof value !== 'object') return typeof value === 'string' ? sanitizeString(value) : value;
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.') || DANGEROUS_KEYS.has(key)) {
      const error = new Error('Potential NoSQL injection operator rejected.');
      error.status = 400;
      error.securityEvent = 'Suspicious request payload rejected';
      throw error;
    }
    value[key] = sanitizeObject(value[key]);
  }
  return value;
};

export const requestSanitizer = (req, res, next) => {
  try {
    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);
    return next();
  } catch (error) {
    logSecurityEvent(error.securityEvent || 'Malformed request payload rejected', { requestId: req.requestId, path: req.originalUrl, ip: req.ip, message: error.message });
    return res.status(error.status || 400).json({ success: false, message: error.message || 'Malformed request payload.' });
  }
};

export const securityHeaders = (req, res, next) => {
  res.setHeader('Permissions-Policy', permissionsPolicy);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Download-Options', 'noopen');
  next();
};

const safeIdentifier = (value) => String(value || '').toLowerCase().trim().slice(0, 120);
const ipKey = (req) => ipKeyGenerator(req.ip);
const userOrIpKey = (req) => String(req.user?._id || req.admin?._id || ipKey(req));

const logRateLimit = (req, scope) => {
  logSecurityEvent('Rate limit triggered', {
    scope,
    requestId: req.requestId,
    ip: req.ip,
    method: req.method,
    path: req.originalUrl,
    userId: req.user?._id ? String(req.user._id) : undefined,
    adminId: req.admin?._id ? String(req.admin._id) : undefined
  });
};

const rateLimitHandler = (scope) => (req, res) => {
  logRateLimit(req, scope);
  return res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.'
  });
};

const createLimiter = ({ windowMs, limit, scope, keyGenerator }) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  handler: rateLimitHandler(scope)
});

export const globalRateLimit = createLimiter({
  windowMs: appConfig.rateLimitWindowMs,
  limit: appConfig.rateLimitMax,
  scope: 'global'
});

export const authRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  scope: 'auth'
});

export const userLoginRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  scope: 'user-login',
  keyGenerator: (req) => `${ipKey(req)}:${safeIdentifier(req.body?.email)}`
});

export const adminLoginRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  scope: 'admin-login',
  keyGenerator: (req) => `${ipKey(req)}:${safeIdentifier(req.body?.email)}`
});

export const registerRateLimit = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  scope: 'register',
  keyGenerator: (req) => `${ipKey(req)}:${safeIdentifier(req.body?.email)}`
});

export const googleAuthRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  scope: 'google-auth'
});

export const forgotPasswordRateLimit = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  scope: 'forgot-password',
  keyGenerator: (req) => `${ipKey(req)}:${safeIdentifier(req.body?.email)}`
});

export const resetPasswordRateLimit = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  scope: 'reset-password'
});

export const emailActionRateLimit = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  scope: 'email-action',
  keyGenerator: userOrIpKey
});

export const sensitiveRateLimit = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  scope: 'sensitive',
  keyGenerator: userOrIpKey
});

export const sosApiRateLimit = createLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  scope: 'sos',
  keyGenerator: userOrIpKey
});

export const adminApiRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  scope: 'admin-api',
  keyGenerator: userOrIpKey
});

export const settingsRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 80,
  scope: 'settings',
  keyGenerator: userOrIpKey
});

export const adminExpensiveRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  scope: 'admin-expensive',
  keyGenerator: userOrIpKey
});

export const bulkActionRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  scope: 'bulk-action',
  keyGenerator: userOrIpKey
});

export const hppProtection = hpp({
  whitelist: ['category', 'status', 'type']
});

export const compressionMiddleware = compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
});
