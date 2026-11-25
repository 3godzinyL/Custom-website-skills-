/** @param {number} m minutes after midnight */
export const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** @param {string} v 'HH:MM' → minutes */
export function parseHm(v) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** @param {number} m */
export const duration = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);

/** @param {string} date 'YYYY-MM-DD' */
const asUtc = (date) => new Date(`${date}T12:00:00Z`);

/** @param {string} date @param {Intl.DateTimeFormatOptions} [opts] */
export const fmtDate = (date, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  date ? new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' }).format(asUtc(date)) : '';

/** @param {string} date @param {number} n */
export function addDays(date, n) {
  const d = asUtc(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** @param {string} a @param {string} b */
export const diffDays = (a, b) => Math.round((asUtc(b).getTime() - asUtc(a).getTime()) / 86400000);

/**
 * Due-date label relative to today.
 * @param {string | null} due
 * @param {string} today
 */
export function dueLabel(due, today) {
  if (!due) return null;
  const d = diffDays(today, due);
  if (d < 0) return { text: d === -1 ? 'Yesterday' : `${-d} days overdue`, cls: 'is-overdue' };
  if (d === 0) return { text: 'Today', cls: 'is-today' };
  if (d === 1) return { text: 'Tomorrow', cls: '' };
  if (d < 7) return { text: fmtDate(due, { weekday: 'long' }), cls: '' };
  return { text: fmtDate(due, { day: 'numeric', month: 'short' }), cls: '' };
}

/** @param {number | null | undefined} ms */
export const fmtDateTime = (ms) =>
  ms ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ms)) : '—';

/** @param {number | null | undefined} ms */
export function timeAgo(ms) {
  if (!ms) return '—';
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 0) return `in ${inWords(-s)}`;
  if (s < 45) return 'just now';
  return `${inWords(s)} ago`;
}

/** @param {number} s */
function inWords(s) {
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  return `${d} day${d === 1 ? '' : 's'}`;
}

/** Converts epoch ms to the value of an <input type="datetime-local">. @param {number} ms */
export function toLocalInput(ms) {
  const d = new Date(ms);
  const p = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const PRIORITY = { 1: 'Urgent', 2: 'High', 3: 'Medium', 4: 'Low' };

/** @param {string} name */
export const initials = (name) =>
  String(name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
