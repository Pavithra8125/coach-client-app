# Coach's Client App

A private, password-protected web app for a gym coach (single user) to manage his
clients' diet plans, workout programs, and progress tracking in one place.

Built as a personal tool — core coaching features plus a light personal layer.

See [docs/project-plan.md](docs/project-plan.md) for the full plan, and
[CLAUDE.md](CLAUDE.md) for the context that guides every dev session.

## Quick start

```bash
npm install                              # installs deps for client + server workspaces
cp server/.env.example server/.env       # set SESSION_SECRET + COACH_PASSWORD
npm run seed -w server                   # creates the coach login account
npm run dev                              # starts Express (port 4000) + Vite (port 5173)
```

- API: http://localhost:4000/api (Vite proxies `/api` → the server)
- App: http://localhost:5173 — sign in with the credentials from `server/.env`

## Status

Slices 1 (login + auth) and 2 (client list + add/edit/delete profiles) are done.
Next up: slice 3 (weight/measurement logging + trend graph).
