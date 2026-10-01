import { existsSync } from 'node:fs';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { applySchema, createPool, waitForDatabase } from './db.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const config = loadConfig();
const pool = createPool(config.databaseUrl);
await waitForDatabase(pool);
await applySchema(pool);

const server = createApp(pool).listen(config.port, config.host, (error) => {
  if (error) throw error;
  console.log(`todo-app listening on http://localhost:${config.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => void pool.end());
  });
}
