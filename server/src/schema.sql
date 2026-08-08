-- Schema is idempotent: re-run on every server start (CREATE IF NOT EXISTS).
-- New tables for later slices get appended here.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Session store backing (see src/sessionStore.js)
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
