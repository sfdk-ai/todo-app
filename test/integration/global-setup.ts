import { loadConfig } from '../../src/config.js';
import { applySchema, createPool, waitForDatabase } from '../../src/db.js';

export default async function setup(): Promise<void> {
  const pool = createPool(loadConfig().databaseUrl);
  try {
    await waitForDatabase(pool);
    await applySchema(pool);
  } finally {
    await pool.end();
  }
}
