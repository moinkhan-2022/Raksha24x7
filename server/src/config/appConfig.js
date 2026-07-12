const csv = (value = '') => String(value).split(',').map((item) => item.trim()).filter(Boolean);
const numberFromEnv = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
};

export const appConfig = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: numberFromEnv('PORT', 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`,
  corsOrigins: csv(process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS),
  trustProxy: numberFromEnv('TRUST_PROXY', 1),
  uploadLimit: process.env.UPLOAD_LIMIT || '5mb',
  urlEncodedLimit: process.env.URLENCODED_LIMIT || '1mb',
  bcryptRounds: numberFromEnv('BCRYPT_ROUNDS', 12),
  rateLimitWindowMs: numberFromEnv('RATE_LIMIT_WINDOW', 15 * 60 * 1000),
  rateLimitMax: numberFromEnv('RATE_LIMIT_MAX', process.env.NODE_ENV === 'production' ? 300 : 1000),
  mapProvider: process.env.MAP_PROVIDER || 'openstreetmap',
  openStreetMapEndpoint: process.env.OPENSTREETMAP_ENDPOINT || 'https://nominatim.openstreetmap.org',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecretConfigured: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    devRedirectUri: process.env.GOOGLE_DEV_REDIRECT_URI || 'http://localhost:5173/auth/google/callback',
    prodRedirectUri: process.env.GOOGLE_PROD_REDIRECT_URI || ''
  },
  jwt: {
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
    userIssuer: process.env.JWT_ISSUER || 'raksha24x7-api',
    userAudience: process.env.JWT_AUDIENCE || 'raksha24x7-users',
    adminIssuer: process.env.ADMIN_JWT_ISSUER || 'raksha24x7-admin',
    adminAudience: process.env.ADMIN_JWT_AUDIENCE || 'raksha24x7-admins',
    userExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    adminExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '8h'
  },
  mongo: {
    uri: process.env.MONGODB_URI || '',
    maxPoolSize: numberFromEnv('MONGODB_MAX_POOL_SIZE', 20),
    minPoolSize: numberFromEnv('MONGODB_MIN_POOL_SIZE', 2),
    serverSelectionTimeoutMS: numberFromEnv('MONGODB_SERVER_SELECTION_TIMEOUT_MS', 10000),
    socketTimeoutMS: numberFromEnv('MONGODB_SOCKET_TIMEOUT_MS', 45000),
    connectTimeoutMS: numberFromEnv('MONGODB_CONNECT_TIMEOUT_MS', 10000),
    retryAttempts: numberFromEnv('MONGODB_RETRY_ATTEMPTS', 3),
    retryDelayMS: numberFromEnv('MONGODB_RETRY_DELAY_MS', 2000)
  },
  email: {
    provider: String(process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : 'smtp')).toLowerCase(),
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST || '',
    port: numberFromEnv('EMAIL_PORT', numberFromEnv('SMTP_PORT', 587)),
    user: process.env.EMAIL_USER || process.env.SMTP_USER || '',
    passConfigured: Boolean(process.env.EMAIL_PASS || process.env.SMTP_PASS),
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER || 'no-reply@raksha24x7.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Raksha24x7',
    resendConfigured: Boolean(process.env.RESEND_API_KEY)
  },
  backup: {
    enabled: String(process.env.BACKUP_ENABLED || 'false').toLowerCase() === 'true',
    directory: process.env.BACKUP_DIRECTORY || 'server/backups',
    retentionDays: numberFromEnv('BACKUP_RETENTION_DAYS', 30),
    dailyKeep: numberFromEnv('BACKUP_KEEP_DAILY', 7),
    weeklyKeep: numberFromEnv('BACKUP_KEEP_WEEKLY', 4),
    monthlyKeep: numberFromEnv('BACKUP_KEEP_MONTHLY', 12),
    schedule: process.env.BACKUP_SCHEDULE || 'daily',
    provider: String(process.env.BACKUP_PROVIDER || 'local').toLowerCase(),
    compression: String(process.env.BACKUP_COMPRESSION || 'true').toLowerCase() !== 'false',
    encryption: String(process.env.BACKUP_ENCRYPTION || 'false').toLowerCase() === 'true',
    encryptionKeyConfigured: Boolean(process.env.BACKUP_ENCRYPTION_KEY),
    maxCollectionExport: numberFromEnv('BACKUP_MAX_COLLECTION_EXPORT', 0)
  }
};

export default appConfig;
