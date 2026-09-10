import { Router } from 'express';
import { db } from '../db.js';

export const measurementsRouter = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateDate(date) {
  return typeof date === 'string' && DATE_RE.test(date);
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// PUT /api/measurements/:id
measurementsRouter.put('/:id', (req, res) => {
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
      `UPDATE measurements 
       SET logged_date = ?, weight_kg = ?, body_fat_pct = ?, waist_cm = ?, chest_cm = ?, notes = ?
       WHERE id = ?`
    )
    .run(
      logged_date,
      fields.weight_kg,
      fields.body_fat_pct,
      fields.waist_cm,
      fields.chest_cm,
      typeof notes === 'string' ? notes.trim() : null,
      req.params.id
    );

  if (result.changes === 0) return res.status(404).json({ error: 'Measurement not found' });

  const entry = db
    .prepare('SELECT id, client_id, logged_date, weight_kg, body_fat_pct, waist_cm, chest_cm, notes FROM measurements WHERE id = ?')
    .get(req.params.id);
    
  res.json({ entry });
});

// DELETE /api/measurements/:id
measurementsRouter.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM measurements WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Measurement not found' });
  res.json({ ok: true });
});
