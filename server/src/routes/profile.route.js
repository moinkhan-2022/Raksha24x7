import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import { uploadProfilePhoto } from '../middleware/upload.middleware.js';
import { authSchemas, profileSchemas, sosSchemas, validateSchema } from '../middleware/validation.middleware.js';
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

router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, validateSchema({ body: profileSchemas.update, allowUnknownBody: false }), updateProfile);
router.post('/profile/photo', authMiddleware, uploadProfilePhoto, uploadPhoto);
router.delete('/profile/photo', authMiddleware, deletePhoto);

router.get('/contacts', authMiddleware, getContacts);
router.post('/contacts', authMiddleware, validateSchema({ body: profileSchemas.contact, allowUnknownBody: false }), addContact);
router.put('/contacts/:id', authMiddleware, validateSchema({ body: profileSchemas.contact, params: sosSchemas.idParam, allowUnknownBody: false }), updateContact);
router.delete('/contacts/:id', authMiddleware, validateSchema({ params: sosSchemas.idParam }), deleteContact);
router.patch('/contacts/:id/primary', authMiddleware, validateSchema({ params: sosSchemas.idParam }), setPrimaryContact);

router.put('/change-password', authMiddleware, validateSchema({ body: authSchemas.changePassword, allowUnknownBody: false }), changePassword);
router.delete('/account', authMiddleware, validateSchema({ body: profileSchemas.deleteAccount, allowUnknownBody: false }), deleteAccount);

export default router;
