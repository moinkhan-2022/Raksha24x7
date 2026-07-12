import Admin from '../models/admin.model.js';
import AdminSession from '../models/adminSession.model.js';
import { verifyAdminToken } from '../services/adminAuth.service.js';
import { logSecurityEvent } from '../config/logger.js';

export const isAdminRole = (role) => ['super_admin', 'admin', 'moderator', 'support'].includes(String(role || '').toLowerCase());

export const normalizeAdminRole = (role = '') => String(role).toLowerCase().replace(/\s+/g, '_');

export const requireAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      logSecurityEvent('Unauthorized admin request - token missing', { requestId: req.requestId, path: req.originalUrl, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Admin authentication required.' });
    }

    const decoded = verifyAdminToken(token);
    if (decoded.scope !== 'admin') {
      logSecurityEvent('Invalid admin token scope', { requestId: req.requestId, path: req.originalUrl, ip: req.ip, scope: decoded.scope });
      return res.status(403).json({ success: false, message: 'Admin token scope is required.' });
    }

    const [admin, session] = await Promise.all([
      Admin.findById(decoded.id).select('+loginAttempts +lockUntil'),
      AdminSession.findOne({ sessionId: decoded.sessionId, tokenId: decoded.tokenId, adminId: decoded.id, isActive: true })
    ]);

    if (!admin) {
      logSecurityEvent('Unauthorized admin request - account not found', { requestId: req.requestId, path: req.originalUrl, ip: req.ip, adminId: decoded.id });
      return res.status(401).json({ success: false, message: 'Admin account not found.' });
    }
    if (admin.status !== 'active') {
      logSecurityEvent('Inactive admin access blocked', { requestId: req.requestId, path: req.originalUrl, ip: req.ip, adminId: decoded.id });
      return res.status(403).json({ success: false, message: 'Admin account is not active.' });
    }
    if (admin.accountLocked && admin.lockUntil && admin.lockUntil > new Date()) {
      return res.status(423).json({ success: false, message: 'Admin account is temporarily locked.' });
    }
    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        session.isActive = false;
        session.logoutTime = new Date();
        await session.save();
      }
      logSecurityEvent('Admin session expired', { requestId: req.requestId, path: req.originalUrl, ip: req.ip, adminId: decoded.id });
      return res.status(401).json({ success: false, message: 'Admin session expired.' });
    }

    req.admin = admin;
    req.adminSession = session;
    req.adminToken = decoded;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logSecurityEvent('Admin token expired', { requestId: req.requestId, path: req.originalUrl, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Admin session expired.' });
    }
    logSecurityEvent('Invalid admin token', { requestId: req.requestId, path: req.originalUrl, ip: req.ip, error: error.name });
    return res.status(401).json({ success: false, message: 'Invalid admin token.' });
  }
};

export const requireAdminRole = (...roles) => (req, res, next) => {
  const allowed = roles.map(normalizeAdminRole);
  if (req.admin?.role === 'super_admin' || allowed.includes(req.admin?.role)) return next();
  logSecurityEvent('Admin role denied', { requestId: req.requestId, adminId: req.admin?._id, requiredRoles: roles, path: req.originalUrl });
  return res.status(403).json({ success: false, message: 'Missing required admin role.' });
};

export const requireAdminPermission = (...permissions) => (req, res, next) => {
  const adminPermissions = req.admin?.permissions || [];
  if (adminPermissions.includes('*') || permissions.some((permission) => adminPermissions.includes(permission))) return next();
  logSecurityEvent('Admin permission denied', { requestId: req.requestId, adminId: req.admin?._id, permissions, path: req.originalUrl });
  return res.status(403).json({ success: false, message: 'Missing required admin permission.' });
};

export default requireAdminAuth;
