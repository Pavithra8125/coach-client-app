// Client CRUD — all routes protected by requireAuth (mounted in app.js).
import { Router } from 'express';
import { db } from '../db.js';

export const clientsRouter = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SELECT = 'id, name, photo_url, goals, start_date, created_at';

// Pull + trim editable fields from the request body (empty strings -> null).
function normalize(body) {
  const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    name: typeof body?.name === 'string' ? body.name.trim() : '',
    photoUrl: str(body?.photo_url),
    goals: str(body?.goals),
    startDate: str(body?.start_date),
  };
}

function validate({ name, startDate }) {
  if (!name) return 'name is required';
  if (startDate && !DATE_RE.test(startDate)) return 'start_date must be YYYY-MM-DD';
  return null;
}

// GET /api/clients — all clients, alphabetical.
clientsRouter.get('/', (req, res) => {
  const clients = db.prepare(`SELECT ${SELECT} FROM clients ORDER BY name COLLATE NOCASE`).all();
  res.json({ clients });
});

// GET /api/clients/:id
clientsRouter.get('/:id', (req, res) => {
  const client = db.prepare(`SELECT ${SELECT} FROM clients WHERE id = ?`).get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json({ client });
});

// POST /api/clients — create.
clientsRouter.post('/', (req, res) => {
  const { name, photoUrl, goals, startDate } = normalize(req.body);
  const problem = validate({ name, startDate });
  if (problem) return res.status(400).json({ error: problem });

  const result = db
    .prepare('INSERT INTO clients (name, photo_url, goals, start_date) VALUES (?, ?, ?, ?)')
    .run(name, photoUrl, goals, startDate);
  const client = db.prepare(`SELECT ${SELECT} FROM clients WHERE id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ client });
});

// PUT /api/clients/:id — update.
clientsRouter.put('/:id', (req, res) => {
  const { name, photoUrl, goals, startDate } = normalize(req.body);
  const problem = validate({ name, startDate });
  if (problem) return res.status(400).json({ error: problem });

  const result = db
    .prepare(
      `UPDATE clients
       SET name = ?, photo_url = ?, goals = ?, start_date = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(name, photoUrl, goals, startDate, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Client not found' });

  const client = db.prepare(`SELECT ${SELECT} FROM clients WHERE id = ?`).get(req.params.id);
  res.json({ client });
});

// DELETE /api/clients/:id
clientsRouter.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Client not found' });
  res.json({ ok: true });
});
