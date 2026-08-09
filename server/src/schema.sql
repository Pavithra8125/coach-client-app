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

-- Exercise library (slice 4). Shared across all clients so exercises aren't
-- retyped per client. Name is unique case-insensitively.
CREATE TABLE IF NOT EXISTS exercises (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL COLLATE NOCASE UNIQUE,
  category   TEXT, -- optional grouping: chest, legs, back, shoulders, arms, core
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Per-client workout plan: named days (e.g. "Chest Day"), each grouping a
-- list of exercises from the library.
CREATE TABLE IF NOT EXISTS workout_days (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workout_day_exercises (
  workout_day_id INTEGER NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  exercise_id    INTEGER NOT NULL REFERENCES exercises(id),
  sort_order     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (workout_day_id, exercise_id)
);

-- Logged workout sessions (slice 4). One row per client per date — re-logging
-- a day replaces that day's session (upsert). workout_day_id is optional: it
-- links the log to the plan day it followed, but sessions can stand alone.
CREATE TABLE IF NOT EXISTS workout_sessions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id      INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date           TEXT NOT NULL, -- YYYY-MM-DD
  workout_day_id INTEGER REFERENCES workout_days(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (client_id, date)
);

-- Logged sets: a session has exercises, each exercise has one or more sets.
-- weight in kg, reps as an integer. PRs and overload are derived from here.
CREATE TABLE IF NOT EXISTS workout_sets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  set_number  INTEGER NOT NULL,
  weight      REAL NOT NULL, -- kg
  reps        INTEGER NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workout_days_client ON workout_days (client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client_date ON workout_sessions (client_id, date);
CREATE INDEX IF NOT EXISTS idx_sets_session ON workout_sets (session_id);
CREATE INDEX IF NOT EXISTS idx_sets_exercise ON workout_sets (exercise_id);

-- ---------------------------------------------------------------------------
-- Diet (slice 5)

-- Meal plan: the client's current daily macro targets. One row per client —
-- re-saving a plan replaces it (upsert). macros in grams, calories in kcal.
CREATE TABLE IF NOT EXISTS meal_plans (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name       TEXT, -- e.g. "Cut · 2000 kcal"
  protein    REAL NOT NULL DEFAULT 0, -- g/day
  carbs      REAL NOT NULL DEFAULT 0, -- g/day
  fat        REAL NOT NULL DEFAULT 0, -- g/day
  calories   INTEGER NOT NULL DEFAULT 0, -- kcal/day
  notes      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (client_id)
);

-- Daily food log: one row per food item eaten. Date + optional meal label
-- (breakfast/lunch/dinner/snack…). Macros in grams, calories in kcal.
CREATE TABLE IF NOT EXISTS food_log_entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date       TEXT NOT NULL, -- YYYY-MM-DD
  meal_label TEXT,
  food_name  TEXT NOT NULL,
  protein    REAL NOT NULL DEFAULT 0, -- g
  carbs      REAL NOT NULL DEFAULT 0, -- g
  fat        REAL NOT NULL DEFAULT 0, -- g
  calories   INTEGER NOT NULL DEFAULT 0, -- kcal
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Water intake: glasses per day, one row per client per day (upsert).
CREATE TABLE IF NOT EXISTS water_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date       TEXT NOT NULL, -- YYYY-MM-DD
  glasses    REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (client_id, date)
);

-- Supplement tracker: the client's supplement list, plus which were taken
-- on each day (a per-supplement-per-day check).
CREATE TABLE IF NOT EXISTS supplements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplement_logs (
  supplement_id INTEGER NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
  date          TEXT NOT NULL, -- YYYY-MM-DD
  PRIMARY KEY (supplement_id, date)
);

CREATE INDEX IF NOT EXISTS idx_food_log_client_date ON food_log_entries (client_id, date);
CREATE INDEX IF NOT EXISTS idx_water_client_date ON water_logs (client_id, date);
CREATE INDEX IF NOT EXISTS idx_supplements_client ON supplements (client_id);

-- ---------------------------------------------------------------------------
-- Check-ins + coach's log (slice 6)

-- Weekly check-in (slice 6). One row per client per date — the coach checks in
-- each week with ratings (energy/soreness/sleep on a 1-10 scale, diet
-- adherence as a %) plus any notes. Re-saving a date replaces it (upsert).
-- Null rating = the coach didn't fill that field that week.
CREATE TABLE IF NOT EXISTS checkins (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date       TEXT NOT NULL, -- YYYY-MM-DD (the day the check-in covers)
  energy     INTEGER, -- 1-10
  soreness   INTEGER, -- 1-10
  sleep      INTEGER, -- 1-10
  adherence  INTEGER, -- 0-100 (%)
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (client_id, date)
);

-- Coach's log (slice 6): private dated journal notes about a client. Only the
-- coach sees these — they're his observations, not the client's. Newest first.
CREATE TABLE IF NOT EXISTS coach_notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date       TEXT NOT NULL, -- YYYY-MM-DD (defaults to today when omitted)
  note       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checkins_client_date ON checkins (client_id, date);
CREATE INDEX IF NOT EXISTS idx_coach_notes_client ON coach_notes (client_id, date);
