export class ValidationError extends Error {
  override name = 'ValidationError';
}

export interface NewTodo {
  title: string;
  tags: string[];
}

export interface TodoChanges {
  title?: string;
  done?: boolean;
  tags?: string[];
}

export interface ListQuery {
  q?: string;
  page: number;
  pageSize: number;
}

const MAX_TITLE_LENGTH = 200;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_ID = 2_147_483_647;

export function parseNewTodo(body: unknown): NewTodo {
  const { title, tags } = asObject(body);
  return { title: parseTitle(title), tags: tags === undefined ? [] : parseTags(tags) };
}

export function parseTodoChanges(body: unknown): TodoChanges {
  const { title, done, tags } = asObject(body);
  const changes: TodoChanges = {};
  if (title !== undefined) changes.title = parseTitle(title);
  if (done !== undefined) {
    if (typeof done !== 'boolean') throw new ValidationError('done must be true or false');
    changes.done = done;
  }
  if (tags !== undefined) changes.tags = parseTags(tags);
  return changes;
}

export function parseListQuery(query: Record<string, unknown>): ListQuery {
  const q = single(query, 'q')?.trim();
  const page = wholeNumber(single(query, 'page'), 1);
  const pageSize = wholeNumber(single(query, 'pageSize'), DEFAULT_PAGE_SIZE);
  if (page === null || page < 1) {
    throw new ValidationError('page must be a whole number of at least 1');
  }
  if (pageSize === null || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new ValidationError(`pageSize must be a whole number from 1 to ${MAX_PAGE_SIZE}`);
  }
  return q ? { q, page, pageSize } : { page, pageSize };
}

export function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id >= 1 && id <= MAX_ID ? id : null;
}

function parseTitle(value: unknown): string {
  if (typeof value !== 'string') throw new ValidationError('title must be a string');
  const title = value.trim();
  if (title === '') throw new ValidationError('title must not be empty');
  if (title.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`title must be at most ${MAX_TITLE_LENGTH} characters`);
  }
  return title;
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((tag) => typeof tag === 'string')) {
    throw new ValidationError('tags must be a list of strings');
  }
  const tags = value.map((tag: string) => tag.trim().toLowerCase()).filter((tag) => tag !== '');
  return [...new Set(tags)];
}

function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('request body must be a JSON object');
  }
  return body as Record<string, unknown>;
}

function single(query: Record<string, unknown>, name: string): string | undefined {
  const value = query[name];
  if (value === undefined || typeof value === 'string') return value;
  throw new ValidationError(`${name} must be given once`);
}

function wholeNumber(value: string | undefined, fallback: number): number | null {
  if (value === undefined || value === '') return fallback;
  return /^\d+$/.test(value) ? Number(value) : null;
}
