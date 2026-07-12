import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/user.model.js';
import { signToken } from '../utils/jwt.js';
import {
  sendAccountCreatedEmail,
  sendEmailVerifiedEmail,
  sendLoginSecurityAlertEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail
} from '../utils/email.js';
import { FirebaseAuthError, verifyGoogleIdToken } from '../services/firebaseAuth.service.js';
import EmailVerificationToken from '../email/models/emailVerificationToken.model.js';
import PasswordResetToken from '../email/models/passwordResetToken.model.js';
import { validateStrongPassword } from '../utils/passwordPolicy.js';
import { logError, logSecurityEvent, logUserActivity } from '../config/logger.js';

const VERIFICATION_EXPIRE_MS = 24 * 60 * 60 * 1000;
const RESET_EXPIRE_MS = 30 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_WINDOW_MS = 60 * 60 * 1000;
const RESET_WINDOW_LIMIT = 3;

const createRawToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar || user.profileImage,
  profileImage: user.profileImage,
  dateOfBirth: user.dateOfBirth,
  gender: user.gender,
  bloodGroup: user.bloodGroup,
  medicalNotes: user.medicalNotes,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastLogin: user.lastLogin,
  memberSince: user.memberSince,
  accountStatus: user.accountStatus,
  authProvider: user.authProvider || 'email',
  passwordSetupRequired: Boolean(user.passwordSetupRequired),
  profileCompleted: Boolean(user.profileCompleted),
  hasPassword: Boolean(user.passwordChangedAt || user.authProvider === 'email'),
  isEmailVerified: Boolean(user.isEmailVerified),
  emailVerificationStatus: user.isEmailVerified ? 'verified' : (user.emailVerificationStatus || 'pending'),
  emailVerifiedAt: user.emailVerifiedAt,
  passwordChangedAt: user.passwordChangedAt,
  contacts: user.contacts || []
});

const attachVerificationToken = (user) => {
  const rawToken = createRawToken();
  user.emailVerificationToken = hashToken(rawToken);
  user.emailVerificationExpire = new Date(Date.now() + VERIFICATION_EXPIRE_MS);
  user.emailVerificationLastSentAt = new Date();
  user.emailVerificationStatus = 'pending';
  user.isEmailVerified = false;
  return rawToken;
};

const requestMeta = (req) => ({
  ip: req?.ip || req?.headers?.['x-forwarded-for'] || '',
  browser: req?.get?.('user-agent') || ''
});

const createVerificationTokenRecord = async (user, rawToken, req) => {
  const meta = requestMeta(req);
  await EmailVerificationToken.updateMany(
    { userId: user._id, status: 'pending', used: false },
    { $set: { status: 'revoked' } }
  );
  return EmailVerificationToken.create({
    userId: user._id,
    tokenHash: hashToken(rawToken),
    expiresAt: user.emailVerificationExpire,
    ip: meta.ip,
    browser: meta.browser
  });
};

const markVerificationTokenUsed = async (token) => EmailVerificationToken.findOneAndUpdate(
  { tokenHash: hashToken(token), status: 'pending', used: false },
  { $set: { status: 'used', used: true, usedAt: new Date() } },
  { new: true }
);

const createPasswordResetTokenRecord = async (user, rawToken, req) => {
  const meta = requestMeta(req);
  await PasswordResetToken.updateMany(
    { userId: user._id, status: 'pending', used: false },
    { $set: { status: 'revoked' } }
  );
  return PasswordResetToken.create({
    userId: user._id,
    tokenHash: hashToken(rawToken),
    expiresAt: user.resetPasswordExpire,
    ip: meta.ip,
    browser: meta.browser
  });
};

const markPasswordResetTokenUsed = async (token) => PasswordResetToken.findOneAndUpdate(
  { tokenHash: hashToken(token), status: 'pending', used: false },
  { $set: { status: 'used', used: true, usedAt: new Date() } },
  { new: true }
);

const sendAuthEmailSafely = async (task) => {
  try {
    return await task();
  } catch (error) {
    // Email must never break account access in local/dev provider states.
    logError(error, { scope: 'auth_email_delivery' });
    return null;
  }
};

const normalizeName = (value = '') => String(value)
  .replace(/[^A-Za-z\s]/g, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase()
  .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

const validateProfilePayload = ({ name, dateOfBirth, phone }) => {
  const displayName = normalizeName(name);
  const phoneNumber = String(phone || '').replace(/\D/g, '').slice(0, 10);
  if (displayName.length < 3 || displayName.length > 50) return { error: 'Full name must be 3-50 letters and spaces only.' };
  if (!/^[A-Za-z\s]+$/.test(displayName)) return { error: 'Full name can contain only letters and spaces.' };
  if (!/^[6-9]\d{9}$/.test(phoneNumber)) return { error: 'Mobile number must be a valid 10-digit Indian number starting with 6, 7, 8, or 9.' };
  const dob = new Date(dateOfBirth);
  if (!dateOfBirth || Number.isNaN(dob.getTime())) return { error: 'Date of birth is required.' };
  const today = new Date();
  if (dob > today) return { error: 'Date of birth cannot be in the future.' };
  const minBirthDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
  if (dob > minBirthDate) return { error: 'You must be at least 13 years old.' };
  return { displayName, phoneNumber, dob };
};

const hasRequiredProfile = (user) => {
  const name = normalizeName(user?.name || '');
  const phone = String(user?.phone || '').replace(/\D/g, '');
  const dob = user?.dateOfBirth ? new Date(user.dateOfBirth) : null;
  if (name.length < 3 || !/^[6-9]\d{9}$/.test(phone) || !dob || Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  const minBirthDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
  return dob <= minBirthDate;
};

export const register = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });

    const existingEmail = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existingEmail) return res.status(409).json({ success: false, message: 'Email already registered' });

    const fallbackName = String(email).split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    const user = new User({
      name: fallbackName || 'Raksha User',
      email,
      password,
      authProvider: 'email',
      isEmailVerified: false,
      emailVerificationStatus: 'pending',
      emailVerifiedAt: null,
      passwordSetupRequired: false,
      profileCompleted: false,
      passwordChangedAt: new Date()
    });
    await user.save();
    await sendAuthEmailSafely(() => sendWelcomeEmail({ to: user.email, name: user.name, userId: user._id }));
    logUserActivity('User registered', { requestId: req.requestId, userId: user._id, provider: 'email', ip: req.ip });

    const token = signToken({ id: user._id, role: user.role });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: safeUser(user)
    });
  } catch (error) {
    if (error?.code === 11000) {
      if (error?.keyPattern?.email) return res.status(409).json({ success: false, message: 'Email already registered' });
      return res.status(409).json({ success: false, message: 'Duplicate data' });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logSecurityEvent('Failed user login - account not found', { requestId: req.requestId, email, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      logSecurityEvent('Failed user login - invalid password', { requestId: req.requestId, userId: user._id, ip: req.ip });
      if (user.authProvider === 'google' && !user.password) {
        return res.status(400).json({
          success: false,
          code: 'GOOGLE_ACCOUNT_NO_PASSWORD',
          message: 'This Google account does not have a password yet. Continue with Google first.'
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.profileCompleted && hasRequiredProfile(user)) user.profileCompleted = true;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    await sendAuthEmailSafely(() => sendLoginSecurityAlertEmail({ to: user.email, name: user.name, userId: user._id, req }));
    logUserActivity('User login', { requestId: req.requestId, userId: user._id, provider: 'email', ip: req.ip });
    const token = signToken({ id: user._id, role: user.role });
    return res.status(200).json({ success: true, message: 'Login successful', token, user: safeUser(user) });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const decoded = await verifyGoogleIdToken(idToken);
    const firebaseUid = decoded.uid;
    const email = decoded.email?.toLowerCase().trim();
    const displayName = decoded.name || decoded.displayName || '';
    const picture = decoded.picture || '';

    if (!firebaseUid) return res.status(401).json({ success: false, code: 'INVALID_FIREBASE_TOKEN', message: 'Firebase token is missing a user id.' });
    if (!email) return res.status(400).json({ success: false, code: 'GOOGLE_EMAIL_REQUIRED', message: 'Google account email is required.' });

    let user = await User.findOne({
      $or: [
        { email },
        { googleId: firebaseUid }
      ]
    }).select('+googleId');
    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = new User({
        name: displayName || email.split('@')[0],
        email,
        avatar: picture,
        profileImage: picture,
        authProvider: 'google',
        googleId: firebaseUid,
        isEmailVerified: true,
        emailVerificationStatus: 'verified',
        emailVerifiedAt: new Date(),
        passwordSetupRequired: false,
        profileCompleted: false,
        memberSince: new Date(),
        contacts: []
      });
    } else {
      if (!user.googleId) user.googleId = firebaseUid;
      if (displayName && (!user.name || user.name === user.email || user.name.includes('@'))) user.name = displayName;
      if (picture && (!user.profileImage || /^https?:\/\//i.test(user.profileImage))) user.profileImage = picture;
      if (picture && (!user.avatar || /^https?:\/\//i.test(user.avatar))) user.avatar = picture;
      user.authProvider = user.authProvider === 'email' ? 'email' : 'google';
      user.isEmailVerified = true;
      user.emailVerificationStatus = 'verified';
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      if (!user.profileCompleted && hasRequiredProfile(user)) user.profileCompleted = true;
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    if (isNewUser) {
      await sendAuthEmailSafely(() => sendWelcomeEmail({ to: user.email, name: user.name, userId: user._id }));
      await sendAuthEmailSafely(() => sendAccountCreatedEmail({ to: user.email, name: user.name, userId: user._id }));
    } else {
      await sendAuthEmailSafely(() => sendLoginSecurityAlertEmail({ to: user.email, name: user.name, userId: user._id, req }));
    }
    logUserActivity(isNewUser ? 'Google user registered' : 'Google user login', { requestId: req.requestId, userId: user._id, provider: 'google', ip: req.ip });
    const token = signToken({ id: user._id, role: user.role });

    return res.status(200).json({
      success: true,
      message: isNewUser ? 'Google account created.' : 'Google login successful.',
      token,
      user: safeUser(user),
      isNewUser,
      needsPasswordSetup: Boolean(user.passwordSetupRequired)
    });
  } catch (error) {
    logError(error, { scope: 'google_sign_in', requestId: req.requestId });
    return res.status(500).json({
      success: false,
      message: "Google sign-in failed"
    });
  }
};

export const setupPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body || {};
    const passwordError = validateStrongPassword(password);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match.' });

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user.password = password;
    user.passwordSetupRequired = false;
    user.passwordChangedAt = new Date();
    await user.save();
    await sendAuthEmailSafely(() => sendPasswordChangedEmail({ to: user.email, name: user.name, userId: user._id, req }));
    logUserActivity('Password setup completed', { requestId: req.requestId, userId: user._id, ip: req.ip });

    return res.status(200).json({ success: true, message: 'Password created successfully.', user: safeUser(user) });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not create password.' });
  }
};

export const completeProfile = async (req, res) => {
  try {
    const validation = validateProfilePayload(req.body || {});
    if (validation.error) return res.status(400).json({ success: false, message: validation.error });

    const duplicatePhone = await User.findOne({
      _id: { $ne: req.user._id },
      phone: validation.phoneNumber,
      deletedAt: null
    }).select('_id').lean();
    if (duplicatePhone) return res.status(409).json({ success: false, message: 'This mobile number is already registered.' });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        name: validation.displayName,
        phone: validation.phoneNumber,
        dateOfBirth: validation.dob,
        profileCompleted: true,
        accountStatus: 'active'
      },
      { new: true, runValidators: true }
    ).select('+emailVerificationToken +emailVerificationExpire +emailVerificationLastSentAt');

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    logUserActivity('Profile completed', { requestId: req.requestId, userId: user._id, ip: req.ip });
    let verificationSent = false;
    if (user.authProvider === 'email' && !user.isEmailVerified) {
      const rawToken = attachVerificationToken(user);
      await user.save({ validateBeforeSave: false });
      await createVerificationTokenRecord(user, rawToken, req);
      await sendAuthEmailSafely(() => sendVerificationEmail({
        to: user.email,
        name: user.name,
        userId: user._id,
        verifyUrl: `${clientUrl()}/auth/verify-email?token=${rawToken}`
      }));
      verificationSent = true;
    }

    return res.status(200).json({
      success: true,
      message: verificationSent ? 'Profile completed. Verification email sent.' : 'Profile completed successfully.',
      user: safeUser(user),
      verificationSent
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Could not complete profile.' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const token = req.params?.token || req.query.token || req.body?.token;
    if (!token) return res.status(400).json({ success: false, code: 'INVALID_TOKEN', message: 'Invalid verification link.' });

    const user = await User.findOne({ emailVerificationToken: hashToken(token) }).select('+emailVerificationToken +emailVerificationExpire');

    if (!user) return res.status(400).json({ success: false, code: 'INVALID_TOKEN', message: 'Invalid verification link.' });
    if (!user.emailVerificationExpire || user.emailVerificationExpire <= new Date()) {
      await EmailVerificationToken.findOneAndUpdate(
        { tokenHash: hashToken(token), status: 'pending' },
        { $set: { status: 'expired' } }
      );
      return res.status(400).json({ success: false, code: 'EXPIRED_TOKEN', message: 'Verification link expired.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationStatus = 'verified';
    user.emailVerifiedAt = new Date();
    user.emailVerificationToken = null;
    user.emailVerificationExpire = null;
    await user.save({ validateBeforeSave: false });
    await markVerificationTokenUsed(token);
    await sendAuthEmailSafely(() => sendEmailVerifiedEmail({ to: user.email, name: user.name, userId: user._id }));
    logUserActivity('Email verified', { requestId: req.requestId, userId: user._id, ip: req.ip });

    return res.status(200).json({ success: true, message: 'Email verified successfully.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpire +emailVerificationLastSentAt');
    if (!user) return res.status(404).json({ success: false, message: 'Email not found.' });
    if (user.isEmailVerified) return res.status(200).json({ success: true, message: 'Email is already verified.' });

    const lastSent = user.emailVerificationLastSentAt?.getTime?.() || 0;
    const remainingMs = VERIFICATION_RESEND_COOLDOWN_MS - (Date.now() - lastSent);
    if (remainingMs > 0) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another verification email.',
        retryAfter: Math.ceil(remainingMs / 1000)
      });
    }

    const rawToken = attachVerificationToken(user);
    await user.save({ validateBeforeSave: false });
    await createVerificationTokenRecord(user, rawToken, req);
    await sendAuthEmailSafely(() => sendVerificationEmail({
      to: user.email,
      name: user.name,
      userId: user._id,
      verifyUrl: `${clientUrl()}/auth/verify-email?token=${rawToken}`
    }));
    return res.status(200).json({ success: true, message: 'Verification email sent.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const sendVerificationEmailForCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+emailVerificationToken +emailVerificationExpire +emailVerificationLastSentAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.isEmailVerified) return res.status(200).json({ success: true, message: 'Email is already verified.' });

    const lastSent = user.emailVerificationLastSentAt?.getTime?.() || 0;
    const remainingMs = VERIFICATION_RESEND_COOLDOWN_MS - (Date.now() - lastSent);
    if (remainingMs > 0) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another verification email.',
        retryAfter: Math.ceil(remainingMs / 1000)
      });
    }

    const rawToken = attachVerificationToken(user);
    await user.save({ validateBeforeSave: false });
    await createVerificationTokenRecord(user, rawToken, req);
    await sendAuthEmailSafely(() => sendVerificationEmail({
      to: user.email,
      name: user.name,
      userId: user._id,
      verifyUrl: `${clientUrl()}/auth/verify-email?token=${rawToken}`
    }));

    return res.status(200).json({ success: true, message: 'Verification email sent.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email }).select('+password +resetPasswordToken +resetPasswordExpire +passwordResetRequestCount +passwordResetWindowStart +passwordResetHistory');
    if (user && user.password) {
      const windowStart = user.passwordResetWindowStart?.getTime?.() || 0;
      if (!windowStart || Date.now() - windowStart > RESET_WINDOW_MS) {
        user.passwordResetWindowStart = new Date();
        user.passwordResetRequestCount = 0;
      }
      const resetRequestCount = Number(user.passwordResetRequestCount || 0);
      if (resetRequestCount >= RESET_WINDOW_LIMIT) {
        return res.status(429).json({ success: false, message: 'Too many reset requests. Please try again later.' });
      }

      const rawToken = createRawToken();
      user.resetPasswordToken = hashToken(rawToken);
      user.resetPasswordExpire = new Date(Date.now() + RESET_EXPIRE_MS);
      user.passwordResetRequestCount = resetRequestCount + 1;
      user.passwordResetHistory = [{ requestedAt: new Date(), ip: req.ip, userAgent: req.get('user-agent') }, ...(user.passwordResetHistory || [])].slice(0, 10);
      await user.save({ validateBeforeSave: false });
      await createPasswordResetTokenRecord(user, rawToken, req);

      const resetUrl = `${clientUrl()}/auth/reset-password/${rawToken}`;
      await sendAuthEmailSafely(() => sendPasswordResetEmail({ to: user.email, name: user.name, userId: user._id, resetUrl }));
      logUserActivity('Forgot password requested', { requestId: req.requestId, userId: user._id, ip: req.ip });
    }

    return res.status(200).json({ success: true, message: 'If this email exists, a password reset link has been sent.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = req.params.token || req.body?.token;
    const { password, confirmPassword } = req.body;
    const passwordError = validateStrongPassword(password);

    if (!token) return res.status(400).json({ success: false, message: 'Reset token is required' });
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });

    const user = await User.findOne({ resetPasswordToken: hashToken(token), resetPasswordExpire: { $gt: new Date() } }).select('+password +resetPasswordToken +resetPasswordExpire +passwordResetHistory +failedResetAttempts');
    if (!user) return res.status(400).json({ success: false, code: 'INVALID_OR_EXPIRED', message: 'Invalid or expired token' });
    const reused = user.password ? await bcrypt.compare(password, user.password) : false;
    if (reused) return res.status(400).json({ success: false, message: 'New password cannot be the same as your current password.' });

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    user.passwordChangedAt = new Date();
    user.failedResetAttempts = 0;
    user.passwordResetHistory = (user.passwordResetHistory || []).map((entry, index) => {
      if (index !== 0 || entry.completedAt) return entry;
      const plainEntry = typeof entry.toObject === 'function' ? entry.toObject() : entry;
      return { ...plainEntry, completedAt: new Date() };
    }).slice(0, 10);
    await user.save();
    await markPasswordResetTokenUsed(token);
    await sendAuthEmailSafely(() => sendPasswordChangedEmail({ to: user.email, name: user.name, userId: user._id, req }));
    logUserActivity('Password reset completed', { requestId: req.requestId, userId: user._id, ip: req.ip });

    return res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProfile = async (req, res) => res.status(200).json({ success: true, user: safeUser(req.user) });
export const updateProfile = async (req, res) => { try { const user = await User.findByIdAndUpdate(req.user._id, req.body, { new: true, runValidators: true }).select('-password'); return res.status(200).json({ success: true, message: 'Profile updated', user: safeUser(user) }); } catch { return res.status(500).json({ success: false, message: 'Server error' }); } };
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const passwordError = validateStrongPassword(newPassword);
    if (!currentPassword || !newPassword || !confirmPassword) return res.status(400).json({ success: false, message: 'All password fields are required' });
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });
    if (newPassword !== confirmPassword) return res.status(400).json({ success: false, message: 'Confirm Password must match Password' });
    if (newPassword === currentPassword) return res.status(400).json({ success: false, message: 'New password cannot be the same as your current password.' });

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    await sendAuthEmailSafely(() => sendPasswordChangedEmail({ to: user.email, name: user.name, userId: user._id, req }));
    logUserActivity('Password changed', { requestId: req.requestId, userId: user._id, ip: req.ip });
    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
export const logout = async (req, res) => {
  logUserActivity('User logout', { requestId: req.requestId, userId: req.user?._id, ip: req.ip });
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
};
