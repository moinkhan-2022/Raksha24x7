import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import AdminSession from '../models/adminSession.model.js';
import AdminAuditLog from '../models/adminAuditLog.model.js';
import { jwtConfig } from '../config/security.js';

const DEFAULT_ADMIN_EXPIRES_IN = '8h';
const REMEMBER_ADMIN_EXPIRES_IN = '30d';

export const getAdminJwtSecret = () => {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error('ADMIN_JWT_SECRET is required for admin authentication.');
  return secret;
};

const addMs = (ms) => new Date(Date.now() + ms);

export const getAdminExpiry = (remember = false) => {
  if (remember) return addMs(30 * 24 * 60 * 60 * 1000);
  return addMs(8 * 60 * 60 * 1000);
};

export const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
};

export const parseUserAgent = (userAgent = '') => {
  const ua = String(userAgent);
  const browser = /Edg/i.test(ua) ? 'Microsoft Edge'
    : /Chrome/i.test(ua) ? 'Chrome'
      : /Firefox/i.test(ua) ? 'Firefox'
        : /Safari/i.test(ua) ? 'Safari'
          : 'Unknown browser';
  const operatingSystem = /Windows/i.test(ua) ? 'Windows'
    : /Mac OS/i.test(ua) ? 'macOS'
      : /Android/i.test(ua) ? 'Android'
        : /iPhone|iPad/i.test(ua) ? 'iOS'
          : /Linux/i.test(ua) ? 'Linux'
            : 'Unknown OS';
  const device = /Mobile|Android|iPhone/i.test(ua) ? 'Mobile device' : 'Desktop device';
  return { browser, operatingSystem, device };
};

export const writeAdminAuditLog = async ({ req, adminId = null, action, status = 'success', message = '', metadata = {} }) => {
  try {
    const userAgent = req?.headers?.['user-agent'] || '';
    const parsed = parseUserAgent(userAgent);
    await AdminAuditLog.create({
      adminId,
      action,
      status,
      message,
      ipAddress: req ? getClientIp(req) : '',
      browser: parsed.browser,
      userAgent,
      metadata
    });
  } catch {
    return undefined;
  }
};

export const createAdminSession = async ({ admin, req, remember = false }) => {
  const sessionId = crypto.randomUUID();
  const tokenId = crypto.randomUUID();
  const expiresAt = getAdminExpiry(remember);
  const userAgent = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(userAgent);
  const session = await AdminSession.create({
    adminId: admin._id,
    sessionId,
    tokenId,
    loginTime: new Date(),
    expiresAt,
    ipAddress: getClientIp(req),
    userAgent,
    ...parsed
  });
  const token = jwt.sign(
    { id: admin._id.toString(), role: admin.role, permissions: admin.permissions || [], sessionId, tokenId, scope: 'admin' },
    getAdminJwtSecret(),
    {
      algorithm: jwtConfig.algorithm,
      expiresIn: remember ? REMEMBER_ADMIN_EXPIRES_IN : (process.env.ADMIN_JWT_EXPIRES_IN || DEFAULT_ADMIN_EXPIRES_IN),
      issuer: jwtConfig.adminIssuer,
      audience: jwtConfig.adminAudience
    }
  );
  return { token, expiresAt, session };
};

export const verifyAdminToken = (token) => jwt.verify(token, getAdminJwtSecret(), {
  algorithms: [jwtConfig.algorithm],
  issuer: jwtConfig.adminIssuer,
  audience: jwtConfig.adminAudience
});

export const revokeAdminSession = async ({ sessionId, adminId }) => {
  if (!sessionId) return null;
  return AdminSession.findOneAndUpdate(
    { sessionId, adminId, isActive: true },
    { isActive: false, logoutTime: new Date() },
    { new: true }
  );
};

export const revokeAllAdminSessions = async (adminId) => AdminSession.updateMany(
  { adminId, isActive: true },
  { isActive: false, logoutTime: new Date() }
);
