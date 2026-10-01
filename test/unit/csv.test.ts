import { describe, expect, it } from 'vitest';
import { toCsv } from '../../src/csv.js';
import type { Todo } from '../../src/todos.js';

const BOM = '﻿';
const HEADER = 'title,done,created_at,tags\r\n';

function todo(changes: Partial<Todo>): Todo {
  return { id: 1, title: 'Buy milk', done: false, createdAt: '2026-10-01T07:25:53.619Z', tags: [], ...changes };
}

describe('toCsv', () => {
  it('writes only the header when there are no todos', () => {
    expect(toCsv([])).toBe(BOM + HEADER);
  });

  it('writes one row per todo with its title, done, creation time and tags', () => {
    const csv = toCsv([
      todo({ tags: ['groceries', 'weekend'] }),
      todo({ id: 2, title: 'Call grandma', done: true, createdAt: '2026-10-01T07:26:10.002Z' }),
    ]);

    expect(csv).toBe(
      BOM +
        HEADER +
        'Buy milk,false,2026-10-01T07:25:53.619Z,groceries; weekend\r\n' +
        'Call grandma,true,2026-10-01T07:26:10.002Z,\r\n',
    );
  });

  it('quotes a title holding a comma, a double quote or a line break', () => {
    const rows = toCsv([todo({ title: 'Milk, eggs' }), todo({ title: 'Read "Dune"' }), todo({ title: 'one\ntwo' })])
      .slice(BOM.length + HEADER.length)
      .split('\r\n');

    expect(rows).toEqual([
      '"Milk, eggs",false,2026-10-01T07:25:53.619Z,',
      '"Read ""Dune""",false,2026-10-01T07:25:53.619Z,',
      '"one\ntwo",false,2026-10-01T07:25:53.619Z,',
      '',
    ]);
  });

  it('puts a quote mark before a title a spreadsheet would run as a formula', () => {
    for (const title of ['=1+1', '+1', '-1', '@SUM(A1)']) {
      expect(toCsv([todo({ title })])).toContain(`\r\n'${title},false`);
    }
    expect(toCsv([todo({ title: '=HYPERLINK("x", "y")' })])).toContain('\r\n"\'=HYPERLINK(""x"", ""y"")",false');
  });

  it('leaves a title alone when the formula characters are not at its start', () => {
    expect(toCsv([todo({ title: 'Pay 5+5 @ shop' })])).toContain('\r\nPay 5+5 @ shop,false');
  });
});
