import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = process.env.LOG_DIR || path.resolve(__dirname, '../../logs');
const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

const SENSITIVE_KEYS = new Set([
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'token',
  'idToken',
  'authorization',
  'cookie',
  'secret',
  'apiKey',
  'privateKey',
  'smtpPass',
  'MONGODB_URI',
  'JWT_SECRET',
  'ADMIN_JWT_SECRET',
  'FIREBASE_PRIVATE_KEY'
]);

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

export const maskSensitive = (value) => {
  if (Array.isArray(value)) return value.map(maskSensitive);
  if (!value || typeof value !== 'object') return value;
  return Object.entries(value).reduce((safe, [key, item]) => {
    const normalized = key.toLowerCase();
    safe[key] = [...SENSITIVE_KEYS].some((sensitive) => normalized.includes(sensitive.toLowerCase()))
      ? '[REDACTED]'
      : maskSensitive(item);
    return safe;
  }, {});
};

const rotateTransport = (filename, level) => new DailyRotateFile({
  filename: path.join(LOG_DIR, `${filename}-%DATE%.log`),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxFiles: '30d',
  level
});

const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    const meta = metadata && Object.keys(metadata).length ? ` ${JSON.stringify(maskSensitive(metadata))}` : '';
    return `${timestamp} ${level}: ${message}${meta}`;
  })
);

const createLogger = (name, transports, level = logLevel) => winston.createLogger({
  level,
  format: baseFormat,
  defaultMeta: { service: 'raksha24x7-api', logger: name },
  transports: [
    ...(isProduction ? [] : [new winston.transports.Console({ format: consoleFormat, level })]),
    ...transports
  ],
  exitOnError: false
});

export const appLogger = createLogger('application', [
  rotateTransport('application', 'info'),
  rotateTransport('error', 'error')
]);

export const requestLog = createLogger('request', [rotateTransport('request', 'http')], 'http');
export const securityLog = createLogger('security', [rotateTransport('security', 'info')]);
export const adminLog = createLogger('admin', [rotateTransport('admin', 'info')]);
export const performanceLog = createLogger('performance', [rotateTransport('performance', 'info')]);

export const logError = (error, context = {}) => {
  appLogger.error(error?.message || 'Unexpected error', {
    ...maskSensitive(context),
    name: error?.name,
    code: error?.code,
    stack: isProduction ? undefined : error?.stack
  });
};

export const logSecurityEvent = (event, metadata = {}) => {
  securityLog.warn(event, maskSensitive(metadata));
};

export const logUserActivity = (event, metadata = {}) => {
  appLogger.info(event, { type: 'user_activity', ...maskSensitive(metadata) });
};

export const logAdminActivity = (event, metadata = {}) => {
  adminLog.info(event, { type: 'admin_activity', ...maskSensitive(metadata) });
};

export default appLogger;
