import { Router } from 'express';
import {
  changePassword,
  forgotPassword,
  getProfile,
  googleSignIn,
  completeProfile,
  login,
  logout,
  register,
  resendVerificationEmail,
  resetPassword,
  sendVerificationEmailForCurrentUser,
  setupPassword,
  updateProfile,
  verifyEmail
} from '../controllers/auth.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { loginValidator, registerValidator, updateProfileValidator } from '../validators/auth.validator.js';

const router = Router();

router.post('/register', registerValidator, validateRequest, register);
router.post('/login', loginValidator, validateRequest, login);
router.post('/google', googleSignIn);
router.post('/setup-password', authMiddleware, setupPassword);
router.post('/complete-profile', authMiddleware, completeProfile);
router.get('/verify-email', verifyEmail);
router.post('/verify-email', verifyEmail);
router.get('/verify/:token', verifyEmail);
router.post('/send-verification-email', authMiddleware, sendVerificationEmailForCurrentUser);
router.post('/resend-verification', resendVerificationEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfileValidator, validateRequest, updateProfile);
router.put('/change-password', authMiddleware, changePassword);
router.post('/logout', logout);

export default router;
