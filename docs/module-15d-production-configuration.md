# Module 15D – Production Configuration

Raksha24x7 now has deployment-ready production configuration for a Vercel frontend, Render/Railway backend, MongoDB Atlas, Google OAuth/Firebase Auth, and production email providers.

## Environment files

Server env loading supports layered files in this order without overriding already-set platform variables:

1. `server/.env.{NODE_ENV}.local`
2. `server/.env.{NODE_ENV}`
3. `server/.env.local`
4. `server/.env`
5. root `.env.{NODE_ENV}.local`
6. root `.env.{NODE_ENV}`
7. root `.env.local`
8. root `.env`

Examples added:

- `server/.env.development.example`
- `server/.env.production.example`
- `client/.env.development.example`
- `client/.env.production.example`
- `.env.example`
- `server/.env.example`
- `client/.env.example`

Do not commit real `.env` files.

## Required production server variables

Production startup validates critical variables and fails fast with clear messages.

Required:

- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_JWT_SECRET`
- `CLIENT_URL`
- `SERVER_URL`
- `COOKIE_SECRET`
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- at least one production email provider configuration:
  - `RESEND_API_KEY`, or
  - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, or
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

Recommended:

- use a MongoDB Atlas `mongodb+srv://` URI in production
- use 64+ character random secrets
- set `CORS_ORIGINS` to production frontend domains only
- set `EMAIL_VERIFY_ON_STARTUP=true` after SMTP/Resend is configured

## MongoDB Atlas readiness

MongoDB connection now supports:

- connection pooling
- min/max pool size
- server selection timeout
- socket timeout
- connect timeout
- retry attempts
- retry delay
- connection event monitoring
- graceful shutdown
- health checks through `/api/health`

Key variables:

```env
MONGODB_MAX_POOL_SIZE=30
MONGODB_MIN_POOL_SIZE=5
MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000
MONGODB_SOCKET_TIMEOUT_MS=45000
MONGODB_CONNECT_TIMEOUT_MS=10000
MONGODB_RETRY_ATTEMPTS=5
MONGODB_RETRY_DELAY_MS=3000
```

## Email production readiness

Supported providers:

- Resend
- SMTP
- Gmail SMTP
- SendGrid SMTP
- Mailgun SMTP
- Amazon SES SMTP

Provider selection:

```env
EMAIL_PROVIDER=resend
```

or:

```env
EMAIL_PROVIDER=smtp
```

SMTP aliases are supported with either `EMAIL_*` or `SMTP_*` variables.

## Google OAuth / Firebase Auth production readiness

Production variables:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_PROD_REDIRECT_URI=https://your-domain.com/auth/google/callback
GOOGLE_AUTHORIZED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

For Firebase Admin token verification:

```env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Express production settings

The backend now uses:

- disabled `x-powered-by`
- configurable trust proxy
- secure Helmet headers
- CORS from production env
- optimized JSON/urlencoded parser limits
- compression
- request IDs
- structured production logging
- no-cache API headers
- optional static `client/dist` serving when present
- long cache headers for versioned assets
- no-cache for service worker, manifest, and `index.html`

## Frontend production build

Vite now supports:

- env-driven dev proxy
- production minification
- CSS code splitting
- vendor chunk splitting
- asset hashing
- sourcemap toggle

Useful variables:

```env
VITE_SERVER_URL=https://api.your-domain.com
VITE_API_PROXY_TARGET=https://api.your-domain.com
VITE_BUILD_SOURCEMAP=false
```

The app still uses relative `/api` calls, which works well with Vercel rewrites or same-domain reverse proxies.

## Deployment notes

### Vercel frontend

Set `client` as the project root or configure:

- Build command: `npm run build`
- Output directory: `dist`
- Env file values from `client/.env.production.example`

### Render / Railway backend

Set:

- Root: repository root or `server`
- Start command from server root: `npm start`
- `NODE_ENV=production`
- variables from `server/.env.production.example`

### MongoDB Atlas

Use an Atlas connection string and whitelist the deployment provider IPs, or allow provider outbound ranges as recommended by your host.

## Security reminders

- Never commit `.env`.
- Rotate secrets before production.
- Keep `JWT_SECRET` and `ADMIN_JWT_SECRET` different.
- Keep production CORS restricted.
- Do not use localhost URLs in production.
- Use HTTPS URLs only in production.
