# Module 15C – Logging & Monitoring

Raksha24x7 now includes a backend logging and monitoring foundation for production operations.

## Logging

Centralized logging is configured in `server/src/config/logger.js` using Winston and daily rotating files.

Log files are written under `server/logs/` by default and are ignored by Git:

- `application-YYYY-MM-DD.log`
- `error-YYYY-MM-DD.log`
- `security-YYYY-MM-DD.log`
- `request-YYYY-MM-DD.log`
- `admin-YYYY-MM-DD.log`
- `performance-YYYY-MM-DD.log`

Archived logs are compressed and retained for 30 days.

Development logs are colorized and human-readable. Production logs are structured JSON.

## Request logging

Every request receives a correlation id through `X-Request-ID`.

Request logs include:

- request id
- method
- URL
- IP address
- user agent
- authenticated user id, when available
- authenticated admin id, when available
- status code
- response time
- request size
- response size

Passwords, tokens, cookies, secrets, and API keys are redacted.

## Error logging

The global error handler logs structured errors and returns safe API responses.

Production responses never expose stack traces, file paths, database internals, tokens, or secrets. Development responses may include stack traces for debugging.

Unhandled promise rejections and uncaught exceptions are logged from `server/src/server.js`.

## Security logging

Security logs track:

- rate limit triggers
- missing/invalid/expired user tokens
- missing/invalid/expired admin tokens
- denied admin roles or permissions
- suspicious payloads / NoSQL operator attempts
- Firebase token verification failures
- CORS blocks

## Admin audit logging

Existing admin audit logs are preserved and enriched with:

- request id
- browser
- operating system
- device
- IP address
- timestamp

Admin audit events are stored in MongoDB and also written to the admin log.

## User activity logging

Important user actions are logged as structured application events:

- registration
- login
- Google login
- logout
- password setup/change/reset
- email verification
- profile completion/update
- emergency contact create/update/delete
- SOS create/complete
- live location updates
- saved locations

## Health and metrics

`GET /api/health` returns:

- application status
- environment
- Node.js version
- uptime
- current time
- memory usage
- CPU usage
- load average
- MongoDB status and ping time
- SMTP configuration status
- JWT configuration status
- version
- metrics snapshot

`GET /api/health/metrics` returns the in-memory metrics snapshot for future admin monitoring dashboards.

Metrics include:

- total requests
- average response time
- status code counts
- slow request threshold
- recent slow requests
- recent errors
- memory warnings

## Slow request monitoring

Requests slower than `SLOW_REQUEST_THRESHOLD_MS` are logged to the performance log.

Default:

```env
SLOW_REQUEST_THRESHOLD_MS=1000
```

## Memory monitoring

Memory health is checked during health snapshots. High heap usage logs a warning.

Default:

```env
MEMORY_WARNING_RATIO=0.85
```

## Future alert readiness

The monitoring service is intentionally structured for future alert integrations such as:

- high memory usage
- MongoDB down
- SMTP failure
- high error rate
- slow API spike
- server down

No external alert provider is integrated in Module 15C.
