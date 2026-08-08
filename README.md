# Coach's Client App

A private, password-protected web app for a gym coach (single user) to manage his
clients' diet plans, workout programs, and progress tracking in one place.

Built as a personal tool — core coaching features plus a light personal layer.

See [docs/project-plan.md](docs/project-plan.md) for the full plan, and
[CLAUDE.md](CLAUDE.md) for the context that guides every dev session.

## Quick start

```bash
npm install        # installs deps for client + server workspaces
cp server/.env.example server/.env   # fill in a real SESSION_SECRET
npm run dev        # starts Express (port 4000) + Vite (port 5173)
```

- API: http://localhost:4000/api (Vite proxies `/api` → the server)
- App: http://localhost:5173

## Status

Scaffold only — no features built yet. Next up: slice 1 (login + auth).
