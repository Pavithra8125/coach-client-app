// Per-client diet (slice 5): daily macro targets, food log, water, and the
// supplement tracker. Mounted at /api/clients, behind requireAuth.
import { Router } from 'express';
import { db } from '../db.js';

export const dietRouter = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function requireClient(req, res) {
  const client = (await db.execute({
    sql: 'SELECT id FROM clients WHERE id = ?',
    args: [req.params.clientId]
  })).rows[0];
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
dietRouter.get('/:clientId/meal-plan', async (req, res) => {
  if (!(await requireClient(req, res))) return;
  const mealPlan = (await db.execute({
    sql: 'SELECT id, name, protein, carbs, fat, calories, notes, updated_at FROM meal_plans WHERE client_id = ?',
    args: [req.params.clientId]
  })).rows[0];
  res.json({ mealPlan: mealPlan ?? null });
});

// PUT /api/clients/:clientId/meal-plan — upsert the daily macro targets.
dietRouter.put('/:clientId/meal-plan', async (req, res) => {
  if (!(await requireClient(req, res))) return;
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
    return res.status(400).json({ error: calParsed.invalid });
  }
  vals.calories = calParsed ?? 0;

  const planName = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : null;
  const notesClean = typeof notesRaw === 'string' && notesRaw.trim() ? notesRaw.trim() : null;

  await db.execute({
    sql: `INSERT INTO meal_plans (client_id, name, protein, carbs, fat, calories, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(client_id) DO UPDATE SET
       name = excluded.name, protein = excluded.protein, carbs = excluded.carbs,
       fat = excluded.fat, calories = excluded.calories, notes = excluded.notes,
       updated_at = datetime('now')`,

    args: [
      req.params.clientId,
      planName,
      vals.protein,
      vals.carbs,
      vals.fat,
      vals.calories,
      notesClean
    ]
  });

  const mealPlan = (await db.execute({
    sql: 'SELECT id, name, protein, carbs, fat, calories, notes, updated_at FROM meal_plans WHERE client_id = ?',
    args: [req.params.clientId]
  })).rows[0];
  res.json({ mealPlan });
});

// DELETE /api/clients/:clientId/meal-plan
dietRouter.delete('/:clientId/meal-plan', async (req, res) => {
  if (!(await requireClient(req, res))) return;
  await db.execute({
    sql: 'DELETE FROM meal_plans WHERE client_id = ?',
    args: [req.params.clientId]
  });
  res.json({ ok: true });
});

// ---- Food log ---------------------------------------------------------------

// GET /api/clients/:clientId/food-log?date=YYYY-MM-DD — that day's entries
// (in added order) plus the running macro totals.
dietRouter.get('/:clientId/food-log', async (req, res) => {
  if (!(await requireClient(req, res))) return;
  const { date } = req.query;
  if (!validateDate(date)) return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD)' });

  const entries = (await db.execute({
    sql: `SELECT id, date, meal_label, food_name, protein, carbs, fat, calories
     FROM food_log_entries WHERE client_id = ? AND date = ? ORDER BY id`,

    args: [req.params.clientId, date]
  })).rows;
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
dietRouter.post('/:clientId/food-log', async (req, res) => {
  if (!(await requireClient(req, res))) return;
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
  if (typeof calResult === 'object') return res.status(400).json({ error: calResult.invalid });
  macros.calories = calResult ?? 0;

  const result = await db.execute({
    sql: `INSERT INTO food_log_entries (client_id, date, meal_label, food_name, protein, carbs, fat, calories)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,

    args: [
      req.params.clientId,
      date,
      mealLabel,
      foodName,
      macros.protein,
      macros.carbs,
      macros.fat,
      macros.calories
    ]
  });
  const entry = (await db.execute({
    sql: `SELECT id, date, meal_label, food_name, protein, carbs, fat, calories
     FROM food_log_entries WHERE id = ?`,

    args: [result.lastInsertRowid.toString()]
  })).rows[0];
  res.status(201).json({ entry });
});

// DELETE /api/clients/:clientId/food-log/:entryId
dietRouter.delete('/:clientId/food-log/:entryId', async (req, res) => {
  if (!(await requireClient(req, res))) return;
  const result = await db.execute({
    sql: 'DELETE FROM food_log_entries WHERE id = ? AND client_id = ?',
    args: [req.params.entryId, req.params.clientId]
  });
  if (result.rowsAffected === 0) return res.status(404).json({ error: 'Food entry not found' });
  res.json({ ok: true });
});

// ---- Water ----------------------------------------------------------------

// GET /api/clients/:clientId/water?date=YYYY-MM-DD
dietRouter.get('/:clientId/water', async (req, res) => {
  if (!(await requireClient(req, res))) return;
  const { date } = req.query;
  if (!validateDate(date)) return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD)' });
  const water = (await db.execute({
    sql: 'SELECT id, glasses FROM water_logs WHERE client_id = ? AND date = ?',
    args: [req.params.clientId, date]
  })).rows[0];
  res.json({ water: water ?? null });
});

// PUT /api/clients/:clientId/water — set the day's glasses (upsert).
dietRouter.put('/:clientId/water', async (req, res) => {
  if (!(await requireClient(req, res))) return;
  const { date, glasses } = req.body ?? {};
  if (!validateDate(date)) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
  const p = toNum(glasses);
  if (glasses === '' || glasses === null || glasses === undefined || p === null) {
    return res.status(400).json({ error: 'glasses must be a number ≥ 0' });
  }
  const amount = p > 99 ? 99 : p; // cap to a sane upper bound
  await db.execute({
    sql: `INSERT INTO water_logs (client_id, date, glasses) VALUES (?, ?, ?)
     ON CONFLICT(client_id, date) DO UPDATE SET glasses = excluded.glasses, updated_at = datetime('now')`,

    args: [req.params.clientId, date, amount]
  });
  const water = (await db.execute({
    sql: 'SELECT id, glasses FROM water_logs WHERE client_id = ? AND date = ?',
    args: [req.params.clientId, date]
  })).rows[0];
  res.json({ water });
});

// ---- Supplements -----------------------------------------------------------

// GET /api/clients/:clientId/supplements
dietRouter.get('/:clientId/supplements', async (req, res) => {
  if (!(await requireClient(req, res))) return;
  const supplements = (await db.execute({
    sql: 'SELECT id, name, created_at FROM supplements WHERE client_id = ? ORDER BY name COLLATE NOCASE',
    args: [req.params.clientId]
  })).rows;
  res.json({ supplements });
});

// POST /api/clients/:clientId/supplements — add to the client's list.
dietRouter.post('/:clientId/supplements', async (req, res) => {
  if (!(await requireClient(req, res))) return;
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ error: 'name is required' });
  const existing = (await db.execute({
    sql: 'SELECT id FROM supplements WHERE client_id = ? AND name = ? COLLATE NOCASE',
    args: [req.params.clientId, name]
  })).rows[0];
  if (existing) return res.status(409).json({ error: `"${name}" is already on the list` });
  const result = await db.execute({
    sql: 'INSERT INTO supplements (client_id, name) VALUES (?, ?)',
    args: [req.params.clientId, name]
  });
  const supplement = (await db.execute({
    sql: 'SELECT id, name, created_at FROM supplements WHERE id = ?',
    args: [result.lastInsertRowid.toString()]
  })).rows[0];
  res.status(201).json({ supplement });
});

// DELETE /api/clients/:clientId/supplements/:id
dietRouter.delete('/:clientId/supplements/:id', async (req, res) => {
  if (!(await requireClient(req, res))) return;
  const result = await db.execute({
    sql: 'DELETE FROM supplements WHERE id = ? AND client_id = ?',
    args: [req.params.id, req.params.clientId]
  });
  if (result.rowsAffected === 0) return res.status(404).json({ error: 'Supplement not found' });
  res.json({ ok: true });
});

// GET /api/clients/:clientId/supplement-log?date=YYYY-MM-DD — supplements taken that day.
dietRouter.get('/:clientId/supplement-log', async (req, res) => {
  if (!(await requireClient(req, res))) return;
  const { date } = req.query;
  if (!validateDate(date)) return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD)' });
  const taken = (await db.execute({
    sql: `SELECT sl.supplement_id
     FROM supplement_logs sl
     JOIN supplements s ON s.id = sl.supplement_id AND s.client_id = ?
     WHERE sl.date = ?`,

    args: [req.params.clientId, date]
  })).rows
    .map((row) => row.supplement_id);
  res.json({ taken });
});

// PUT /api/clients/:clientId/supplement-log — set the full "taken" set for a
// day. Any supplement ids that aren't the client's are ignored.
dietRouter.put('/:clientId/supplement-log', async (req, res) => {
  if (!(await requireClient(req, res))) return;
  const { date, supplement_ids } = req.body ?? {};
  if (!validateDate(date)) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
  if (!Array.isArray(supplement_ids)) {
    return res.status(400).json({ error: 'supplement_ids must be an array' });
  }

  const owned = new Set(
    (await db.execute({
      sql: 'SELECT id FROM supplements WHERE client_id = ?',
      args: [req.params.clientId]
    })).rows.map((s) => s.id)
  );
  const ids = [...new Set(supplement_ids.map(Number))].filter((id) => Number.isInteger(id) && owned.has(id));

  const tx = await db.transaction("write");
  try {
    await tx.execute({
      sql: `DELETE FROM supplement_logs WHERE date = ? AND supplement_id IN
       (SELECT id FROM supplements WHERE client_id = ?)`,
      args: [date, req.params.clientId]
    });
    for (const id of ids) {
      await tx.execute({
        sql: 'INSERT INTO supplement_logs (supplement_id, date) VALUES (?, ?)',
        args: [id, date]
      });
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }

  res.json({ taken: ids });
});