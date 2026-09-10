import { db } from './src/db.js';

async function run() {
  try {
    await db.execute({ sql: 'INSERT INTO exercises (name, category) VALUES (?, ?)', args: ['Squat', null] });
    await db.execute({ sql: 'INSERT INTO exercises (name, category) VALUES (?, ?)', args: ['Squat', null] });
  } catch (err) {
    console.log("Error code:", err.code);
    console.log("Error message:", err.message);
  }
}
run();
