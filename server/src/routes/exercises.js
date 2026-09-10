// Exercise library (slice 4) — shared across all clients so exercises aren't
// retyped per client. Mounted at /api/exercises, behind requireAuth.
import { Router } from 'express';
import { db } from '../db.js';

export const exercisesRouter = Router();

const SELECT = 'id, name, category, created_at';

function normalize(body) {
  return {
    name: typeof body?.name === 'string' ? body.name.trim() : '',
    category:
      typeof body?.category === 'string' && body.category.trim() ? body.category.trim() : null,
  };
}

// Returns true if err was a duplicate-name conflict (already responded).
function handleUnique(err, res, name) {
  if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err?.code === 'SQLITE_CONSTRAINT' && err?.message?.includes('UNIQUE constraint failed'))) {
    res.status(409).json({ error: 'An exercise with this name already exists' });
    return true;
  }
  return false;
}

// GET /api/exercises — categories first, then alphabetical.
exercisesRouter.get('/', async (_req, res) => {
  const exercises = (await db.execute({
    sql: `SELECT ${SELECT} FROM exercises
     ORDER BY category IS NULL, category COLLATE NOCASE, name COLLATE NOCASE`,

    args: []
  })).rows;
  res.json({ exercises });
});

// POST /api/exercises — add to the library. Name is unique case-insensitively.
exercisesRouter.post('/', async (req, res) => {
  const { name, category } = normalize(req.body);
  if (!name) return res.status(400).json({ error: 'Exercise name is required' });
  try {
    const result = await db.execute({
      sql: 'INSERT INTO exercises (name, category) VALUES (?, ?)',
      args: [name, category]
    });
    const exercise = (await db.execute({
      sql: `SELECT ${SELECT} FROM exercises WHERE id = ?`,
      args: [result.lastInsertRowid.toString()]
    })).rows[0];
    res.status(201).json({ exercise });
  } catch (err) {
    if (handleUnique(err, res, name)) return;
    throw err;
  }
});

// PUT /api/exercises/:id — rename / recategorize.
exercisesRouter.put('/:id', async (req, res) => {
  const { name, category } = normalize(req.body);
  if (!name) return res.status(400).json({ error: 'Exercise name is required' });
  try {
    const result = await db.execute({
      sql: 'UPDATE exercises SET name = ?, category = ? WHERE id = ?',
      args: [name, category, req.params.id]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Exercise not found' });
    const exercise = (await db.execute({
      sql: `SELECT ${SELECT} FROM exercises WHERE id = ?`,
      args: [req.params.id]
    })).rows[0];
    res.json({ exercise });
  } catch (err) {
    if (handleUnique(err, res, name)) return;
    throw err;
  }
});

// DELETE /api/exercises/:id — refused if any plan or log still references it.
exercisesRouter.delete('/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'DELETE FROM exercises WHERE id = ?',
      args: [req.params.id]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Exercise not found' });
    res.json({ ok: true });
  } catch (err) {
    if (err?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || (err?.code === 'SQLITE_CONSTRAINT' && err?.message?.includes('FOREIGN KEY constraint failed'))) {
      return res
        .status(409)
        .json({ error: 'This exercise is used in a plan or log, so it can’t be deleted.' });
    }
    throw err;
  }
});
