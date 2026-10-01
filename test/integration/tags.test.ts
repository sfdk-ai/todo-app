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

describe('GET /api/tags', () => {
  it('answers an empty list when nothing is tagged', async () => {
    const response = await app.request('GET', '/api/tags');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('counts the todos carrying each tag, most used first', async () => {
    await app.request('POST', '/api/todos', { title: 'Buy milk', tags: ['groceries'] });
    await app.request('POST', '/api/todos', { title: 'Buy bread', tags: ['groceries', 'bakery'] });
    await app.request('POST', '/api/todos', { title: 'Fix the tap', tags: ['home'] });

    const response = await app.request('GET', '/api/tags');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { name: 'groceries', count: 2 },
      { name: 'bakery', count: 1 },
      { name: 'home', count: 1 },
    ]);
  });

  it('follows a change to a todo’s tags', async () => {
    const created = await app.request('POST', '/api/todos', { title: 'Buy milk', tags: ['groceries'] });
    await app.request('PATCH', `/api/todos/${created.body.id}`, { tags: ['shop'] });

    const response = await app.request('GET', '/api/tags');

    expect(response.body).toEqual([{ name: 'shop', count: 1 }]);
  });
});
