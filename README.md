# Raksha 24x7

Module 1: MERN project setup.

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: MongoDB (Mongoose)

## Project Structure
```text
raksha-24x7/
├── client/
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
├── server/
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       │   └── db.js
│       └── routes/
│           └── health.route.js
├── .env.example
├── .gitignore
└── package.json
```

## Setup
### 1) Install dependencies
```bash
npm install
npm run install:all
```

### 2) Configure environment
Copy `.env.example` to `.env` and update values.

```bash
cp .env.example .env
```

### 3) Run in development
```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Health check: http://localhost:5000/api/health

## Scripts
### Root
- `npm run dev` - Run both client and server concurrently
- `npm run dev:client` - Run Vite frontend
- `npm run dev:server` - Run Express backend with nodemon
- `npm run install:all` - Install dependencies in root, client, and server
- `npm run build` - Build frontend
- `npm run start` - Start backend in production mode

### Client
- `npm run dev`
- `npm run build`
- `npm run preview`

### Server
- `npm run dev`
- `npm run start`

## Notes
Only Module 1 scaffold is included as requested.
