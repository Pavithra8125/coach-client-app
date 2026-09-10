import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const schema = readFileSync(path.join(__dirname, 'src', 'schema.sql'), 'utf8');
  console.log("Executing schema...");
  await db.executeMultiple(schema);
  console.log("Schema executed successfully.");
}

run().catch(console.error);
