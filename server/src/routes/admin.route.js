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
  updateAdminProfile,
} from '../controllers/admin.controller.js';
import {
  createEmergencyNumber,
  deleteEmergencyNumber,
  getAdminSettings,
  getEmailTemplateSettings,
  listEmergencyNumbers,
  sendEmailTemplateTest,
  testSmtpSettings,
  updateApplicationSettings,
  updateEmailTemplateSetting,
  updateEmergencyNumber,
  updateGeneralSettings,
  updateMaintenanceSettings,
  updateSecuritySettings,
  updateSmtpSettings,
  updateThemeSettings
} from '../controllers/adminSettings.controller.js';
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
  exportAdminSos,
  getAdminSosByStatus,
  getAdminSosDetails,
  getAdminSosTimeline,
  getAdminSosTracking,
  listAdminSos,
  markSosReviewed,
  updateSosNotes
} from '../controllers/adminSos.controller.js';
import {
  exportAdminEmailLogs,
  getAdminEmailLogDetails,
  getAdminEmailStatistics,
  listAdminEmailLogs,
  listAdminEmailQueue,
  retryAdminEmail,
  retryFailedAdminEmails
} from '../controllers/adminEmail.controller.js';
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
router.get('/sos/active', getAdminSosByStatus('active'));
router.get('/sos/completed', getAdminSosByStatus('completed'));
router.get('/sos/failed', getAdminSosByStatus('failed'));
router.get('/sos', listAdminSos);
router.get('/sos/:id/timeline', getAdminSosTimeline);
router.get('/sos/:id/tracking', getAdminSosTracking);
router.get('/sos/:id', getAdminSosDetails);
router.patch('/sos/:id/review', markSosReviewed);
router.patch('/sos/:id/notes', updateSosNotes);
router.post('/sos/export', exportAdminSos);
router.get('/email/logs', listAdminEmailLogs);
router.get('/email/logs/:id', getAdminEmailLogDetails);
router.get('/email/queue', listAdminEmailQueue);
router.get('/email/statistics', getAdminEmailStatistics);
router.post('/email/retry/:id', retryAdminEmail);
router.post('/email/retry-failed', retryFailedAdminEmails);
router.post('/email/export', exportAdminEmailLogs);
router.get('/settings', getAdminSettings);
router.put('/settings', updateGeneralSettings);
router.patch('/settings/general', updateGeneralSettings);
router.patch('/settings/smtp', updateSmtpSettings);
router.patch('/settings/theme', updateThemeSettings);
router.patch('/settings/application', updateApplicationSettings);
router.patch('/settings/security', updateSecuritySettings);
router.patch('/settings/maintenance', updateMaintenanceSettings);
router.get('/settings/email-templates', getEmailTemplateSettings);
router.patch('/settings/email-template/:id', updateEmailTemplateSetting);
router.post('/settings/email-template/test', sendEmailTemplateTest);
router.get('/settings/emergency-numbers', listEmergencyNumbers);
router.post('/settings/emergency-numbers', createEmergencyNumber);
router.patch('/settings/emergency-numbers/:id', updateEmergencyNumber);
router.delete('/settings/emergency-numbers/:id', deleteEmergencyNumber);
router.post('/settings/smtp/test', testSmtpSettings);
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
