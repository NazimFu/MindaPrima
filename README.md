# Minda Prima

Tuition centre portal: students, guardians, teachers, classes, transport, billing and WhatsApp invoices.

## Layout

| Folder | What it holds |
| --- | --- |
| `frontend/` | Next.js app. Pages, components and styles. Talks to the backend only through `/api/v1`. No secrets, no Google Sheets or WhatsApp access. |
| `backend/` | Express API. Routes, services, the Google Sheets data layer, auth, validation, WhatsApp and scheduled jobs. |
| `common/` | Code both sides import: types, zod schemas, fee and status rules, constants and all images (`common/images`). |

The Google Spreadsheet is the only database, one tab per entity. Only `backend/src/sheets` touches it.
Fees, sessions, levels, subjects, classes, vehicles and message templates are rows in the sheet and are edited in the app.
Configuration comes from environment variables and is validated at startup.

## Setup

1. `npm install`
2. Create a Google Cloud service account, enable the Sheets API, create a spreadsheet and share it with the service account email (Editor).
3. `cp backend/.env.example backend/.env` and fill it in (`JWT_SECRET`, `GOOGLE_*`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CORS_ORIGINS`).
   If the spreadsheet already has tabs named `Students`, `Teachers` and so on, set `SHEET_TAB_PREFIX=MP_` so the new tabs do not clash.
4. `cp frontend/.env.example frontend/.env.local`
5. `npm run setup:sheets` creates the tabs, the first admin and starter data (levels, subjects, sessions, prices). Edit them in the app.
6. `npm run dev` starts the API on :4000 and the app on :9002.

Try it without Google: `npm run dev:demo -w @minda/backend` runs the API on an in-memory sheet with demo data.
It signs in as `admin@demo.local` with the password `demo-admin-password`. Nothing is saved, and it refuses to run in production.

## Checks

`npm run typecheck`, `npm test`, `npm run build`, `npm run audit`. CI runs them on every push and pull request.

## Security notes

- Passwords hashed with bcrypt. Access token and rotating refresh token in httpOnly, SameSite=Strict cookies (Secure in production).
- CSRF double-submit token plus Origin check, strict CORS allow-list, helmet headers, nonce-based CSP, rate limits, login lockout.
- Role based access (admin, staff, teacher, driver). A driver can only see and update their own vehicle.
- Every input is validated with a strict zod schema. Cell values are neutralised against spreadsheet formula injection.
- Audit log of changes. No secrets in the repo or in logs.
- WhatsApp sessions (`.wwebjs_auth`) are credentials. They are git-ignored. Never commit them.
