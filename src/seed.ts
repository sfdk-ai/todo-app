import { existsSync } from 'node:fs';
import { loadConfig } from './config.js';
import { applySchema, createPool, waitForDatabase } from './db.js';
import { createTodo } from './todos.js';

const samples = [
  { title: 'Return library books', tags: ['errands'] },
  { title: 'Plan the weekend hike', tags: ['outdoors'] },
  { title: 'Call grandma', tags: ['family'] },
  { title: 'Renew passport', tags: ['admin'] },
  { title: 'Pay the electricity bill', tags: ['admin', 'home'] },
  { title: 'Fix the leaking kitchen tap', tags: ['home'] },
  { title: 'Water the plants', tags: ['home'] },
  { title: 'Book a dentist appointment', tags: ['health'] },
  { title: 'Reply to Sam about Friday', tags: ['work'] },
  { title: 'Prepare slides for Monday', tags: ['work'] },
  { title: 'Pick up bread and eggs', tags: ['groceries'] },
  { title: 'Buy milk', tags: ['groceries'] },
];

if (existsSync('.env')) process.loadEnvFile('.env');

const pool = createPool(loadConfig().databaseUrl);
try {
  await waitForDatabase(pool);
  await applySchema(pool);
  const { rows } = await pool.query<{ count: number }>('SELECT count(*)::int AS count FROM todos');
  if (rows[0].count > 0) {
    console.log(`The database already has ${rows[0].count} todos, so nothing was added.`);
  } else {
    for (const sample of samples) {
      await createTodo(pool, sample);
    }
    console.log(`Added ${samples.length} sample todos.`);
  }
} finally {
  await pool.end();
}
