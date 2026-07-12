import User from '../models/user.model.js';
import { verifyUserToken } from '../utils/jwt.js';
import { logSecurityEvent } from '../config/logger.js';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      logSecurityEvent('Unauthorized user request - token missing', { requestId: req.requestId, path: req.originalUrl, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Unauthorized: token missing' });
    }

    const decoded = verifyUserToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      logSecurityEvent('Unauthorized user request - user not found', { requestId: req.requestId, path: req.originalUrl, ip: req.ip, tokenUserId: decoded.id });
      return res.status(401).json({ success: false, message: 'Unauthorized: user not found' });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logSecurityEvent('User token expired', { requestId: req.requestId, path: req.originalUrl, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    logSecurityEvent('Invalid user token', { requestId: req.requestId, path: req.originalUrl, ip: req.ip, error: error.name });
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

export default authMiddleware;
