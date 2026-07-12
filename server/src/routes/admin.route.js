import { Router } from 'express';
import {
  adminLogin,
  adminLogout,
  adminLogoutAll,
  changeAdminPassword,
  deleteAdminSession,
  getAdminDashboard,
  getAdminMe,
  getAdminProfile,
  getAdminSessions,
  getAdminSettings,
  updateAdminProfile,
  updateAdminSettings
} from '../controllers/admin.controller.js';
import {
  bulkAdminUserAction,
  deleteAdminUser,
  exportAdminUsers,
  getAdminUserDetails,
  listAdminUsers,
  updateAdminUser,
  updateAdminUserStatus
} from '../controllers/adminUser.controller.js';
import adminMiddleware from '../middleware/admin.middleware.js';
import adminLoginRateLimit from '../middleware/adminRateLimit.middleware.js';

const router = Router();

router.post('/auth/login', adminLoginRateLimit, adminLogin);
router.post('/login', adminLoginRateLimit, adminLogin);

router.use(adminMiddleware);

router.get('/auth/me', getAdminMe);
router.post('/auth/logout', adminLogout);
router.post('/auth/logout-all', adminLogoutAll);
router.patch('/auth/change-password', changeAdminPassword);
router.patch('/auth/profile', updateAdminProfile);
router.get('/auth/sessions', getAdminSessions);
router.delete('/auth/sessions/:id', deleteAdminSession);

router.get('/profile', getAdminProfile);
router.patch('/profile', updateAdminProfile);
router.get('/dashboard', getAdminDashboard);
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);
router.get('/users/export', exportAdminUsers);
router.get('/users', listAdminUsers);
router.get('/users/:id', getAdminUserDetails);
router.put('/users/:id', updateAdminUser);
router.patch('/users/:id/status', updateAdminUserStatus);
router.delete('/users/:id', deleteAdminUser);
router.post('/users/bulk', bulkAdminUserAction);
router.post('/logout', adminLogout);
router.post('/logout-all', adminLogoutAll);

export default router;
