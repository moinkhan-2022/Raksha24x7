import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const isAdminRole = (role) => String(role || '').toLowerCase() === 'admin';

const adminMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ success: false, message: 'Admin authentication required.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, message: 'Admin user not found.' });
    if (!isAdminRole(decoded.role || user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Admin role required.' });
    }

    req.admin = user;
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Admin session expired.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid admin token.' });
  }
};

export default adminMiddleware;
