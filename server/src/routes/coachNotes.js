// Per-client coach's log (slice 6): private dated journal notes the coach
// keeps about a client. Newest first. Mounted at /api/clients, behind requireAuth.
import { Router } from 'express';
import { db } from '../db.js';

export const coachNotesRouter = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const COLS = 'id, date, note, created_at';

function requireClient(req, res) {
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.clientId);
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return null;
  }
  return client;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---- Coach's log -----------------------------------------------------------

// GET /api/clients/:clientId/coach-notes — all notes, newest first.
coachNotesRouter.get('/:clientId/coach-notes', (req, res) => {
  if (!requireClient(req, res)) return;
  const notes = db
    .prepare(`SELECT ${COLS} FROM coach_notes WHERE client_id = ? ORDER BY date DESC, id DESC`)
    .all(req.params.clientId);
  res.json({ notes });
});

// POST /api/clients/:clientId/coach-notes — add a note. date defaults to today.
coachNotesRouter.post('/:clientId/coach-notes', (req, res) => {
  if (!requireClient(req, res)) return;
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
  if (!note) return res.status(400).json({ error: 'note is required' });

  const rawDate = req.body?.date;
  let date = todayStr();
  if (rawDate !== '' && rawDate !== null && rawDate !== undefined) {
    if (typeof rawDate !== 'string' || !DATE_RE.test(rawDate)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }
    date = rawDate;
  }

  const result = db
    .prepare('INSERT INTO coach_notes (client_id, date, note) VALUES (?, ?, ?)')
    .run(req.params.clientId, date, note);
  const created = db.prepare(`SELECT ${COLS} FROM coach_notes WHERE id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ note: created });
});

// DELETE /api/clients/:clientId/coach-notes/:id
coachNotesRouter.delete('/:clientId/coach-notes/:id', (req, res) => {
  if (!requireClient(req, res)) return;
  const result = db
    .prepare('DELETE FROM coach_notes WHERE id = ? AND client_id = ?')
    .run(req.params.id, req.params.clientId);
  if (result.changes === 0) return res.status(404).json({ error: 'Note not found' });
  res.json({ ok: true });
});
