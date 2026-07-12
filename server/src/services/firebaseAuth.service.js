import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { logError, logSecurityEvent } from '../config/logger.js';

const requiredFirebaseAdminEnv = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];

const privateKey = () => {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  return typeof key === 'string' ? key.replace(/\\n/g, '\n') : '';
};

const adminAppCount = () => getApps().length;

const logFirebaseAdminEnv = () => {
  logSecurityEvent('Firebase Admin env check', {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || undefined,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || undefined,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? '[MASKED]' : undefined
  });
};

const validateFirebaseAdminEnv = () => {
  const missing = requiredFirebaseAdminEnv.filter((key) => !process.env[key]);
  missing.forEach((key) => logSecurityEvent('Missing Firebase Admin environment variable', { key }));
  if (missing.length) logFirebaseAdminEnv();
  return missing.length === 0;
};

export class FirebaseAuthError extends Error {
  constructor(message, statusCode = 401, code = 'FIREBASE_AUTH_ERROR') {
    super(message);
    this.name = 'FirebaseAuthError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const initializeFirebaseAdmin = () => {
  if (!validateFirebaseAdminEnv()) return false;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const key = privateKey();

  try {
    if (!adminAppCount()) {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key }) });
    }
    return true;
  } catch (error) {
    logError(error, { scope: 'firebase_admin_initialization', code: error.code });
    logFirebaseAdminEnv();
    return false;
  }
};

export const verifyGoogleIdToken = async (idToken) => {
  if (!idToken || typeof idToken !== 'string') {
    throw new FirebaseAuthError('Firebase ID token is required.', 400, 'MISSING_FIREBASE_TOKEN');
  }
  if (!initializeFirebaseAdmin()) {
    throw new FirebaseAuthError('Firebase Admin is not configured.', 500, 'FIREBASE_ADMIN_NOT_CONFIGURED');
  }

  try {
    return await getAuth().verifyIdToken(idToken);
  } catch (error) {
    logSecurityEvent('Firebase token verification failed', { code: error?.errorInfo?.code || error?.code });
    const code = error?.errorInfo?.code || error?.code || '';
    if (code.includes('id-token-expired')) {
      throw new FirebaseAuthError('Firebase ID token has expired. Please sign in again.', 401, 'EXPIRED_FIREBASE_TOKEN');
    }
    if (code.includes('argument-error') || code.includes('invalid-id-token')) {
      throw new FirebaseAuthError('Invalid Firebase ID token.', 401, 'INVALID_FIREBASE_TOKEN');
    }
    throw new FirebaseAuthError('Firebase token verification failed.', 401, 'FIREBASE_VERIFICATION_FAILED');
  }
};
