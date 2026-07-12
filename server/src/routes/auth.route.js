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
import { authSchemas, validateSchema } from '../middleware/validation.middleware.js';
import { loginValidator, registerValidator, updateProfileValidator } from '../validators/auth.validator.js';

const router = Router();

router.post('/register', validateSchema({ body: authSchemas.register, allowUnknownBody: false }), registerValidator, validateRequest, register);
router.post('/login', validateSchema({ body: authSchemas.login, allowUnknownBody: false }), loginValidator, validateRequest, login);
router.post('/google', validateSchema({ body: authSchemas.googleLogin, allowUnknownBody: false }), googleSignIn);
router.post('/setup-password', authMiddleware, validateSchema({ body: authSchemas.resetPassword, allowUnknownBody: true }), setupPassword);
router.post('/complete-profile', authMiddleware, completeProfile);
router.get('/verify-email', validateSchema({ query: authSchemas.verifyEmail }), verifyEmail);
router.post('/verify-email', validateSchema({ body: authSchemas.verifyEmail, allowUnknownBody: false }), verifyEmail);
router.get('/verify/:token', validateSchema({ params: { token: { required: true, type: 'string', min: 20, max: 256 } } }), verifyEmail);
router.post('/send-verification-email', authMiddleware, sendVerificationEmailForCurrentUser);
router.post('/resend-verification', validateSchema({ body: authSchemas.forgotPassword, allowUnknownBody: false }), resendVerificationEmail);
router.post('/forgot-password', validateSchema({ body: authSchemas.forgotPassword, allowUnknownBody: false }), forgotPassword);
router.post('/reset-password', validateSchema({ body: authSchemas.resetPassword, allowUnknownBody: false }), resetPassword);
router.post('/reset-password/:token', validateSchema({
  body: {
    password: authSchemas.resetPassword.password,
    confirmPassword: authSchemas.resetPassword.confirmPassword
  },
  params: { token: { required: true, type: 'string', min: 20, max: 256 } },
  allowUnknownBody: false
}), resetPassword);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfileValidator, validateRequest, updateProfile);
router.put('/change-password', authMiddleware, validateSchema({ body: authSchemas.changePassword, allowUnknownBody: false }), changePassword);
router.post('/logout', logout);

export default router;
