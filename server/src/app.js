import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import healthRoute from './routes/health.route.js';
import authRoute from './routes/auth.route.js';
import profileRoute from './routes/profile.route.js';
import sosRoute from './routes/sos.route.js';
import locationRoutes from './routes/location.route.js';
import notificationRoutes from './routes/notification.route.js';
import adminRoutes from './routes/admin.route.js';
import { corsOptions, helmetOptions } from './config/security.js';
import {
  adminApiRateLimit,
  adminExpensiveRateLimit,
  bulkActionRateLimit,
  compressionMiddleware,
  emailActionRateLimit,
  forgotPasswordRateLimit,
  globalRateLimit,
  googleAuthRateLimit,
  hppProtection,
  requestSanitizer,
  resetPasswordRateLimit,
  registerRateLimit,
  securityHeaders,
  sensitiveRateLimit,
  settingsRateLimit,
  userLoginRateLimit
} from './middleware/security.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet(helmetOptions));
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(compressionMiddleware);
app.use(cookieParser(process.env.COOKIE_SECRET || process.env.JWT_SECRET));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(requestSanitizer);
app.use(hppProtection);
app.use('/api', globalRateLimit);

app.get('/', (req, res) => res.json({ message: 'Raksha 24x7 backend running' }));
app.use('/api/health', healthRoute);
app.use('/api/auth/login', userLoginRateLimit);
app.use('/api/auth/register', registerRateLimit);
app.use('/api/auth/google', googleAuthRateLimit);
app.use('/api/auth/forgot-password', forgotPasswordRateLimit);
app.use('/api/auth/reset-password', resetPasswordRateLimit);
app.use('/api/auth/verify-email', emailActionRateLimit);
app.use('/api/auth/resend-verification', emailActionRateLimit);
app.use('/api/auth/send-verification-email', emailActionRateLimit);
app.use('/api/auth', authRoute);
app.use('/api/sos', sosRoute);
app.use('/api/location', locationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/reports/export', adminExpensiveRateLimit);
app.use('/api/admin/sos/export', adminExpensiveRateLimit);
app.use('/api/admin/email/export', adminExpensiveRateLimit);
app.use('/api/admin/users/export', adminExpensiveRateLimit);
app.use('/api/admin/email/retry', emailActionRateLimit);
app.use('/api/admin/email/retry-failed', emailActionRateLimit);
app.use('/api/admin/users/bulk', bulkActionRateLimit);
app.use('/api/admin/settings/smtp/test', sensitiveRateLimit);
app.use('/api/admin/settings/email-template/test', sensitiveRateLimit);
app.use('/api/admin/settings', settingsRateLimit);
app.use('/api/admin', adminApiRateLimit);
app.use('/api/admin', adminRoutes);
// Keep broad profile routes last so user auth middleware cannot intercept admin APIs.
app.use('/api', profileRoute);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
