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

describe('POST /api/todos', () => {
  it('creates a todo and answers with it', async () => {
    const response = await app.request('POST', '/api/todos', { title: 'Buy milk', tags: ['Groceries'] });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 1,
      title: 'Buy milk',
      done: false,
      createdAt: expect.any(String),
      tags: ['groceries'],
    });
    expect(Number.isNaN(Date.parse(response.body.createdAt))).toBe(false);

    const { rows } = await app.pool.query('SELECT title, done FROM todos');
    expect(rows).toEqual([{ title: 'Buy milk', done: false }]);
  });

  it('answers 400 with a message when the title is not a string', async () => {
    const response = await app.request('POST', '/api/todos', { title: 7 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'title must be a string' });
    const { rows } = await app.pool.query('SELECT count(*)::int AS count FROM todos');
    expect(rows[0].count).toBe(0);
  });

  it('answers 400 when the title is too long', async () => {
    const response = await app.request('POST', '/api/todos', { title: 'x'.repeat(201) });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'title must be at most 200 characters' });
  });

  it('answers 400 when the body is not valid JSON', async () => {
    const response = await app.request('POST', '/api/todos', '{"title": ');

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
  });
});

describe('GET /api/todos', () => {
  it('lists todos newest first with the total', async () => {
    await createTodo('Buy milk', ['groceries']);
    await createTodo('Call grandma');

    const response = await app.request('GET', '/api/todos');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(20);
    expect(response.body.items.map((todo: { title: string }) => todo.title)).toEqual(['Call grandma', 'Buy milk']);
    expect(response.body.items[1].tags).toEqual(['groceries']);
  });

  it('finds todos whose title contains the search text', async () => {
    await createTodo('Buy milk');
    await createTodo('Buy bread');
    await createTodo('Call grandma');

    const response = await app.request('GET', '/api/todos?q=milk');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items.map((todo: { title: string }) => todo.title)).toEqual(['Buy milk']);
  });

  it('answers the first page and the total when there are more pages', async () => {
    for (const title of ['One', 'Two', 'Three', 'Four', 'Five']) {
      await createTodo(title);
    }

    const response = await app.request('GET', '/api/todos?page=1&pageSize=2');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(5);
    expect(response.body.pageSize).toBe(2);
    expect(response.body.items.map((todo: { title: string }) => todo.title)).toEqual(['Five', 'Four']);
  });

  it('answers an empty page past the end', async () => {
    await createTodo('Buy milk');

    const response = await app.request('GET', '/api/todos?page=5');

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
    expect(response.body.total).toBe(1);
  });

  it('answers 400 for a bad page size', async () => {
    const response = await app.request('GET', '/api/todos?pageSize=500');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'pageSize must be a whole number from 1 to 100' });
  });
});

describe('GET /api/todos/:id', () => {
  it('answers one todo', async () => {
    const created = await createTodo('Buy milk', ['groceries']);

    const response = await app.request('GET', `/api/todos/${created.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(created);
  });

  it('answers 404 for an unknown or malformed id', async () => {
    expect((await app.request('GET', '/api/todos/999')).status).toBe(404);
    const malformed = await app.request('GET', '/api/todos/abc');
    expect(malformed.status).toBe(404);
    expect(malformed.body).toEqual({ error: 'todo not found' });
  });
});

describe('PATCH /api/todos/:id', () => {
  it('changes the title and replaces the tags', async () => {
    const created = await createTodo('Buy milk', ['groceries']);

    const response = await app.request('PATCH', `/api/todos/${created.id}`, {
      title: 'Buy oat milk',
      tags: ['Shop', 'weekend'],
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: created.id, title: 'Buy oat milk', done: false, tags: ['shop', 'weekend'] });
    expect((await app.request('GET', `/api/todos/${created.id}`)).body.tags).toEqual(['shop', 'weekend']);
  });

  it('reopens a done todo', async () => {
    const created = await createTodo('Buy milk');
    await app.request('POST', `/api/todos/${created.id}/done`);

    const response = await app.request('PATCH', `/api/todos/${created.id}`, { done: false });

    expect(response.status).toBe(200);
    expect(response.body.done).toBe(false);
  });

  it('leaves fields it was not sent alone', async () => {
    const created = await createTodo('Buy milk', ['groceries']);

    const response = await app.request('PATCH', `/api/todos/${created.id}`, { done: true });

    expect(response.body).toMatchObject({ title: 'Buy milk', done: true, tags: ['groceries'] });
  });

  it('answers 400 for a bad field and 404 for an unknown todo', async () => {
    const created = await createTodo('Buy milk');

    const bad = await app.request('PATCH', `/api/todos/${created.id}`, { done: 'yes' });
    expect(bad.status).toBe(400);
    expect(bad.body).toEqual({ error: 'done must be true or false' });

    expect((await app.request('PATCH', '/api/todos/999', { done: true })).status).toBe(404);
  });
});

describe('POST /api/todos/:id/done', () => {
  it('marks a todo done', async () => {
    const created = await createTodo('Water the plants');

    const response = await app.request('POST', `/api/todos/${created.id}/done`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: created.id, title: 'Water the plants', done: true });
    const { rows } = await app.pool.query('SELECT done FROM todos WHERE id = $1', [created.id]);
    expect(rows[0].done).toBe(true);
  });

  it('leaves a done todo done when marked done again', async () => {
    const created = await createTodo('Water the plants');
    await app.request('POST', `/api/todos/${created.id}/done`);

    const response = await app.request('POST', `/api/todos/${created.id}/done`);

    expect(response.status).toBe(200);
    expect(response.body.done).toBe(true);
    const { rows } = await app.pool.query('SELECT done FROM todos WHERE id = $1', [created.id]);
    expect(rows[0].done).toBe(true);
  });

  it('answers 404 for an unknown todo', async () => {
    expect((await app.request('POST', '/api/todos/999/done')).status).toBe(404);
  });
});

describe('DELETE /api/todos/:id', () => {
  it('deletes a todo', async () => {
    const kept = await createTodo('Buy milk');
    const deleted = await createTodo('Call grandma');

    const response = await app.request('DELETE', `/api/todos/${deleted.id}`);

    expect(response.status).toBe(204);
    expect((await app.request('GET', `/api/todos/${deleted.id}`)).status).toBe(404);
    const list = await app.request('GET', '/api/todos');
    expect(list.body.items.map((todo: { id: number }) => todo.id)).toEqual([kept.id]);
  });

  it('answers 404 for an unknown todo', async () => {
    expect((await app.request('DELETE', '/api/todos/999')).status).toBe(404);
  });
});

describe('the rest of the server', () => {
  it('reports the database as healthy', async () => {
    const response = await app.request('GET', '/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('allows other origins to call the API', async () => {
    const response = await app.request('OPTIONS', '/api/todos');

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('PATCH');
  });

  it('answers 404 as JSON for an unknown API route', async () => {
    const response = await app.request('GET', '/api/nothing-here');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not found' });
  });

  it('serves the web page', async () => {
    const response = await app.request('GET', '/');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.body).toContain('<title>Todos</title>');
  });
});
