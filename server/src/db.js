// SQLite connection (single shared instance for the app). better-sqlite3 is
// synchronous — perfectly fine at single-user scale, and simpler than async.
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function openDb() {
  const db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  return db;
}

export const db = openDb();
