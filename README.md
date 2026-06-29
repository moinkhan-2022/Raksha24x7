# Raksha 24x7

Module 1 + Module 2 completed.

## Install Commands
```bash
npm install
npm run install:all
```

## Environment
Copy `.env.example` to `.env` in project root:
```bash
cp .env.example .env
```

## Run
```bash
npm run dev
```

## Auth API Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile` (Bearer token required)
- `PUT /api/auth/profile` (Bearer token required)
- `POST /api/auth/logout`

## Test Quick Flow
1. Register a user using `/api/auth/register`
2. Login using `/api/auth/login`
3. Copy token and call `/api/auth/profile` with `Authorization: Bearer <token>`
4. Update profile via `PUT /api/auth/profile`
5. Logout via `/api/auth/logout`
