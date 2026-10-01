import type pg from 'pg';
import { inTransaction } from './db.js';
import type { ListQuery, NewTodo, TodoChanges } from './validation.js';

export interface Todo {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
  tags: string[];
}

export interface TodoPage {
  items: Todo[];
  page: number;
  pageSize: number;
  total: number;
}

export interface TagCount {
  name: string;
  count: number;
}

interface TodoRow {
  id: number;
  title: string;
  done: boolean;
  created_at: Date;
}

type Queryable = pg.Pool | pg.PoolClient;

const TODO_COLUMNS = 'id, title, done, created_at';

// How long a deleted todo can still be restored before a later delete erases it.
const RESTORE_WINDOW = '10 minutes';

export async function listTodos(db: pg.Pool, { q, page, pageSize }: ListQuery): Promise<TodoPage> {
  const search = q === undefined ? null : `%${q}%`;
  const first = (page - 1) * pageSize;
  const last = page * pageSize;

  const counted = await db.query<{ total: number }>(
    `SELECT count(*)::int AS total FROM todos WHERE deleted_at IS NULL AND ($1::text IS NULL OR title ILIKE $1)`,
    [search],
  );
  const { rows } = await db.query<TodoRow>(
    `SELECT ${TODO_COLUMNS}
       FROM (
         SELECT ${TODO_COLUMNS},
                row_number() OVER (ORDER BY created_at DESC, id DESC) AS position
           FROM todos
          WHERE deleted_at IS NULL AND ($1::text IS NULL OR title ILIKE $1)
       ) numbered
      WHERE position BETWEEN $2 AND $3
      ORDER BY position`,
    [search, first, last],
  );

  return { items: await withTags(db, rows), page, pageSize, total: counted.rows[0].total };
}

export async function getTodo(db: Queryable, id: number): Promise<Todo | null> {
  const { rows } = await db.query<TodoRow>(`SELECT ${TODO_COLUMNS} FROM todos WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return rows.length === 0 ? null : (await withTags(db, rows))[0];
}

export async function createTodo(pool: pg.Pool, { title, tags }: NewTodo): Promise<Todo> {
  return inTransaction(pool, async (client) => {
    const { rows } = await client.query<TodoRow>(
      `INSERT INTO todos (title) VALUES ($1) RETURNING ${TODO_COLUMNS}`,
      [title],
    );
    await setTags(client, rows[0].id, tags);
    return toTodo(rows[0], tags);
  });
}

export async function updateTodo(pool: pg.Pool, id: number, changes: TodoChanges): Promise<Todo | null> {
  return inTransaction(pool, async (client) => {
    const { rowCount } = await client.query(
      `UPDATE todos SET title = coalesce($2, title), done = coalesce($3, done) WHERE id = $1 AND deleted_at IS NULL`,
      [id, changes.title ?? null, changes.done ?? null],
    );
    if (rowCount === 0) return null;
    if (changes.tags !== undefined) {
      await client.query('DELETE FROM todo_tags WHERE todo_id = $1', [id]);
      await setTags(client, id, changes.tags);
    }
    return getTodo(client, id);
  });
}

export async function markDone(pool: pg.Pool, id: number): Promise<Todo | null> {
  const { rowCount } = await pool.query('UPDATE todos SET done = true WHERE id = $1 AND deleted_at IS NULL', [id]);
  return rowCount === 0 ? null : getTodo(pool, id);
}

export async function deleteTodo(pool: pg.Pool, id: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    'UPDATE todos SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL',
    [id],
  );
  await pool.query(`DELETE FROM todos WHERE deleted_at < now() - interval '${RESTORE_WINDOW}'`);
  return rowCount !== 0;
}

export async function restoreTodo(pool: pg.Pool, id: number): Promise<Todo | null> {
  const { rowCount } = await pool.query(
    'UPDATE todos SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
    [id],
  );
  return rowCount === 0 ? null : getTodo(pool, id);
}

export async function listTags(pool: pg.Pool): Promise<TagCount[]> {
  const { rows } = await pool.query<TagCount>(
    `SELECT tag AS name, count(*)::int AS count
       FROM todo_tags
       JOIN todos ON todos.id = todo_tags.todo_id
      WHERE todos.deleted_at IS NULL
      GROUP BY tag
      ORDER BY count DESC, tag`,
  );
  return rows;
}

async function setTags(client: pg.PoolClient, todoId: number, tags: string[]): Promise<void> {
  if (tags.length === 0) return;
  await client.query('INSERT INTO todo_tags (todo_id, tag) SELECT $1, unnest($2::text[])', [todoId, tags]);
}

async function withTags(db: Queryable, rows: TodoRow[]): Promise<Todo[]> {
  if (rows.length === 0) return [];
  const { rows: tagRows } = await db.query<{ todo_id: number; tag: string }>(
    'SELECT todo_id, tag FROM todo_tags WHERE todo_id = ANY($1::int[]) ORDER BY tag',
    [rows.map((row) => row.id)],
  );
  const tagsByTodo = new Map<number, string[]>();
  for (const { todo_id, tag } of tagRows) {
    tagsByTodo.set(todo_id, [...(tagsByTodo.get(todo_id) ?? []), tag]);
  }
  return rows.map((row) => toTodo(row, tagsByTodo.get(row.id) ?? []));
}

function toTodo(row: TodoRow, tags: string[]): Todo {
  return {
    id: row.id,
    title: row.title,
    done: row.done,
    createdAt: row.created_at.toISOString(),
    tags: [...tags].sort(),
  };
}
