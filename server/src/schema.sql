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

-- Weight log (slice 3). One row per client per day — logging a second weight
-- for the same day replaces the first (upsert). weight is stored in kg.
CREATE TABLE IF NOT EXISTS weight_entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date       TEXT NOT NULL, -- YYYY-MM-DD
  weight     REAL NOT NULL, -- kg
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (client_id, date)
);

-- Body measurements (slice 3). Multiple sessions per day allowed.
-- Lengths in cm, body_fat as a percentage. Null = not measured that day.
CREATE TABLE IF NOT EXISTS measurements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date       TEXT NOT NULL, -- YYYY-MM-DD
  waist      REAL, -- cm
  chest      REAL, -- cm
  arms       REAL, -- cm
  body_fat   REAL, -- percent
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_weight_client_date ON weight_entries (client_id, date);
CREATE INDEX IF NOT EXISTS idx_measurements_client ON measurements (client_id, date);
