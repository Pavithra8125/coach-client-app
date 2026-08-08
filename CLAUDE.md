# Coach's Client App

Private, password-protected web app for a gym coach (**single user — one
login**) to manage his clients' diet plans, workout programs, and progress
tracking (weight, measurements, PRs) in one place. Built as a personal tool by
his girlfriend; includes a light personal/motivational layer alongside the
core coaching features.

Full detail: [docs/project-plan.md](docs/project-plan.md).

## Users
- Only the coach logs in (username + password). No client-facing login.
- He manages many client profiles; data is entered/updated on their behalf.

## Tech stack
- **Frontend:** React + Tailwind, Vite build, Tailwind v4 via `@tailwindcss/vite`
- **Backend:** Node/Express, ESM, dev hot-reload via `node --watch`
- **DB:** SQLite (`better-sqlite3`, sync) at `server/db/app.sqlite` (gitignored)
- **Auth:** bcryptjs (hashed passwords, never plain text) + `express-session`
  cookie sessions (30-day, with logout)
- **Hosting:** TBD (Vercel/Render candidates once built)

## Structure
- `client/` — React SPA. Vite dev proxy forwards `/api` → `localhost:4000`.
- `server/` — Express API. Entry `server/index.js` → `src/app.js`; feature
  routes mount in `src/routes/` (planned files listed in its README).
- Root `npm run dev` starts both with concurrently. `cp server/.env.example
  server/.env` before first run.

## Core features (build order / vertical slices)
1. Project scaffold (done) + login/auth end-to-end (done)
2. Client list + add/edit/delete client profiles (done)
3. Weight/measurement logging + smoothed trend graph
4. Workout plan builder + logging + progressive overload view + PR tracker
5. Diet/macro logging (meal plans, food log, water, supplements)
6. Weekly check-ins + coach's log notes
7. Gamification (streaks, badges, milestones)
8. Personal layer (quote of the day, notes from me, hidden "why" reminder)

## Auth implementation notes (slice 1)
- Coach account is created by `npm run seed -w server` (username/password from
  `COACH_USERNAME` / `COACH_PASSWORD` in `server/.env`; idempotent — skips if
  the user exists). Passwords hashed with bcryptjs (never plain text).
- Sessions are cookie-based (`coach.sid`, httpOnly, 30-day) and backed by
  SQLite via `server/src/sessionStore.js`, so logins survive server restarts.
- Endpoints: `POST /api/auth/login`, `POST /api/auth/logout`,
  `GET /api/auth/me`. `server/src/middleware/requireAuth.js` guards private routes.
- Client: `AuthContext` holds session state; `ProtectedRoute` guards pages;
  `/login` is the only public page.

## Clients (slice 2)
- `clients` table: name, photo_url (a link for now — upload later), goals,
  start_date (YYYY-MM-DD), timestamps. CRUD in `server/src/routes/clients.js`,
  all behind `requireAuth`.
- Client: `ClientList` (dashboard, add/edit/delete modal), `ClientDetail`
  at `/clients/:id` with placeholder sections for workouts/diet/progress.

## Operational notes
- The real coach account lives in `server/.env` as `Arun` (seeded by the user).
  Never delete the DB or the `Arun` user; if test data was added, remove only
  the exact rows created during verification (e.g. a `coach` test user).

## How to work on this
- Build and test **one slice at a time**: run it, click through, report bugs in
  plain language before moving to the next slice.
- **Commit to git after each working slice.**
- Single-user scale → keep things simple; sync SQLite access is fine.
- Auth is core security: hash passwords, 30-day sessions, logout available.
- Progress tracking graphs should smooth the data, not plot raw daily noise.
