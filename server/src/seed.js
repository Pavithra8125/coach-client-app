// Seeds the coach's login account: `npm run seed -w server`.
// Reads COACH_USERNAME / COACH_PASSWORD from server/.env (or defaults, with a
// loud warning). Idempotent — skips if the username already exists.
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { config } from './config.js';

const { username, password } = config.coach;
const usingDefaults = !process.env.COACH_PASSWORD;

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (existing) {
  console.log(`Coach user "${username}" already exists — skipping.`);
  console.log('To change the password: delete the row, then run seed again.');
  process.exit(0);
}

const passwordHash = await bcrypt.hash(password, 12);
db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);

console.log(`Created coach user "${username}".`);

if (usingDefaults) {
  console.log('NOTE: using the DEFAULT dev password "coach-dev-password".');
  console.log('Set COACH_PASSWORD in server/.env, delete the user row, and re-seed to change it.');
}
