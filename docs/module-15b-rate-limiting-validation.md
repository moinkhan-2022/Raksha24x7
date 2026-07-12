# Module 15B – Rate Limiting & Validation

Raksha24x7 now uses reusable API protection middleware for rate limiting, request validation, payload sanitization, and consistent error responses.

## Rate limits

| Area | Limit | Window |
| --- | ---: | --- |
| Global `/api` traffic | 300 production / 1000 development | 15 minutes |
| User login | 5 attempts per IP + email | 15 minutes |
| Admin login | 5 attempts per IP + email | 15 minutes |
| Registration | 3 attempts per IP + email | 1 hour |
| Google authentication | 10 attempts | 15 minutes |
| Forgot password | 3 attempts per IP + email | 1 hour |
| Reset password | 5 attempts | 1 hour |
| Email/verification actions | 10 actions per user/IP | 1 hour |
| SOS start/send | 10 requests per user/IP | 5 minutes |
| Admin API | 300 requests per admin/IP | 15 minutes |
| Admin settings | 80 requests per admin/IP | 15 minutes |
| Admin exports/reports | 60 requests per admin/IP | 15 minutes |
| Bulk admin actions | 30 requests per admin/IP | 15 minutes |

When a limit is exceeded, the API returns:

```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

Rate-limited requests are logged with safe metadata only: scope, IP, method, path, user id, and admin id. Tokens, passwords, and request bodies are not logged.

## Validation coverage

Reusable schema validation now protects:

- User registration and login
- Firebase Google login token payload
- Email verification and resend flows
- Forgot/reset password
- Auth/profile password changes
- Profile updates
- Emergency contact create/update/delete parameters
- Live location save and history item delete
- SOS start/send/share-location and SOS id parameters
- Admin login

Validation errors use a consistent response format:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    { "field": "email", "message": "Valid email is required." }
  ]
}
```

## Sanitization and abuse protection

- Request bodies, query strings, and params are recursively sanitized.
- Dangerous NoSQL operator keys such as `$where`, `$regex`, `$ne`, `$or`, and dotted keys are rejected.
- Script tags, `javascript:` URLs, null bytes, and inline event handler attributes are stripped from strings.
- HTTP parameter pollution protection is enabled.
- Upload validation checks MIME type, extension, file size, and unsafe file names.

## Notes for production

- Keep `JWT_SECRET`, `ADMIN_JWT_SECRET`, `COOKIE_SECRET`, and Firebase Admin credentials out of Git.
- Keep `.env` files ignored.
- Tune limits through code or future environment variables if traffic grows.
- Monitor `[RATE_LIMIT_BLOCKED]` logs for suspicious abuse patterns.
