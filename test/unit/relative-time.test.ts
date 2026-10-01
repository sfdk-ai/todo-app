import { describe, expect, it } from 'vitest';
import { addedAgo } from '../../public/relative-time.js';

const NOW = new Date('2026-10-01T12:00:00.000Z');

function ago(seconds: number): string {
  return new Date(NOW.getTime() - seconds * 1000).toISOString();
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('addedAgo', () => {
  it('says just now under a minute', () => {
    expect(addedAgo(ago(0), NOW)).toBe('added just now');
    expect(addedAgo(ago(59), NOW)).toBe('added just now');
  });

  it('says just now for a time in the future', () => {
    expect(addedAgo(ago(-300), NOW)).toBe('added just now');
  });

  it('counts minutes and hours', () => {
    expect(addedAgo(ago(MINUTE), NOW)).toBe('added 1 minute ago');
    expect(addedAgo(ago(5 * MINUTE + 30), NOW)).toBe('added 5 minutes ago');
    expect(addedAgo(ago(HOUR - 1), NOW)).toBe('added 59 minutes ago');
    expect(addedAgo(ago(HOUR), NOW)).toBe('added 1 hour ago');
    expect(addedAgo(ago(23 * HOUR), NOW)).toBe('added 23 hours ago');
  });

  it('says yesterday for one day and counts days after it', () => {
    expect(addedAgo(ago(DAY), NOW)).toBe('added yesterday');
    expect(addedAgo(ago(2 * DAY), NOW)).toBe('added 2 days ago');
    expect(addedAgo(ago(6 * DAY), NOW)).toBe('added 6 days ago');
  });

  it('counts weeks, months and years', () => {
    expect(addedAgo(ago(7 * DAY), NOW)).toBe('added last week');
    expect(addedAgo(ago(15 * DAY), NOW)).toBe('added 2 weeks ago');
    expect(addedAgo(ago(30 * DAY), NOW)).toBe('added last month');
    expect(addedAgo(ago(120 * DAY), NOW)).toBe('added 4 months ago');
    expect(addedAgo(ago(365 * DAY), NOW)).toBe('added last year');
    expect(addedAgo(ago(800 * DAY), NOW)).toBe('added 2 years ago');
  });

  it('takes the current time by default', () => {
    expect(addedAgo(new Date().toISOString())).toBe('added just now');
  });
});
