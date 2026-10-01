import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type pg from 'pg';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createPool } from '../../src/db.js';

export interface TestApp {
  pool: pg.Pool;
  request(method: string, path: string, body?: unknown): Promise<TestResponse>;
  close(): Promise<void>;
}

export interface TestResponse {
  status: number;
  headers: Headers;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

export async function startApp(): Promise<TestApp> {
  const pool = createPool(loadConfig().databaseUrl);
  const server = await new Promise<Server>((resolve) => {
    const listening = createApp(pool).listen(0, '127.0.0.1', () => resolve(listening));
  });
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    pool,
    async request(method, path, body) {
      const response = await fetch(baseUrl + path, {
        method,
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      });
      const text = await response.text();
      const isJson = response.headers.get('content-type')?.includes('application/json') ?? false;
      return { status: response.status, headers: response.headers, body: isJson ? JSON.parse(text) : text };
    },
    async close() {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
      await pool.end();
    },
  };
}

export async function emptyDatabase(pool: pg.Pool): Promise<void> {
  await pool.query('TRUNCATE todos, todo_tags RESTART IDENTITY');
}
