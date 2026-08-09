// Per-client diet (slice 5): daily macro targets, food log, water, and the
// supplement tracker. Mounted at /api/clients, behind requireAuth.
import { Router } from 'express';
import { db } from '../db.js';

export const dietRouter = Router();

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

// Non-negative number, or null if blank/absent. Negative values rejected.
function toNum(v) {
  const n = Number(v);
  if (v === '' || v === null || v === undefined) return null;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function reqNum(v, field) {
  const n = toNum(v);
  if (n === null) return { error: `${field} must be a number ≥ 0` };
  return { value: n };
}

function intOrNull(v, field) {
  const n = Number(v);
  if (v === '' || v === null || v === undefined) return null;
  return Number.isInteger(n) && n >= 0 ? n : { invalid: `${field} must be a whole number ≥ 0` };
}

// Round to one decimal for clean client display.
const dec1 = (n) => Math.round(n * 10) / 10;

// ---- Meal plan -------------------------------------------------------------

// GET /api/clients/:clientId/meal-plan
dietRouter.get('/:clientId/meal-plan', (req, res) => {
  if (!requireClient(req, res)) return;
  const mealPlan = db
    .prepare('SELECT id, name, protein, carbs, fat, calories, notes, updated_at FROM meal_plans WHERE client_id = ?')
    .get(req.params.clientId);
  res.json({ mealPlan: mealPlan ?? null });
});

// PUT /api/clients/:clientId/meal-plan — upsert the daily macro targets.
dietRouter.put('/:clientId/meal-plan', (req, res) => {
  if (!requireClient(req, res)) return;
  const { name: nameRaw, notes: notesRaw } = req.body ?? {};

  const vals = {};
  for (const field of ['protein', 'carbs', 'fat']) {
    const raw = req.body?.[field];
    const parsed = toNum(raw);
    if (raw !== '' && raw !== null && raw !== undefined && parsed === null) {
      return res.status(400).json({ error: `${field} must be a number ≥ 0` });
    }
    vals[field] = parsed ?? 0;
  }
  const calRaw = req.body?.calories;
  const calParsed = intOrNull(calRaw, 'calories');
  if (calParsed && typeof calParsed === 'object') {
    return res.status(400).json({ error: calParsed.error });
  }
  vals.calories = calParsed ?? 0;

  const planName = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : null;
  const notesClean = typeof notesRaw === 'string' && notesRaw.trim() ? notesRaw.trim() : null;

  db.prepare(
    `INSERT INTO meal_plans (client_id, name, protein, carbs, fat, calories, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(client_id) DO UPDATE SET
       name = excluded.name, protein = excluded.protein, carbs = excluded.carbs,
       fat = excluded.fat, calories = excluded.calories, notes = excluded.notes,
       updated_at = datetime('now')`
  ).run(req.params.clientId, planName, vals.protein, vals.carbs, vals.fat, vals.calories, notesClean);

  const mealPlan = db
    .prepare('SELECT id, name, protein, carbs, fat, calories, notes, updated_at FROM meal_plans WHERE client_id = ?')
    .get(req.params.clientId);
  res.json({ mealPlan });
});

// DELETE /api/clients/:clientId/meal-plan
dietRouter.delete('/:clientId/meal-plan', (req, res) => {
  if (!requireClient(req, res)) return;
  db.prepare('DELETE FROM meal_plans WHERE client_id = ?').run(req.params.clientId);
  res.json({ ok: true });
});

// ---- Food log ---------------------------------------------------------------

// GET /api/clients/:clientId/food-log?date=YYYY-MM-DD — that day's entries
// (in added order) plus the running macro totals.
dietRouter.get('/:clientId/food-log', (req, res) => {
  if (!requireClient(req, res)) return;
  const { date } = req.query;
  if (!validateDate(date)) return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD)' });

  const entries = db
    .prepare(
      `SELECT id, date, meal_label, food_name, protein, carbs, fat, calories
       FROM food_log_entries WHERE client_id = ? AND date = ? ORDER BY id`
    )
    .all(req.params.clientId, date);
  const totals = { protein: 0, carbs: 0, fat: 0, calories: 0 };
  for (const entry of entries) {
    totals.protein += entry.protein;
    totals.carbs += entry.carbs;
    totals.fat += entry.fat;
    totals.calories += entry.calories;
  }
  totals.protein = dec1(totals.protein);
  totals.carbs = dec1(totals.carbs);
  totals.fat = dec1(totals.fat);
  res.json({ date, entries, totals });
});

// POST /api/clients/:clientId/food-log — add a food item to a date.
dietRouter.post('/:clientId/food-log', (req, res) => {
  if (!requireClient(req, res)) return;
  const { date, meal_label, food_name, protein, carbs, fat, calories } = req.body ?? {};
  if (!validateDate(date)) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
  const foodName = typeof food_name === 'string' ? food_name.trim() : '';
  if (!foodName) return res.status(400).json({ error: 'food_name is required' });
  const mealLabel =
    typeof meal_label === 'string' && meal_label.trim() ? meal_label.trim().toLowerCase() : null;

  const macros = {};
  for (const [field, label] of [['protein', 'protein'], ['carbs', 'carbs'], ['fat', 'fat']]) {
    const r = req.body?.[field];
    if (r === '' || r === null || r === undefined) macros[field] = 0;
    else {
      const p = toNum(r);
      if (p === null) return res.status(400).json({ error: `${field} must be a number ≥ 0` });
      macros[field] = p;
    }
  }
  const calResult = intOrNull(req.body?.calories, 'calories');
  if (typeof calResult === 'object') return res.status(400).json({ error: calResult.error });
  macros.calories = calResult ?? 0;

  const result = db
    .prepare(
      `INSERT INTO food_log_entries (client_id, date, meal_label, food_name, protein, carbs, fat, calories)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.params.clientId, date, mealLabel, foodName, macros.protein, macros.carbs, macros.fat, macros.calories);
  const entry = db
    .prepare(
      `SELECT id, date, meal_label, food_name, protein, carbs, fat, calories
       FROM food_log_entries WHERE id = ?`
    )
    .get(result.lastInsertRowid);
  res.status(201).json({ entry });
});

// DELETE /api/clients/:clientId/food-log/:entryId
dietRouter.delete('/:clientId/food-log/:entryId', (req, res) => {
  if (!requireClient(req, res)) return;
  const result = db
    .prepare('DELETE FROM food_log_entries WHERE id = ? AND client_id = ?')
    .run(req.params.entryId, req.params.clientId);
  if (result.changes === 0) return res.status(404).json({ error: 'Food entry not found' });
  res.json({ ok: true });
});

// ---- Water ----------------------------------------------------------------

// GET /api/clients/:clientId/water?date=YYYY-MM-DD
dietRouter.get('/:clientId/water', (req, res) => {
  if (!requireClient(req, res)) return;
  const { date } = req.query;
  if (!validateDate(date)) return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD)' });
  const water = db
    .prepare('SELECT id, glasses FROM water_logs WHERE client_id = ? AND date = ?')
    .get(req.params.clientId, date);
  res.json({ water: water ?? null });
});

// PUT /api/clients/:clientId/water — set the day's glasses (upsert).
dietRouter.put('/:clientId/water', (req, res) => {
  if (!requireClient(req, res)) return;
  const { date, glasses } = req.body ?? {};
  if (!validateDate(date)) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
  const p = toNum(glasses);
  if (glasses === '' || glasses === null || glasses === undefined || p === null) {
    return res.status(400).json({ error: 'glasses must be a number ≥ 0' });
  }
  const amount = p > 99 ? 99 : p; // cap to a sane upper bound
  db.prepare(
    `INSERT INTO water_logs (client_id, date, glasses) VALUES (?, ?, ?)
     ON CONFLICT(client_id, date) DO UPDATE SET glasses = excluded.glasses, updated_at = datetime('now')`
  ).run(req.params.clientId, date, amount);
  const water = db
    .prepare('SELECT id, glasses FROM water_logs WHERE client_id = ? AND date = ?')
    .get(req.params.clientId, date);
  res.json({ water });
});

// ---- Supplements -----------------------------------------------------------

// GET /api/clients/:clientId/supplements
dietRouter.get('/:clientId/supplements', (req, res) => {
  if (!requireClient(req, res)) return;
  const supplements = db
    .prepare('SELECT id, name, created_at FROM supplements WHERE client_id = ? ORDER BY name COLLATE NOCASE')
    .all(req.params.clientId);
  res.json({ supplements });
});

// POST /api/clients/:clientId/supplements — add to the client's list.
dietRouter.post('/:clientId/supplements', (req, res) => {
  if (!requireClient(req, res)) return;
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ error: 'name is required' });
  const existing = db
    .prepare('SELECT id FROM supplements WHERE client_id = ? AND name = ? COLLATE NOCASE')
    .get(req.params.clientId, name);
  if (existing) return res.status(409).json({ error: `"${name}" is already on the list` });
  const result = db
    .prepare('INSERT INTO supplements (client_id, name) VALUES (?, ?)')
    .run(req.params.clientId, name);
  const supplement = db.prepare('SELECT id, name, created_at FROM supplements WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ supplement });
});

// DELETE /api/clients/:clientId/supplements/:id
dietRouter.delete('/:clientId/supplements/:id', (req, res) => {
  if (!requireClient(req, res)) return;
  const result = db
    .prepare('DELETE FROM supplements WHERE id = ? AND client_id = ?')
    .run(req.params.id, req.params.clientId);
  if (result.changes === 0) return res.status(404).json({ error: 'Supplement not found' });
  res.json({ ok: true });
});

// GET /api/clients/:clientId/supplement-log?date=YYYY-MM-DD — supplements taken that day.
dietRouter.get('/:clientId/supplement-log', (req, res) => {
  if (!requireClient(req, res)) return;
  const { date } = req.query;
  if (!validateDate(date)) return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD)' });
  const taken = db
    .prepare(
      `SELECT sl.supplement_id
       FROM supplement_logs sl
       JOIN supplements s ON s.id = sl.supplement_id AND s.client_id = ?
       WHERE sl.date = ?`
    )
    .all(req.params.clientId, date)
    .map((row) => row.supplement_id);
  res.json({ taken });
});

// PUT /api/clients/:clientId/supplement-log — set the full "taken" set for a
// day. Any supplement ids that aren't the client's are ignored.
dietRouter.put('/:clientId/supplement-log', (req, res) => {
  if (!requireClient(req, res)) return;
  const { date, supplement_ids } = req.body ?? {};
  if (!validateDate(date)) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
  if (!Array.isArray(supplement_ids)) {
    return res.status(400).json({ error: 'supplement_ids must be an array' });
  }

  const owned = new Set(
    db.prepare('SELECT id FROM supplements WHERE client_id = ?').all(req.params.clientId).map((s) => s.id)
  );
  const ids = [...new Set(supplement_ids.map(Number))].filter((id) => Number.isInteger(id) && owned.has(id));

  db.transaction((clientId, dateStr, list) => {
    db.prepare(
      `DELETE FROM supplement_logs WHERE date = ? AND supplement_id IN
       (SELECT id FROM supplements WHERE client_id = ?)`
    ).run(dateStr, clientId);
    const insert = db.prepare('INSERT INTO supplement_logs (supplement_id, date) VALUES (?, ?)');
    list.forEach((id) => insert.run(id, dateStr));
  })(req.params.clientId, date, ids);

  res.json({ taken: ids });
});