import Admin from '../models/admin.model.js';
import AdminSession from '../models/adminSession.model.js';
import { verifyAdminToken } from '../services/adminAuth.service.js';

export const isAdminRole = (role) => ['super_admin', 'admin', 'moderator', 'support'].includes(String(role || '').toLowerCase());

export const normalizeAdminRole = (role = '') => String(role).toLowerCase().replace(/\s+/g, '_');

export const requireAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ success: false, message: 'Admin authentication required.' });
    }

    const decoded = verifyAdminToken(token);
    if (decoded.scope !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin token scope is required.' });
    }

    const [admin, session] = await Promise.all([
      Admin.findById(decoded.id).select('+loginAttempts +lockUntil'),
      AdminSession.findOne({ sessionId: decoded.sessionId, tokenId: decoded.tokenId, adminId: decoded.id, isActive: true })
    ]);

    if (!admin) return res.status(401).json({ success: false, message: 'Admin account not found.' });
    if (admin.status !== 'active') return res.status(403).json({ success: false, message: 'Admin account is not active.' });
    if (admin.accountLocked && admin.lockUntil && admin.lockUntil > new Date()) {
      return res.status(423).json({ success: false, message: 'Admin account is temporarily locked.' });
    }
    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        session.isActive = false;
        session.logoutTime = new Date();
        await session.save();
      }
      return res.status(401).json({ success: false, message: 'Admin session expired.' });
    }

    req.admin = admin;
    req.adminSession = session;
    req.adminToken = decoded;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Admin session expired.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid admin token.' });
  }
};

export const requireAdminRole = (...roles) => (req, res, next) => {
  const allowed = roles.map(normalizeAdminRole);
  if (req.admin?.role === 'super_admin' || allowed.includes(req.admin?.role)) return next();
  return res.status(403).json({ success: false, message: 'Missing required admin role.' });
};

export const requireAdminPermission = (...permissions) => (req, res, next) => {
  const adminPermissions = req.admin?.permissions || [];
  if (adminPermissions.includes('*') || permissions.some((permission) => adminPermissions.includes(permission))) return next();
  return res.status(403).json({ success: false, message: 'Missing required admin permission.' });
};

export default requireAdminAuth;
