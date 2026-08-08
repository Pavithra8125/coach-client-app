// SQLite connection. better-sqlite3 is synchronous — perfectly fine at
// single-user scale, and simpler than async drivers.
import Database from 'better-sqlite3';
import { config } from './config.js';

export function openDb() {
  const db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  return db;
}
