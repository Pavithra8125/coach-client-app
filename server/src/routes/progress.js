// Per-client progress data: weight log and body measurements.
// Mounted at /api/clients/:clientId/... (see app.js), all behind requireAuth.
import { Router } from 'express';
import { db } from '../db.js';

export const progressRouter = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 404s and returns null if the client doesn't exist.
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

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// ---- Weight log -----------------------------------------------------------

// GET /api/clients/:clientId/weight — oldest first (what the chart wants).
progressRouter.get('/:clientId/weight', (req, res) => {
  if (!requireClient(req, res)) return;
  const entries = db
    .prepare(
      'SELECT id, client_id, date, weight FROM weight_entries WHERE client_id = ? ORDER BY date, id'
    )
    .all(req.params.clientId);
  res.json({ entries });
});

// POST /api/clients/:clientId/weight — add or update that day's weight (upsert).
progressRouter.post('/:clientId/weight', (req, res) => {
  if (!requireClient(req, res)) return;
  const { date, weight } = req.body ?? {};
  if (!validateDate(date)) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
  const w = toNumber(weight);
  if (w === null || w <= 0) return res.status(400).json({ error: 'weight must be a positive number' });

  db.prepare(
    `INSERT INTO weight_entries (client_id, date, weight) VALUES (?, ?, ?)
     ON CONFLICT(client_id, date) DO UPDATE SET weight = excluded.weight`
  ).run(req.params.clientId, date, w);

  const entry = db
    .prepare('SELECT id, client_id, date, weight FROM weight_entries WHERE client_id = ? AND date = ?')
    .get(req.params.clientId, date);
  res.status(201).json({ entry });
});

// DELETE /api/clients/:clientId/weight/:entryId
progressRouter.delete('/:clientId/weight/:entryId', (req, res) => {
  if (!requireClient(req, res)) return;
  const result = db
    .prepare('DELETE FROM weight_entries WHERE id = ? AND client_id = ?')
    .run(req.params.entryId, req.params.clientId);
  if (result.changes === 0) return res.status(404).json({ error: 'Entry not found' });
  res.json({ ok: true });
});

// ---- Measurements ---------------------------------------------------------

// GET /api/clients/:clientId/measurements — newest first for the table.
progressRouter.get('/:clientId/measurements', (req, res) => {
  if (!requireClient(req, res)) return;
  const entries = db
    .prepare(
      'SELECT id, client_id, date, waist, chest, arms, body_fat FROM measurements WHERE client_id = ? ORDER BY date DESC, id DESC'
    )
    .all(req.params.clientId);
  res.json({ entries });
});

// POST /api/clients/:clientId/measurements — any subset of fields is fine.
progressRouter.post('/:clientId/measurements', (req, res) => {
  if (!requireClient(req, res)) return;
  const { date, waist, chest, arms, body_fat } = req.body ?? {};
  if (!validateDate(date)) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

  const fields = { waist, chest, arms, body_fat };
  for (const [key, value] of Object.entries(fields)) {
    const n = toNumber(value);
    if (n !== null && n < 0) return res.status(400).json({ error: `${key} must be a positive number` });
    fields[key] = n;
  }

  const result = db
    .prepare(
      'INSERT INTO measurements (client_id, date, waist, chest, arms, body_fat) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      req.params.clientId,
      date,
      fields.waist,
      fields.chest,
      fields.arms,
      fields.body_fat
    );
  const entry = db
    .prepare('SELECT id, client_id, date, waist, chest, arms, body_fat FROM measurements WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json({ entry });
});

// DELETE /api/clients/:clientId/measurements/:entryId
progressRouter.delete('/:clientId/measurements/:entryId', (req, res) => {
  if (!requireClient(req, res)) return;
  const result = db
    .prepare('DELETE FROM measurements WHERE id = ? AND client_id = ?')
    .run(req.params.entryId, req.params.clientId);
  if (result.changes === 0) return res.status(404).json({ error: 'Entry not found' });
  res.json({ ok: true });
});
