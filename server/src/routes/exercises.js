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
  if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    res.status(409).json({ error: `"${name}" is already in the library` });
    return true;
  }
  return false;
}

// GET /api/exercises — categories first, then alphabetical.
exercisesRouter.get('/', (_req, res) => {
  const exercises = db
    .prepare(
      `SELECT ${SELECT} FROM exercises
       ORDER BY category IS NULL, category COLLATE NOCASE, name COLLATE NOCASE`
    )
    .all();
  res.json({ exercises });
});

// POST /api/exercises — add to the library. Name is unique case-insensitively.
exercisesRouter.post('/', (req, res) => {
  const { name, category } = normalize(req.body);
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = db
      .prepare('INSERT INTO exercises (name, category) VALUES (?, ?)')
      .run(name, category);
    const exercise = db
      .prepare(`SELECT ${SELECT} FROM exercises WHERE id = ?`)
      .get(result.lastInsertRowid);
    res.status(201).json({ exercise });
  } catch (err) {
    if (handleUnique(err, res, name)) return;
    throw err;
  }
});

// PUT /api/exercises/:id — rename / recategorize.
exercisesRouter.put('/:id', (req, res) => {
  const { name, category } = normalize(req.body);
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = db
      .prepare('UPDATE exercises SET name = ?, category = ? WHERE id = ?')
      .run(name, category, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Exercise not found' });
    const exercise = db
      .prepare(`SELECT ${SELECT} FROM exercises WHERE id = ?`)
      .get(req.params.id);
    res.json({ exercise });
  } catch (err) {
    if (handleUnique(err, res, name)) return;
    throw err;
  }
});

// DELETE /api/exercises/:id — refused if any plan or log still references it.
exercisesRouter.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM exercises WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Exercise not found' });
    res.json({ ok: true });
  } catch (err) {
    if (err?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res
        .status(409)
        .json({ error: 'This exercise is used in a plan or log, so it can’t be deleted.' });
    }
    throw err;
  }
});
