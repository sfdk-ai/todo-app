const UNITS = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
];

const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

// Says how long ago a todo was added, such as "added 2 days ago". A time in the
// future, from a clock that runs behind, reads "added just now".
export function addedAgo(createdAt, now = new Date()) {
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 1000));
  for (const [unit, size] of UNITS) {
    if (seconds >= size) return `added ${format.format(-Math.floor(seconds / size), unit)}`;
  }
  return 'added just now';
}
