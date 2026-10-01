import { describe, expect, it } from 'vitest';
import {
  ValidationError,
  parseId,
  parseListQuery,
  parseNewTodo,
  parseTodoChanges,
} from '../../src/validation.js';

describe('parseNewTodo', () => {
  it('trims the title and defaults to no tags', () => {
    expect(parseNewTodo({ title: '  Buy milk  ' })).toEqual({ title: 'Buy milk', tags: [] });
  });

  it('lowercases, trims and de-duplicates tags, dropping blank ones', () => {
    const todo = parseNewTodo({ title: 'Buy milk', tags: ['Groceries', ' groceries ', '', 'Shop'] });
    expect(todo.tags).toEqual(['groceries', 'shop']);
  });

  it('rejects a missing title', () => {
    expect(() => parseNewTodo({})).toThrow(new ValidationError('title must be a string'));
  });

  it('rejects a title that is not a string', () => {
    expect(() => parseNewTodo({ title: 42 })).toThrow(new ValidationError('title must be a string'));
  });

  it('rejects an empty or blank title', () => {
    for (const title of ['', '   ', '\t\n']) {
      expect(() => parseNewTodo({ title })).toThrow(new ValidationError('title must not be empty'));
    }
  });

  it('rejects a title longer than 200 characters', () => {
    expect(() => parseNewTodo({ title: 'x'.repeat(201) })).toThrow(
      new ValidationError('title must be at most 200 characters'),
    );
  });

  it('accepts a title of exactly 200 characters', () => {
    expect(parseNewTodo({ title: 'x'.repeat(200) }).title).toHaveLength(200);
  });

  it('rejects tags that are not a list of strings', () => {
    expect(() => parseNewTodo({ title: 'Buy milk', tags: 'groceries' })).toThrow(
      new ValidationError('tags must be a list of strings'),
    );
    expect(() => parseNewTodo({ title: 'Buy milk', tags: [1, 2] })).toThrow(
      new ValidationError('tags must be a list of strings'),
    );
  });

  it('rejects a body that is not a JSON object', () => {
    for (const body of [undefined, null, 'Buy milk', ['Buy milk']]) {
      expect(() => parseNewTodo(body)).toThrow(new ValidationError('request body must be a JSON object'));
    }
  });
});

describe('parseTodoChanges', () => {
  it('keeps only the fields that were sent', () => {
    expect(parseTodoChanges({ done: false })).toEqual({ done: false });
    expect(parseTodoChanges({ title: ' Call grandma ' })).toEqual({ title: 'Call grandma' });
    expect(parseTodoChanges({ tags: ['Family'] })).toEqual({ tags: ['family'] });
  });

  it('accepts an empty change', () => {
    expect(parseTodoChanges({})).toEqual({});
  });

  it('rejects done when it is not true or false', () => {
    expect(() => parseTodoChanges({ done: 'yes' })).toThrow(new ValidationError('done must be true or false'));
  });

  it('rejects a title that is not a string', () => {
    expect(() => parseTodoChanges({ title: null })).toThrow(new ValidationError('title must be a string'));
  });

  it('rejects a blank title', () => {
    expect(() => parseTodoChanges({ title: '  ' })).toThrow(new ValidationError('title must not be empty'));
  });
});

describe('parseListQuery', () => {
  it('defaults to the first page of 20', () => {
    expect(parseListQuery({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('reads the page, the page size and the search text', () => {
    expect(parseListQuery({ page: '3', pageSize: '50', q: ' milk ' })).toEqual({ page: 3, pageSize: 50, q: 'milk' });
  });

  it('ignores blank search text', () => {
    expect(parseListQuery({ q: '   ' })).toEqual({ page: 1, pageSize: 20 });
  });

  it('reads the tag, trimmed and lowercased as tags are stored', () => {
    expect(parseListQuery({ tag: ' Groceries ', q: 'milk' })).toEqual({ page: 1, pageSize: 20, q: 'milk', tag: 'groceries' });
  });

  it('ignores a blank tag', () => {
    expect(parseListQuery({ tag: '  ' })).toEqual({ page: 1, pageSize: 20 });
  });

  it('rejects a page that is not a positive whole number', () => {
    for (const page of ['0', '-1', '1.5', 'two']) {
      expect(() => parseListQuery({ page })).toThrow(new ValidationError('page must be a whole number of at least 1'));
    }
  });

  it('rejects a page size outside 1 to 100', () => {
    for (const pageSize of ['0', '101', 'ten']) {
      expect(() => parseListQuery({ pageSize })).toThrow(
        new ValidationError('pageSize must be a whole number from 1 to 100'),
      );
    }
  });

  it('rejects a parameter given more than once', () => {
    expect(() => parseListQuery({ q: ['milk', 'bread'] })).toThrow(new ValidationError('q must be given once'));
  });
});

describe('parseId', () => {
  it('reads a positive whole number', () => {
    expect(parseId('12')).toBe(12);
  });

  it('returns null for anything else', () => {
    for (const id of ['0', '-3', 'abc', '1.5', '', '99999999999']) {
      expect(parseId(id)).toBeNull();
    }
  });
});
