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
router.use(authMiddleware);

router.get('/profile', getProfile);
router.put('/profile', validateSchema({ body: profileSchemas.update, allowUnknownBody: false }), updateProfile);
router.post('/profile/photo', uploadProfilePhoto, uploadPhoto);
router.delete('/profile/photo', deletePhoto);

router.get('/contacts', getContacts);
router.post('/contacts', validateSchema({ body: profileSchemas.contact, allowUnknownBody: false }), addContact);
router.put('/contacts/:id', validateSchema({ body: profileSchemas.contact, params: sosSchemas.idParam, allowUnknownBody: false }), updateContact);
router.delete('/contacts/:id', validateSchema({ params: sosSchemas.idParam }), deleteContact);
router.patch('/contacts/:id/primary', validateSchema({ params: sosSchemas.idParam }), setPrimaryContact);

router.put('/change-password', validateSchema({ body: authSchemas.changePassword, allowUnknownBody: false }), changePassword);
router.delete('/account', validateSchema({ body: profileSchemas.deleteAccount, allowUnknownBody: false }), deleteAccount);

export default router;
