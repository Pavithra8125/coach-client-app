// Central place for env/config values. Everything overridable via .env.
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT ?? 4000),
  isProd: process.env.NODE_ENV === 'production',
  // 30-day session so the coach stays logged in between visits.
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-only-secret-change-me',
  sessionMaxAgeMs: 1000 * 60 * 60 * 24 * 30,
  dbPath: process.env.DB_PATH ?? path.resolve(__dirname, '../db/app.sqlite'),
  // Credentials used by `npm run seed -w server` to create the coach account.
  coach: {
    username: process.env.COACH_USERNAME ?? 'coach',
    password: process.env.COACH_PASSWORD ?? 'coach-dev-password',
  },
};
