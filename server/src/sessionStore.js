// A minimal express-session Store backed by SQLite, so login sessions survive
// server restarts (matching the "stay logged in" requirement). We write our
// own instead of pulling in the stale `better-sqlite3-session-store` package.
import session from 'express-session';
import { config } from './config.js';

const Store = session.Store;

export class SqliteSessionStore extends Store {
  constructor(db, { pruneIntervalMs = 15 * 60 * 1000 } = {}) {
    super();
    this.db = db;
    // Periodically clear expired sessions in the background.
    this._pruneTimer = setInterval(() => this.prune(), pruneIntervalMs);
    this._pruneTimer.unref?.();
  }

  get(sid, cb) {
    try {
      const row = this.db
        .prepare('SELECT data FROM sessions WHERE id = ? AND expires_at > ?')
        .get(sid, Date.now());
      cb(null, row ? JSON.parse(row.data) : null);
    } catch (err) {
      cb(err);
    }
  }

  set(sid, sess, cb) {
    try {
      this.db
        .prepare(
          `INSERT INTO sessions (id, data, expires_at) VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at`
        )
        .run(sid, JSON.stringify(sess), this._expiresAt(sess));
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }

  destroy(sid, cb) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE id = ?').run(sid);
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }

  touch(sid, sess, cb) {
    try {
      this.db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(this._expiresAt(sess), sid);
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }

  prune() {
    try {
      this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
    } catch {
      // Background cleanup — never let it crash the server.
    }
  }

  _expiresAt(sess) {
    const cookie = sess?.cookie;
    if (cookie?.expires) return new Date(cookie.expires).getTime();
    const maxAge = typeof cookie?.maxAge === 'number' ? cookie.maxAge : config.sessionMaxAgeMs;
    return Date.now() + maxAge;
  }
}
