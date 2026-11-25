const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** @param {string} tz */
export function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** @type {Map<string, Intl.DateTimeFormat>} */
const fmtCache = new Map();
/** @param {string} tz */
function formatter(tz) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

/**
 * Local calendar date and minute-of-day for an instant in a timezone.
 * @param {number} ms
 * @param {string} tz
 */
export function zonedParts(ms, tz) {
  /** @type {Record<string, string>} */
  const p = {};
  for (const part of formatter(tz).formatToParts(new Date(ms))) p[part.type] = part.value;
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, minutes: Number(p.hour) * 60 + Number(p.minute), weekday: weekdayOf(date) };
}

/** @param {unknown} s @returns {s is string} */
export const isDate = (s) => typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/** @param {string} date @returns {number} 0=Sunday … 6=Saturday */
export const weekdayOf = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();

/** @param {string} date @param {number} days */
export function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a). @param {string} a @param {string} b */
export const diffDays = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/** Monday of the ISO week containing date. @param {string} date */
export function weekStart(date) {
  const wd = weekdayOf(date);
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

/** @param {number} m minutes after midnight */
export function fmtMinutes(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** @param {string} csv e.g. '1,2,3,4,5' */
export const parseWorkDays = (csv) =>
  new Set(
    String(csv || '')
      .split(',')
      .filter((s) => s.trim() !== '')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
  );
