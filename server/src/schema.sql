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

-- Client profiles (slice 2). photo_url is a link for now; upload could be
-- added later without changing the column.
CREATE TABLE IF NOT EXISTS clients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  photo_url  TEXT,
  goals      TEXT,
  start_date TEXT, -- ISO date YYYY-MM-DD
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
