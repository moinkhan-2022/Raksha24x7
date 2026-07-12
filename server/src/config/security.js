const csv = (value = '') => String(value).split(',').map((item) => item.trim()).filter(Boolean);

export const isProduction = process.env.NODE_ENV === 'production';

export const CLIENT_ORIGINS = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...csv(process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS)
].filter(Boolean);

export const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (CLIENT_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After'],
  maxAge: 60 * 60
};

export const helmetOptions = {
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: [
        "'self'",
        ...CLIENT_ORIGINS,
        'https://*.googleapis.com',
        'https://*.google.com',
        'https://*.gstatic.com',
        'https://*.firebaseio.com',
        'https://*.firebaseapp.com',
        'https://*.cloudinary.com',
        'https://api.resend.com'
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      frameSrc: ["'self'", 'https://accounts.google.com', 'https://*.firebaseapp.com', 'https://*.google.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'https://*.googleusercontent.com', 'https://*.gstatic.com', 'https://*.cloudinary.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://*.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com'],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      upgradeInsecureRequests: isProduction ? [] : null
    }
  },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: isProduction ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true
};

export const permissionsPolicy = [
  'accelerometer=()',
  'autoplay=()',
  'camera=(self)',
  'clipboard-read=(self)',
  'clipboard-write=(self)',
  'geolocation=(self)',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=(self)',
  'payment=()',
  'usb=()'
].join(', ');

export const jwtConfig = {
  algorithm: 'HS256',
  userIssuer: 'raksha24x7-api',
  userAudience: 'raksha24x7-users',
  adminIssuer: 'raksha24x7-admin',
  adminAudience: 'raksha24x7-admins'
};
