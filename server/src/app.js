// Express app wiring. Feature routes get mounted here as they're built —
// each lives in its own file under src/routes/ (e.g. auth.js, clients.js).
import express from 'express';
import { config } from './config.js';

export function createApp() {
  const app = express();

  app.use(express.json());

  // Health check — proves the server (and DB, once wired) is up.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

export function startServer() {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Server listening on http://localhost:${config.port}`);
  });
}
