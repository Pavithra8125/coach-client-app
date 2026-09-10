import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { config } from './config.js';

const { username, password } = config.coach;
const usingDefaults = !process.env.COACH_PASSWORD;

async function seed() {
  const existing = (await db.execute({
    sql: 'SELECT id FROM users WHERE username = ?',
    args: [username]
  })).rows[0];

  if (existing) {
    console.log(`Coach user "${username}" already exists — skipping.`);
    console.log('To change the password: delete the row, then run seed again.');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.execute({
    sql: 'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    args: [username, passwordHash]
  });

  console.log(`Created coach user "${username}".`);

  if (usingDefaults) {
    console.log('NOTE: using the DEFAULT dev password "coach-dev-password".');
    console.log('Set COACH_PASSWORD in server/.env, delete the user row, and re-seed to change it.');
  }
}

seed().catch(console.error);
