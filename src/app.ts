import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';
import { createTodo, deleteTodo, getTodo, listTags, listTodos, markDone, restoreTodo, updateTodo } from './todos.js';
import { ValidationError, parseId, parseListQuery, parseNewTodo, parseTodoChanges } from './validation.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

export function createApp(pool: pg.Pool): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api', allowOtherOrigins);

  app.get('/api/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  });

  app.get('/api/todos', async (req, res) => {
    res.json(await listTodos(pool, parseListQuery(req.query)));
  });

  app.post('/api/todos', async (req, res) => {
    res.status(201).json(await createTodo(pool, parseNewTodo(req.body)));
  });

  app.get('/api/todos/:id', async (req, res) => {
    const id = parseId(req.params.id);
    sendTodo(res, id === null ? null : await getTodo(pool, id));
  });

  app.patch('/api/todos/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const changes = parseTodoChanges(req.body);
    sendTodo(res, id === null ? null : await updateTodo(pool, id, changes));
  });

  app.post('/api/todos/:id/done', async (req, res) => {
    const id = parseId(req.params.id);
    sendTodo(res, id === null ? null : await markDone(pool, id));
  });

  app.post('/api/todos/:id/restore', async (req, res) => {
    const id = parseId(req.params.id);
    sendTodo(res, id === null ? null : await restoreTodo(pool, id));
  });

  app.delete('/api/todos/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (id !== null && (await deleteTodo(pool, id))) {
      res.status(204).end();
    } else {
      res.status(404).json({ error: 'todo not found' });
    }
  });

  app.get('/api/tags', async (_req, res) => {
    res.json(await listTags(pool));
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not found' });
  });

  app.use(express.static(publicDir));
  app.use(handleErrors);
  return app;
}

function sendTodo(res: express.Response, todo: unknown): void {
  if (todo === null) {
    res.status(404).json({ error: 'todo not found' });
  } else {
    res.json(todo);
  }
}

// The mobile app and other clients call the API from their own origin.
const allowOtherOrigins: RequestHandler = (req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
};

const handleErrors: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  const status = typeof error?.status === 'number' ? error.status : 500;
  if (status >= 400 && status < 500) {
    res.status(status).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'internal error' });
};
