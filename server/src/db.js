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
  // Enable foreign keys so deleting a client cascades to their entries.
  db.pragma('foreign_keys = ON');

  // --- Migration: Slice 3 Data Merge ---
  try {
    // Check if the old schema is still in use (has the 'date' column instead of 'logged_date')
    const hasOldMeasurements = db.prepare("SELECT COUNT(*) as count FROM pragma_table_info('measurements') WHERE name='date'").get().count > 0;
    
    if (hasOldMeasurements) {
      console.log("Migrating Slice 3 data to new unified measurements table...");
      db.exec("ALTER TABLE measurements RENAME TO legacy_measurements");
      db.exec("ALTER TABLE weight_entries RENAME TO legacy_weight_entries");
      
      // Execute the new schema to create the unified measurements table
      db.exec(readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

      // Fetch all old data
      const oldWeights = db.prepare("SELECT * FROM legacy_weight_entries").all();
      const oldMeasurements = db.prepare("SELECT * FROM legacy_measurements").all();

      // Merge by client_id and date
      const mergedMap = new Map();
      
      for (const w of oldWeights) {
        const key = `${w.client_id}-${w.date}`;
        mergedMap.set(key, {
          client_id: w.client_id,
          logged_date: w.date,
          weight_kg: w.weight,
          body_fat_pct: null,
          waist_cm: null,
          chest_cm: null,
          notes: null,
          created_at: w.created_at
        });
      }

      for (const m of oldMeasurements) {
        const key = `${m.client_id}-${m.date}`;
        const existing = mergedMap.get(key) || {
          client_id: m.client_id,
          logged_date: m.date,
          weight_kg: null,
          body_fat_pct: null,
          waist_cm: null,
          chest_cm: null,
          notes: null,
          created_at: m.created_at
        };
        existing.waist_cm = m.waist;
        existing.chest_cm = m.chest;
        existing.body_fat_pct = m.body_fat;
        if (m.arms != null) {
          existing.notes = `Arms: ${m.arms} cm`;
        }
        // Use earliest created_at if merging
        if (existing.created_at > m.created_at) {
          existing.created_at = m.created_at;
        }
        mergedMap.set(key, existing);
      }

      const insertStmt = db.prepare(`
        INSERT INTO measurements (client_id, logged_date, weight_kg, body_fat_pct, waist_cm, chest_cm, notes, created_at)
        VALUES (@client_id, @logged_date, @weight_kg, @body_fat_pct, @waist_cm, @chest_cm, @notes, @created_at)
      `);

      const insertMany = db.transaction((records) => {
        for (const record of records) insertStmt.run(record);
      });

      insertMany(Array.from(mergedMap.values()));

      console.log("Migration complete. Dropping legacy tables.");
      db.exec("DROP TABLE legacy_measurements");
      db.exec("DROP TABLE legacy_weight_entries");
    } else {
      // Normal path: just execute schema
      db.exec(readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    }
  } catch (err) {
    console.error("Migration error:", err);
    // Fallback: just execute schema
    db.exec(readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  }

  return db;
}

export const db = openDb();
