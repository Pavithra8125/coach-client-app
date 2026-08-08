// Auth endpoints: login, logout, and current-session check.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';

export const authRouter = Router();

// POST /api/auth/login  { username, password }  -> 200 { user }
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const user = db
    .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
    .get(username.trim());

  // Same message for unknown user and wrong password — don't leak which.
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // regenerate() prevents session fixation on login.
  req.session.regenerate((err) => {
    if (err) {
      console.error('session.regenerate failed', err);
      return res.status(500).json({ error: 'Could not start session' });
    }
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        console.error('session.save failed', err);
        return res.status(500).json({ error: 'Could not save session' });
      }
      res.json({ user: { id: user.id, username: user.username } });
    });
  });
});

// POST /api/auth/logout -> 200 { ok: true }
authRouter.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('coach.sid');
    res.json({ ok: true });
  });
});

// GET /api/auth/me -> 200 { user } | 401
authRouter.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user });
});
