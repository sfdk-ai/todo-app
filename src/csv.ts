import type { Todo } from './todos.js';

const HEADER = ['title', 'done', 'created_at', 'tags'];

// Spreadsheets run a cell that starts with one of these as a formula.
const FORMULA_START = /^[=+\-@\t\r]/;

// Writes todos as CSV the way RFC 4180 says, with a byte order mark so that
// Excel reads the file as UTF-8.
export function toCsv(todos: Todo[]): string {
  const rows = todos.map((todo) => [todo.title, String(todo.done), todo.createdAt, todo.tags.join('; ')]);
  return '﻿' + [HEADER, ...rows].map((row) => row.map(cell).join(',') + '\r\n').join('');
}

function cell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}
