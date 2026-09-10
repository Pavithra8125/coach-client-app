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

// GET /api/clients/:clientId/measurements — oldest first for the trend chart.
progressRouter.get('/:clientId/measurements', (req, res) => {
  if (!requireClient(req, res)) return;
  const entries = db
    .prepare(
      'SELECT id, client_id, logged_date, weight_kg, body_fat_pct, waist_cm, chest_cm, notes FROM measurements WHERE client_id = ? ORDER BY logged_date, id'
    )
    .all(req.params.clientId);
  res.json({ entries });
});

// POST /api/clients/:clientId/measurements — create a new measurement
progressRouter.post('/:clientId/measurements', (req, res) => {
  if (!requireClient(req, res)) return;
  const { logged_date, weight_kg, body_fat_pct, waist_cm, chest_cm, notes } = req.body ?? {};
  
  if (!validateDate(logged_date)) return res.status(400).json({ error: 'logged_date is required (YYYY-MM-DD)' });

  const fields = { weight_kg, body_fat_pct, waist_cm, chest_cm };
  for (const [key, value] of Object.entries(fields)) {
    const n = toNumber(value);
    if (n !== null && n <= 0) return res.status(400).json({ error: `${key} must be a positive number` });
    fields[key] = n;
  }

  const result = db
    .prepare(
      `INSERT INTO measurements 
       (client_id, coach_id, logged_date, weight_kg, body_fat_pct, waist_cm, chest_cm, notes) 
       VALUES (?, 1, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.params.clientId,
      logged_date,
      fields.weight_kg,
      fields.body_fat_pct,
      fields.waist_cm,
      fields.chest_cm,
      typeof notes === 'string' ? notes.trim() : null
    );
    
  const entry = db
    .prepare('SELECT id, client_id, logged_date, weight_kg, body_fat_pct, waist_cm, chest_cm, notes FROM measurements WHERE id = ?')
    .get(result.lastInsertRowid);
    
  res.status(201).json({ entry });
});
