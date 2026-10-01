import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { emptyDatabase, startApp, type TestApp } from './helpers.js';

let app: TestApp;

beforeAll(async () => {
  app = await startApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await emptyDatabase(app.pool);
});

async function createTodo(title: string, tags?: string[]) {
  const response = await app.request('POST', '/api/todos', { title, tags });
  expect(response.status).toBe(201);
  return response.body;
}

function rows(csv: string): string[] {
  // fetch's text() drops the byte order mark; test/unit/csv.test.ts checks it.
  expect(csv.startsWith('title,done,created_at,tags\r\n')).toBe(true);
  return csv.split('\r\n').slice(1, -1);
}

describe('GET /api/todos.csv', () => {
  it('answers a CSV download with one row per todo, newest first', async () => {
    const milk = await createTodo('Buy milk', ['Groceries', 'weekend']);
    const call = await createTodo('Call grandma');
    await app.request('POST', `/api/todos/${call.id}/done`);

    const response = await app.request('GET', '/api/todos.csv');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="todos.csv"');
    expect(rows(response.body)).toEqual([
      `Call grandma,true,${call.createdAt},`,
      `Buy milk,false,${milk.createdAt},groceries; weekend`,
    ]);
  });

  it('answers only the header when there are no todos', async () => {
    const response = await app.request('GET', '/api/todos.csv');

    expect(response.status).toBe(200);
    expect(rows(response.body)).toEqual([]);
  });

  it('exports every todo, not one page of them', async () => {
    for (let i = 1; i <= 25; i++) await createTodo(`Todo ${i}`);

    const response = await app.request('GET', '/api/todos.csv');

    expect(rows(response.body).map((row) => row.split(',')[0])).toEqual(
      Array.from({ length: 25 }, (_, i) => `Todo ${25 - i}`),
    );
  });

  it('exports only the todos whose title contains q, whatever its case', async () => {
    await createTodo('Buy milk');
    await createTodo('Call grandma');
    await createTodo('Milk the cow');

    const response = await app.request('GET', '/api/todos.csv?q=%20MILK%20');

    expect(rows(response.body).map((row) => row.split(',')[0])).toEqual(['Milk the cow', 'Buy milk']);
  });

  it('exports every todo when q is blank', async () => {
    await createTodo('Buy milk');

    const response = await app.request('GET', '/api/todos.csv?q=%20');

    expect(rows(response.body)).toHaveLength(1);
  });

  it('answers 400 when q is given twice', async () => {
    const response = await app.request('GET', '/api/todos.csv?q=a&q=b');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'q must be given once' });
  });

  it('allows calls from other origins, as the rest of the API does', async () => {
    const response = await app.request('GET', '/api/todos.csv');

    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });
});
