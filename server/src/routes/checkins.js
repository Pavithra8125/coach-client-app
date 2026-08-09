// Per-client weekly check-ins (slice 6): energy / soreness / sleep ratings
// (1-10), diet adherence (%), and notes. One row per client per date — saving
// a date replaces it (upsert). Mounted at /api/clients, behind requireAuth.
import { Router } from 'express';
import { db } from '../db.js';

export const checkinsRouter = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const COLS = 'id, date, energy, soreness, sleep, adherence, notes, created_at, updated_at';

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

// Optional whole number within [min, max]. Blank/absent → { value: null };
// present but out of range → { error }. Returns an object so callers can't
// confuse a valid 0 with a missing value.
function intRange(raw, field, min, max) {
  if (raw === '' || raw === null || raw === undefined) return { value: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    return { error: `${field} must be a whole number ${min}-${max}` };
  }
  return { value: n };
}

// ---- Check-ins -------------------------------------------------------------

// GET /api/clients/:clientId/checkins — all check-ins, newest first.
checkinsRouter.get('/:clientId/checkins', (req, res) => {
  if (!requireClient(req, res)) return;
  const checkins = db
    .prepare(
      `SELECT ${COLS} FROM checkins WHERE client_id = ? ORDER BY date DESC, id DESC`
    )
    .all(req.params.clientId);
  res.json({ checkins });
});

// GET /api/clients/:clientId/checkins/:date — a single check-in for a day.
checkinsRouter.get('/:clientId/checkins/:date', (req, res) => {
  if (!requireClient(req, res)) return;
  if (!validateDate(req.params.date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }
  const checkin = db
    .prepare(`SELECT ${COLS} FROM checkins WHERE client_id = ? AND date = ?`)
    .get(req.params.clientId, req.params.date);
  if (!checkin) return res.status(404).json({ error: 'No check-in for that date' });
  res.json({ checkin });
});

// PUT /api/clients/:clientId/checkins — save/replace the check-in for a date.
// Any rating left blank is stored as NULL (not filled in that week).
checkinsRouter.put('/:clientId/checkins', (req, res) => {
  if (!requireClient(req, res)) return;
  const { date } = req.body ?? {};
  if (!validateDate(date)) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

  const vals = {};
  for (const [field, min, max] of [
    ['energy', 1, 10],
    ['soreness', 1, 10],
    ['sleep', 1, 10],
    ['adherence', 0, 100],
  ]) {
    const r = intRange(req.body?.[field], field, min, max);
    if (r.error) return res.status(400).json({ error: r.error });
    vals[field] = r.value;
  }
  const notes = typeof req.body?.notes === 'string' && req.body.notes.trim() ? req.body.notes.trim() : null;

  db.prepare(
    `INSERT INTO checkins (client_id, date, energy, soreness, sleep, adherence, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(client_id, date) DO UPDATE SET
       energy = excluded.energy, soreness = excluded.soreness, sleep = excluded.sleep,
       adherence = excluded.adherence, notes = excluded.notes,
       updated_at = datetime('now')`
  ).run(req.params.clientId, date, vals.energy, vals.soreness, vals.sleep, vals.adherence, notes);

  const checkin = db
    .prepare(`SELECT ${COLS} FROM checkins WHERE client_id = ? AND date = ?`)
    .get(req.params.clientId, date);
  res.json({ checkin });
});

// DELETE /api/clients/:clientId/checkins/:id
checkinsRouter.delete('/:clientId/checkins/:id', (req, res) => {
  if (!requireClient(req, res)) return;
  const result = db
    .prepare('DELETE FROM checkins WHERE id = ? AND client_id = ?')
    .run(req.params.id, req.params.clientId);
  if (result.changes === 0) return res.status(404).json({ error: 'Check-in not found' });
  res.json({ ok: true });
});
