import { Router } from 'express';
import {
  adminLogin,
  adminLogout,
  getAdminDashboard,
  getAdminProfile,
  getAdminSettings,
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

const router = Router();

router.post('/login', adminLogin);
router.use(adminMiddleware);
router.get('/profile', getAdminProfile);
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

export default router;
