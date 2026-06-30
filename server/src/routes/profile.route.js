import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import { uploadProfilePhoto } from '../middleware/upload.middleware.js';
import {
  addContact,
  changePassword,
  deleteAccount,
  deleteContact,
  deletePhoto,
  getContacts,
  getProfile,
  setPrimaryContact,
  updateContact,
  updateProfile,
  uploadPhoto
} from '../controllers/profile.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/profile/photo', uploadProfilePhoto, uploadPhoto);
router.delete('/profile/photo', deletePhoto);

router.get('/contacts', getContacts);
router.post('/contacts', addContact);
router.put('/contacts/:id', updateContact);
router.delete('/contacts/:id', deleteContact);
router.patch('/contacts/:id/primary', setPrimaryContact);

router.put('/change-password', changePassword);
router.delete('/account', deleteAccount);

export default router;
