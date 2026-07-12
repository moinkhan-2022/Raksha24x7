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
  getDashboardActivity,
  getDashboardEmails,
  getDashboardNotifications,
  getDashboardOverview,
  getDashboardSos,
  getDashboardSystemHealth,
  getDashboardUsers
} from '../controllers/adminDashboard.controller.js';
import {
  bulkAdminUserAction,
  activateAdminUser,
  deleteAdminUser,
  exportAdminUsers,
  getAdminUserActivity,
  getAdminUserDetails,
  getAdminUserEmergencyContacts,
  listAdminUsers,
  restoreAdminUser,
  suspendAdminUser,
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
router.get('/dashboard/overview', getDashboardOverview);
router.get('/dashboard/users', getDashboardUsers);
router.get('/dashboard/sos', getDashboardSos);
router.get('/dashboard/emails', getDashboardEmails);
router.get('/dashboard/notifications', getDashboardNotifications);
router.get('/dashboard/activity', getDashboardActivity);
router.get('/dashboard/system-health', getDashboardSystemHealth);
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);
router.get('/users/export', exportAdminUsers);
router.post('/users/export', exportAdminUsers);
router.get('/users', listAdminUsers);
router.get('/users/:id', getAdminUserDetails);
router.get('/users/:id/activity', getAdminUserActivity);
router.get('/users/:id/emergency-contacts', getAdminUserEmergencyContacts);
router.put('/users/:id', updateAdminUser);
router.patch('/users/:id/status', updateAdminUserStatus);
router.patch('/users/:id/suspend', suspendAdminUser);
router.patch('/users/:id/activate', activateAdminUser);
router.patch('/users/:id/restore', restoreAdminUser);
router.delete('/users/:id', deleteAdminUser);
router.post('/users/bulk', bulkAdminUserAction);
router.post('/logout', adminLogout);
router.post('/logout-all', adminLogoutAll);

export default router;
