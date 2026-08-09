// Per-client workout data (slice 4): the plan (named days of exercises from the
// shared library), logged sessions (one per client per date), and the derived
// progressive-overload + PR view. Mounted at /api/clients, behind requireAuth.
import { Router } from 'express';
import { db } from '../db.js';

export const workoutsRouter = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function requireClient(req, res) {
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.clientId);
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return null;
  }
  return client;
}

function validateDate(date) {
  return typeof date === 'string' && DATE_RE.test(date);
}

function toPosInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toPosNum(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Estimated one-rep max (Epley) — lets a heavy low-rep set be compared fairly
// against a lighter high-rep set. Rounded to one decimal.
function e1rm(weight, reps) {
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// Accepts an array of ids, returns only positive integers that exist in the
// library, deduped — unknown ids are dropped rather than crashing on the FK.
function cleanExerciseIds(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const ids = [];
  for (const v of raw) {
    const n = Number(v);
    if (Number.isInteger(n) && n > 0 && !seen.has(n)) {
      seen.add(n);
      ids.push(n);
    }
  }
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const existing = new Set(
    db.prepare(`SELECT id FROM exercises WHERE id IN (${placeholders})`).all(...ids).map((r) => r.id)
  );
  return ids.filter((id) => existing.has(id));
}

// ---- Plan -----------------------------------------------------------------

// GET /api/clients/:clientId/plan — days in order, each with its exercises.
workoutsRouter.get('/:clientId/plan', (req, res) => {
  if (!requireClient(req, res)) return;
  const rows = db
    .prepare(
      `SELECT wd.id AS day_id, wd.name, wde.exercise_id, e.name AS exercise_name, e.category
       FROM workout_days wd
       LEFT JOIN workout_day_exercises wde ON wde.workout_day_id = wd.id
       LEFT JOIN exercises e ON e.id = wde.exercise_id
       WHERE wd.client_id = ?
       ORDER BY wd.sort_order, wde.sort_order, wd.id`
    )
    .all(req.params.clientId);

  const days = [];
  const byId = new Map();
  for (const row of rows) {
    let day = byId.get(row.day_id);
    if (!day) {
      day = { id: row.day_id, name: row.name, exercises: [] };
      byId.set(row.day_id, day);
      days.push(day);
    }
    if (row.exercise_id != null) {
      day.exercises.push({ id: row.exercise_id, name: row.exercise_name, category: row.category });
    }
  }
  res.json({ days });
});

// POST /api/clients/:clientId/plan/days — create a named day with exercises.
workoutsRouter.post('/:clientId/plan/days', (req, res) => {
  if (!requireClient(req, res)) return;
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ error: 'name is required' });

  const ids = cleanExerciseIds(req.body?.exercise_ids);
  const dayId = db.transaction((clientId, dayName, exerciseIds) => {
    const result = db
      .prepare('INSERT INTO workout_days (client_id, name) VALUES (?, ?)')
      .run(clientId, dayName);
    const insert = db.prepare(
      'INSERT INTO workout_day_exercises (workout_day_id, exercise_id, sort_order) VALUES (?, ?, ?)'
    );
    exerciseIds.forEach((exerciseId, i) => insert.run(result.lastInsertRowid, exerciseId, i));
    return result.lastInsertRowid;
  })(req.params.clientId, name, ids);

  res.status(201).json({ dayId });
});

// PUT /api/clients/:clientId/plan/days/:dayId — rename, and/or replace the
// exercise list (send exercise_ids to replace it; omit to leave it alone).
workoutsRouter.put('/:clientId/plan/days/:dayId', (req, res) => {
  if (!requireClient(req, res)) return;
  const day = db
    .prepare('SELECT id FROM workout_days WHERE id = ? AND client_id = ?')
    .get(req.params.dayId, req.params.clientId);
  if (!day) return res.status(404).json({ error: 'Workout day not found' });

  const body = req.body ?? {};
  const name = typeof body.name === 'string' ? body.name.trim() : null;
  const ids = cleanExerciseIds(body.exercise_ids);

  db.transaction((dayId, dayName, exerciseIds) => {
    if (dayName) db.prepare('UPDATE workout_days SET name = ? WHERE id = ?').run(dayName, dayId);
    if (Array.isArray(body.exercise_ids)) {
      db.prepare('DELETE FROM workout_day_exercises WHERE workout_day_id = ?').run(dayId);
      const insert = db.prepare(
        'INSERT INTO workout_day_exercises (workout_day_id, exercise_id, sort_order) VALUES (?, ?, ?)'
      );
      exerciseIds.forEach((exerciseId, i) => insert.run(dayId, exerciseId, i));
    }
  })(req.params.dayId, name, ids);

  res.json({ ok: true });
});

// DELETE /api/clients/:clientId/plan/days/:dayId — logged sessions keep their
// rows (workout_day_id is set to NULL via ON DELETE SET NULL).
workoutsRouter.delete('/:clientId/plan/days/:dayId', (req, res) => {
  if (!requireClient(req, res)) return;
  const result = db
    .prepare('DELETE FROM workout_days WHERE id = ? AND client_id = ?')
    .run(req.params.dayId, req.params.clientId);
  if (result.changes === 0) return res.status(404).json({ error: 'Workout day not found' });
  res.json({ ok: true });
});

// ---- Sessions -------------------------------------------------------------

// GET /api/clients/:clientId/sessions — newest first, each with its sets.
workoutsRouter.get('/:clientId/sessions', (req, res) => {
  if (!requireClient(req, res)) return;
  const sessions = db
    .prepare(
      `SELECT s.id, s.date, s.workout_day_id, s.notes, wd.name AS day_name
       FROM workout_sessions s
       LEFT JOIN workout_days wd ON wd.id = s.workout_day_id
       WHERE s.client_id = ?
       ORDER BY s.date DESC, s.id DESC`
    )
    .all(req.params.clientId);
  const byId = new Map(sessions.map((s) => [s.id, { ...s, exercises: [] }]));

  const sets = db
    .prepare(
      `SELECT st.session_id, st.exercise_id, st.set_number, st.weight, st.reps, e.name AS exercise_name
       FROM workout_sets st
       JOIN workout_sessions s ON s.id = st.session_id
       JOIN exercises e ON e.id = st.exercise_id
       WHERE s.client_id = ?
       ORDER BY st.session_id, st.exercise_id, st.set_number`
    )
    .all(req.params.clientId);

  for (const row of sets) {
    const session = byId.get(row.session_id);
    if (!session) continue;
    let exercise = session.exercises.find((ex) => ex.id === row.exercise_id);
    if (!exercise) {
      exercise = { id: row.exercise_id, name: row.exercise_name, sets: [] };
      session.exercises.push(exercise);
    }
    exercise.sets.push({ set_number: row.set_number, weight: row.weight, reps: row.reps });
  }

  res.json({ sessions: [...byId.values()] });
});

// POST /api/clients/:clientId/sessions — upsert a session for a date.
// Saving again for the same date replaces that day's session (and its sets).
workoutsRouter.post('/:clientId/sessions', (req, res) => {
  if (!requireClient(req, res)) return;
  const { date, workout_day_id, notes, sets } = req.body ?? {};
  if (!validateDate(date)) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

  if (!Array.isArray(sets) || sets.length === 0) {
    return res.status(400).json({ error: 'sets must be a non-empty array' });
  }
  const cleaned = [];
  for (const [i, set] of sets.entries()) {
    const exerciseId = toPosInt(set?.exercise_id);
    const weight = toPosNum(set?.weight);
    const reps = toPosInt(set?.reps);
    if (exerciseId === null || weight === null || reps === null) {
      return res
        .status(400)
        .json({ error: `set ${i + 1}: exercise_id, weight (kg) and whole-number reps are required` });
    }
    cleaned.push({ exercise_id: exerciseId, weight, reps });
  }

  const dayId = workout_day_id == null || workout_day_id === '' ? null : toPosInt(workout_day_id);
  if (dayId !== null) {
    const day = db
      .prepare('SELECT id FROM workout_days WHERE id = ? AND client_id = ?')
      .get(dayId, req.params.clientId);
    if (!day) return res.status(400).json({ error: 'workout_day_id does not belong to this client' });
  }
  const note = typeof notes === 'string' && notes.trim() ? notes.trim() : null;

  try {
    const sessionId = db.transaction((clientId, data) => {
      let session = db
        .prepare('SELECT id FROM workout_sessions WHERE client_id = ? AND date = ?')
        .get(clientId, data.date);
      if (session) {
        db.prepare(
          `UPDATE workout_sessions
           SET workout_day_id = ?, notes = ?, updated_at = datetime('now')
           WHERE id = ?`
        ).run(data.dayId, data.note, session.id);
      } else {
        session = {
          id: db
            .prepare(
              'INSERT INTO workout_sessions (client_id, date, workout_day_id, notes) VALUES (?, ?, ?, ?)'
            )
            .run(clientId, data.date, data.dayId, data.note).lastInsertRowid,
        };
      }
      db.prepare('DELETE FROM workout_sets WHERE session_id = ?').run(session.id);
      const insert = db.prepare(
        'INSERT INTO workout_sets (session_id, exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?, ?)'
      );
      data.sets.forEach((set, i) => insert.run(session.id, set.exercise_id, i + 1, set.weight, set.reps));
      return session.id;
    })(req.params.clientId, { date, dayId, note, sets: cleaned });

    res.status(201).json({ sessionId });
  } catch (err) {
    if (err?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ error: 'One of the exercises no longer exists' });
    }
    throw err;
  }
});

// DELETE /api/clients/:clientId/sessions/:sessionId
workoutsRouter.delete('/:clientId/sessions/:sessionId', (req, res) => {
  if (!requireClient(req, res)) return;
  const result = db
    .prepare('DELETE FROM workout_sessions WHERE id = ? AND client_id = ?')
    .run(req.params.sessionId, req.params.clientId);
  if (result.changes === 0) return res.status(404).json({ error: 'Workout session not found' });
  res.json({ ok: true });
});

// ---- Derived: progressive overload + PRs -----------------------------------

// GET /api/clients/:clientId/lift-history — per exercise, every logged session
// with its best set (by est. 1RM), plus the all-time PR. The client renders
// each lift's progression here; overload = a row's e1RM vs the previous row.
workoutsRouter.get('/:clientId/lift-history', (req, res) => {
  if (!requireClient(req, res)) return;
  const rows = db
    .prepare(
      `SELECT st.exercise_id, e.name AS exercise_name, e.category,
              s.id AS session_id, s.date, st.weight, st.reps
       FROM workout_sets st
       JOIN workout_sessions s ON s.id = st.session_id
       JOIN exercises e ON e.id = st.exercise_id
       WHERE s.client_id = ?
       ORDER BY e.category IS NULL, e.category COLLATE NOCASE, e.name COLLATE NOCASE,
                s.date, s.id, st.set_number`
    )
    .all(req.params.clientId);

  // Group by exercise, keeping only each session's best set (highest e1RM).
  const byExercise = new Map();
  for (const row of rows) {
    let exercise = byExercise.get(row.exercise_id);
    if (!exercise) {
      exercise = { id: row.exercise_id, name: row.exercise_name, category: row.category, history: [] };
      byExercise.set(row.exercise_id, exercise);
    }
    const est = e1rm(row.weight, row.reps);
    const entry = {
      date: row.date,
      session_id: row.session_id,
      weight: row.weight,
      reps: row.reps,
      est_1rm: est,
    };
    const last = exercise.history[exercise.history.length - 1];
    if (last && last.session_id === row.session_id) {
      if (est > last.est_1rm) exercise.history[exercise.history.length - 1] = entry;
    } else {
      exercise.history.push(entry);
    }
  }

  const exercises = [...byExercise.values()].map((exercise) => {
    let pr = null;
    for (const h of exercise.history) {
      if (!pr || h.est_1rm > pr.est_1rm || (h.est_1rm === pr.est_1rm && h.weight > pr.weight)) {
        pr = h;
      }
    }
    return { ...exercise, pr };
  });

  res.json({ exercises });
});
