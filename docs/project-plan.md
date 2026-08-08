# Coach's Client Management App — Project Plan

## What This App Does
A private, password-protected web app for a gym coach (single user) to manage
his clients' diet plans, workout programs, and progress tracking (weight,
measurements, PRs) in one place. Built by his girlfriend as a personal tool —
includes a light personal/motivational layer alongside the core coaching
features.

## Who Uses It
- **Single user login**: only the coach logs in (username/password).
- He manages **multiple clients** inside the app (add/edit/remove client profiles).
- No client-facing login needed — this is a coach's back-office tool, not a
  client-facing app. He inputs/updates data on their behalf.

## Tech Stack
- Frontend: React + Tailwind (Vite build, Tailwind v4 via `@tailwindcss/vite`)
- Backend: Node/Express (ESM, `node --watch` for dev)
- Database: SQLite (`better-sqlite3`, file at `server/db/app.sqlite`)
- Auth: username + hashed password (`bcryptjs`) + cookie sessions (`express-session`)
- Hosting: TBD later (Vercel/Render are easy options once built)

## Core Features (Must-Have)

### Auth
- Login page (username + password)
- Password hashed & stored securely, never in plain text
- Session persists (stay logged in) with a logout option

### Client Management
- Add/edit/delete client profiles (name, photo, goals, start date)
- Client list/dashboard — quick view of all clients at a glance
- Individual client detail page

### Per-Client: Workout Tracking
- Workout plan builder (exercises, sets/reps/weight, day split)
- Log completed workouts
- Progressive overload view (compare this week vs last week per lift)
- PR (personal record) tracker per lift

### Per-Client: Diet Tracking
- Meal plan entry (macros: protein/carbs/fat/calories)
- Daily food log
- Water intake tracker
- Supplement tracker

### Per-Client: Progress Tracking
- Weight log with trend graph (smoothed, not just raw daily noise)
- Body measurements (waist, chest, arms, body fat %)
- Progress photos with before/after comparison
- Weekly check-in notes (energy, soreness, sleep, adherence %)

## Nice-to-Have Features (Build After Core Works)

### Gamification (per client)
- Streak counter / workout heatmap
- Achievement badges (milestones hit)
- Milestone countdowns (target weight/lift goals)

### Coach Tools
- "Coach's log" — private notes per client, per week
- Dashboard summary: which clients are on track / falling behind

### The Personal Layer (for him specifically)
- Quote of the day (rotating, pulled from a custom list — books you like)
- "Note from me" section — small rotating personal messages
- Hidden reminder of his own "why" (his stated goals, resurfaced)
- Small relationship/anniversary touch tucked into the dashboard

## Build Order (Vertical Slices)
1. Project scaffold + login/auth working end-to-end
2. Client list + add/edit client profile
3. Weight/measurement logging + trend graph (good first data feature)
4. Workout plan builder + logging + progressive overload view
5. Diet/macro logging
6. Weekly check-ins + coach's log notes
7. Gamification (streaks, badges)
8. Personal layer (quotes, notes from you) — last, as the finishing touch

## Notes for Claude Code Sessions
- Ask Claude Code to create a `CLAUDE.md` early to hold this context
- Build and test one slice at a time — run it, click through, report bugs in
  plain language before moving to the next slice
- Commit to git after each working slice
