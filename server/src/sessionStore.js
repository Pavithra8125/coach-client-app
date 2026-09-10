// A minimal express-session Store backed by SQLite, so login sessions survive
// server restarts (matching the "stay logged in" requirement).
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

  async get(sid, cb) {
    try {
      const row = (await this.db.execute({
        sql: 'SELECT data FROM sessions WHERE id = ? AND expires_at > ?',
        args: [sid, Date.now()]
      })).rows[0];
      cb(null, row ? JSON.parse(row.data) : null);
    } catch (err) {
      cb(err);
    }
  }

  async set(sid, sess, cb) {
    try {
      await this.db.execute({
        sql: `INSERT INTO sessions (id, data, expires_at) VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at`,
        args: [sid, JSON.stringify(sess), this._expiresAt(sess)]
      });
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }

  async destroy(sid, cb) {
    try {
      await this.db.execute({
        sql: 'DELETE FROM sessions WHERE id = ?',
        args: [sid]
      });
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }

  async touch(sid, sess, cb) {
    try {
      await this.db.execute({
        sql: 'UPDATE sessions SET expires_at = ? WHERE id = ?',
        args: [this._expiresAt(sess), sid]
      });
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }

  async prune() {
    try {
      await this.db.execute({
        sql: 'DELETE FROM sessions WHERE expires_at <= ?',
        args: [Date.now()]
      });
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
