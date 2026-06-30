import { Router } from 'express';
import { changePassword, getProfile, login, logout, register, updateProfile } from '../controllers/auth.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { loginValidator, registerValidator, updateProfileValidator } from '../validators/auth.validator.js';

const router = Router();

router.post('/register', registerValidator, validateRequest, register);
router.post('/login', loginValidator, validateRequest, login);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfileValidator, validateRequest, updateProfile);
router.put('/change-password', authMiddleware, changePassword);
router.post('/logout', logout);

export default router;
