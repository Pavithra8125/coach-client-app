// Express app wiring. Feature routes get mounted here as they're built —
// each lives in its own file under src/routes/ (e.g. auth.js, clients.js).
import express from 'express';
import session from 'express-session';
import { config } from './config.js';
import { db } from './db.js';
import { SqliteSessionStore } from './sessionStore.js';
import { authRouter } from './routes/auth.js';
import { clientsRouter } from './routes/clients.js';
import { requireAuth } from './middleware/requireAuth.js';

export function createApp() {
  const app = express();

  app.use(express.json());

  // Session middleware: SQLite-backed store so logins survive restarts.
  // saveUninitialized:false — no session cookie until the coach actually logs in.
  app.use(
    session({
      name: 'coach.sid',
      store: new SqliteSessionStore(db),
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.isProd,
        maxAge: config.sessionMaxAgeMs,
      },
    })
  );

  // Health check — proves the server (and DB) is up. Public.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);

  // Private routes — everything below requires a logged-in session.
  app.use('/api/clients', requireAuth, clientsRouter);

  return app;
}

export function startServer() {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Server listening on http://localhost:${config.port}`);
  });
}
