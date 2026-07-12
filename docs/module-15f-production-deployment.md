# Module 15F – Production Deployment

Raksha24x7 is prepared for production deployment with:

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas
- Email: Resend or Gmail/SMTP
- OAuth/Auth: Google OAuth + Firebase Authentication
- Maps: OpenStreetMap with Google Maps support where configured
- Notifications: Browser notifications / Firebase messaging

## Deployment files

- `vercel.json` – Vercel frontend build, SPA fallback, cache headers
- `render.yaml` – Render backend web service blueprint
- `client/.env.production.example` – frontend production env template
- `server/.env.production.example` – backend production env template

## Frontend deployment on Vercel

Recommended Vercel settings:

- Framework: Vite
- Build command: `npm run build --prefix client`
- Output directory: `client/dist`
- Install command: `npm install`

Required frontend variables:

```env
VITE_APP_ENV=production
VITE_APP_NAME=Raksha24x7
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=https://api.your-domain.com
VITE_SERVER_URL=https://api.your-domain.com
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_VAPID_KEY=your_web_push_certificate_key
```

SPA routing is handled by `vercel.json`, so direct refreshes for routes such as `/dashboard`, `/settings`, and `/admin/*` will return `index.html`.

## Backend deployment on Render

Use `render.yaml` or configure manually:

- Runtime: Node
- Build command: `npm install`
- Start command: `npm run start --prefix server`
- Health check path: `/api/health`
- Environment: `NODE_ENV=production`

Required backend variables:

```env
PORT=5000
NODE_ENV=production
CLIENT_URL=https://your-domain.com
SERVER_URL=https://api.your-domain.com
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
MONGODB_URI=mongodb+srv://...
JWT_SECRET=64_plus_character_random_secret
ADMIN_JWT_SECRET=different_64_plus_character_random_secret
COOKIE_SECRET=64_plus_character_random_secret
SESSION_SECRET=64_plus_character_random_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=no-reply@your-domain.com
EMAIL_FROM_NAME=Raksha24x7
LOG_LEVEL=info
TRUST_PROXY=1
```

## MongoDB Atlas setup

1. Create a MongoDB Atlas cluster.
2. Create a database user with least-privilege access.
3. Add Render outbound IPs or appropriate network access.
4. Use a `mongodb+srv://` connection string.
5. Set `MONGODB_URI` in Render.
6. Verify `/api/health` shows `database: "connected"`.

Production DB options are already supported:

- connection pooling
- retry logic
- timeout configuration
- health checks
- graceful shutdown

## Google OAuth / Firebase Auth

Google/Firebase console setup:

1. Add Vercel frontend domain to authorized domains.
2. Add local dev domain for development:
   - `localhost`
3. Configure OAuth origins:
   - `https://your-domain.com`
4. Configure redirect URI:
   - `https://your-domain.com/auth/google/callback`
5. Configure backend Firebase Admin env:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

Do not commit Firebase private keys.

## Email setup

### Resend

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM=no-reply@your-domain.com
EMAIL_FROM_NAME=Raksha24x7
```

### Gmail SMTP

Use an app password, not your Gmail password:

```env
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=your_email@gmail.com
EMAIL_FROM_NAME=Raksha24x7
```

Verify:

- forgot password
- reset password
- email verification
- login security alerts
- admin email features

## Custom domains

Example:

- Frontend: `https://raksha24x7.com`
- Backend: `https://api.raksha24x7.com`

Set:

```env
CLIENT_URL=https://raksha24x7.com
SERVER_URL=https://api.raksha24x7.com
CORS_ORIGINS=https://raksha24x7.com,https://www.raksha24x7.com
VITE_API_BASE_URL=https://api.raksha24x7.com
```

## HTTPS

Vercel and Render provide HTTPS automatically. Production config is HTTPS-ready:

- secure headers
- HSTS in production
- production CORS
- Google OAuth production origins
- mixed-content prevention through HTTPS env URLs

## Static assets and caching

Vercel config:

- long cache for `/assets/*`
- no-cache for service worker and manifest
- SPA fallback for React Router

Frontend build:

- minification
- code splitting
- vendor chunks
- asset hashing

## Health checks

Render should use:

```http
GET /api/health
```

The endpoint reports:

- app status
- environment
- Node version
- uptime
- memory usage
- CPU usage
- MongoDB status
- email status
- backup status
- metrics snapshot

## Rollback procedure

1. Roll back Vercel deployment to previous working version.
2. Roll back Render deployment to previous commit.
3. Do not roll back MongoDB unless a migration or data corruption occurred.
4. Verify:
   - `/api/health`
   - user login
   - admin login
   - SOS
   - email
   - notifications
   - maps

## Production checklist

- [ ] Vercel frontend deployed.
- [ ] Render backend deployed.
- [ ] `NODE_ENV=production` set.
- [ ] MongoDB Atlas connected.
- [ ] `CLIENT_URL` and `SERVER_URL` use HTTPS.
- [ ] `CORS_ORIGINS` contains only trusted frontend domains.
- [ ] Google authorized domains configured.
- [ ] Firebase Admin env configured.
- [ ] Email provider configured.
- [ ] `/api/health` returns healthy.
- [ ] User login works.
- [ ] Google login works.
- [ ] Forgot/reset password works.
- [ ] Admin login works.
- [ ] SOS works.
- [ ] Maps/nearby services work.
- [ ] Browser notifications work.
- [ ] No browser console errors.
- [ ] No backend startup errors.

## Troubleshooting

### Vercel route refresh returns 404

Confirm `vercel.json` is included and the project root is the repository root.

### Frontend cannot reach backend

Check:

- `VITE_API_BASE_URL`
- backend `SERVER_URL`
- backend `CORS_ORIGINS`
- Render backend URL is HTTPS

### CORS error

Add the exact Vercel/custom frontend origin to `CORS_ORIGINS`.

### Google login fails

Check Firebase authorized domains and Google OAuth client id/secret.

### Emails fail

Check provider env values, sender verification, and backend logs.

### Render health check fails

Check `MONGODB_URI`, required env vars, and `/api/health` response body in logs.
