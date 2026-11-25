import { hmac, randomToken, safeEqual, sha256 } from '../lib/crypto.js';
import { notFound } from '../lib/errors.js';

/**
 * Anti-bot form token: "<issuedAt>.<hmac>". A submission must arrive between
 * MIN_FILL_MS and MAX_AGE_MS after the token was issued (humans need a few
 * seconds; stale tokens are rejected).
 */
const MIN_FILL_MS = 2500;
const MAX_AGE_MS = 2 * 3600000;

/** @param {string} secret */
export function issueFormToken(secret, now = Date.now()) {
  return `${now}.${hmac(secret, `waitlist-form:${now}`).slice(0, 32)}`;
}

/** @param {string} secret @param {unknown} token */
export function checkFormToken(secret, token, now = Date.now()) {
  const [ts, sig] = String(token || '').split('.');
  const issued = Number(ts);
  if (!Number.isFinite(issued) || !sig) return 'invalid';
  if (!safeEqual(sig, hmac(secret, `waitlist-form:${issued}`).slice(0, 32))) return 'invalid';
  if (now - issued < MIN_FILL_MS) return 'too_fast';
  if (now - issued > MAX_AGE_MS) return 'expired';
  return 'ok';
}

/**
 * Adds an e-mail to the waitlist. Duplicates are silently accepted (same
 * response) so the endpoint cannot be used to test whether someone signed up.
 * @param {import('../db/index.js').Db} db
 * @param {{ email: string, marketing: boolean, source: string }} o
 * @returns {{ created: boolean, confirmToken: string | null }}
 */
export function joinWaitlist(db, o) {
  const existing = db.get('SELECT id, confirmed_at FROM waitlist WHERE email = ?', o.email);
  if (existing) return { created: false, confirmToken: null };
  const token = randomToken(24);
  const now = Date.now();
  db.run(
    `INSERT INTO waitlist (email, privacy_accepted_at, marketing_consent, source, confirm_token_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    o.email,
    now,
    o.marketing ? 1 : 0,
    o.source,
    sha256(token),
    now,
    now,
  );
  return { created: true, confirmToken: token };
}

/** @param {import('../db/index.js').Db} db @param {string} token */
export function confirmWaitlist(db, token) {
  if (!token || token.length > 100) return false;
  const row = db.get('SELECT id FROM waitlist WHERE confirm_token_hash = ?', sha256(token));
  if (!row) return false;
  db.run('UPDATE waitlist SET confirmed_at = ?, confirm_token_hash = NULL, updated_at = ? WHERE id = ?', Date.now(), Date.now(), row.id);
  return true;
}

/**
 * @param {import('../db/index.js').Db} db
 * @param {{ q?: string, status?: string, confirmed?: string, marketing?: string, page: number, pageSize: number }} f
 */
export function listWaitlist(db, f) {
  const where = [];
  const params = [];
  if (f.q) {
    where.push('w.email LIKE ?');
    params.push(`%${f.q.replace(/[%_]/g, '')}%`);
  }
  if (f.status) {
    where.push('w.status = ?');
    params.push(f.status);
  }
  if (f.confirmed === 'yes') where.push('w.confirmed_at IS NOT NULL');
  if (f.confirmed === 'no') where.push('w.confirmed_at IS NULL');
  if (f.marketing === 'yes') where.push('w.marketing_consent = 1');
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.get(`SELECT COUNT(*) AS n FROM waitlist w ${w}`, ...params).n;
  const rows = db.all(
    `SELECT w.id, w.email, w.marketing_consent, w.source, w.status, w.confirmed_at, w.invited_at, w.created_at,
            EXISTS (SELECT 1 FROM users u WHERE u.email = w.email) AS has_account
       FROM waitlist w ${w} ORDER BY w.id DESC LIMIT ? OFFSET ?`,
    ...params,
    f.pageSize,
    (f.page - 1) * f.pageSize,
  );
  return { total, rows };
}

/** @param {import('../db/index.js').Db} db @param {number} id */
export function deleteWaitlistEntry(db, id) {
  const row = db.get('SELECT id, email FROM waitlist WHERE id = ?', id);
  if (!row) throw notFound('Entry not found.');
  db.run('DELETE FROM waitlist WHERE id = ?', id);
  return row;
}

/**
 * Retention: unconfirmed sign-ups are removed after 30 days, every entry
 * after the configured retention period (unless the person joined).
 * @param {import('../db/index.js').Db} db
 * @param {number} retentionDays
 */
export function purgeWaitlist(db, retentionDays, now = Date.now()) {
  const unconfirmed = db.run('DELETE FROM waitlist WHERE confirmed_at IS NULL AND created_at < ?', now - 30 * 86400000).changes;
  const old = db.run(`DELETE FROM waitlist WHERE status != 'joined' AND created_at < ?`, now - retentionDays * 86400000).changes;
  return { unconfirmed, old };
}

/** @param {unknown} v */
const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** @param {import('../db/index.js').Db} db */
export function exportWaitlistCsv(db) {
  const rows = db.all('SELECT email, status, marketing_consent, confirmed_at, invited_at, source, created_at FROM waitlist ORDER BY id');
  const iso = (/** @type {number | null} */ ms) => (ms ? new Date(ms).toISOString() : '');
  const lines = [['email', 'status', 'marketing_consent', 'confirmed_at', 'invited_at', 'source', 'created_at'].join(',')];
  for (const r of rows) {
    lines.push([r.email, r.status, r.marketing_consent ? 'yes' : 'no', iso(r.confirmed_at), iso(r.invited_at), r.source, iso(r.created_at)].map(csvCell).join(','));
  }
  return lines.join('\n') + '\n';
}
