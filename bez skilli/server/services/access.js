import { badRequest, notFound } from '../lib/errors.js';
import { hydratePlan } from './plans.js';

/**
 * Time-limited access. A user may use the app only while a non-revoked grant
 * covers "now". Expiry is evaluated on every protected request, so no job is
 * needed for correctness; sweepExpired only records history events.
 */

export const DAY_MS = 86400000;

/**
 * @param {import('../db/index.js').Db} db
 * @param {number} userId
 * @param {number} [now]
 */
export function getCurrentAccess(db, userId, now = Date.now()) {
  const row = db.get(
    `SELECT g.id AS grant_id, g.starts_at, g.ends_at, g.source, p.*
       FROM access_grants g JOIN plans p ON p.id = g.plan_id
      WHERE g.user_id = ? AND g.revoked_at IS NULL AND g.starts_at <= ? AND (g.ends_at IS NULL OR g.ends_at > ?)
      ORDER BY p.sort_order DESC, COALESCE(g.ends_at, 9007199254740991) DESC
      LIMIT 1`,
    userId,
    now,
    now,
  );
  if (!row) return null;
  const { grant_id, starts_at, ends_at, source, ...plan } = row;
  return { grantId: grant_id, startsAt: starts_at, endsAt: ends_at, source, plan: hydratePlan(plan) };
}

/**
 * Derived account access state shown to users and administrators.
 * @param {import('../db/index.js').Db} db
 * @param {{ id: number, status: string }} user
 * @param {number} [now]
 * @returns {'blocked' | 'active' | 'scheduled' | 'expired' | 'revoked' | 'pending'}
 */
export function accessState(db, user, now = Date.now()) {
  if (user.status === 'blocked') return 'blocked';
  if (getCurrentAccess(db, user.id, now)) return 'active';
  const s = db.get(
    `SELECT
       SUM(CASE WHEN revoked_at IS NULL AND starts_at > ? THEN 1 ELSE 0 END) AS scheduled,
       SUM(CASE WHEN revoked_at IS NULL AND ends_at IS NOT NULL AND ends_at <= ? THEN 1 ELSE 0 END) AS expired,
       COUNT(*) AS total
     FROM access_grants WHERE user_id = ?`,
    now,
    now,
    user.id,
  );
  if (s.scheduled > 0) return 'scheduled';
  if (s.expired > 0) return 'expired';
  if (s.total > 0) return 'revoked';
  return 'pending';
}

/** SQL fragment computing the same state for list queries (alias u = users). */
export const ACCESS_STATE_SQL = `CASE
  WHEN u.status = 'blocked' THEN 'blocked'
  WHEN EXISTS (SELECT 1 FROM access_grants g WHERE g.user_id = u.id AND g.revoked_at IS NULL AND g.starts_at <= :now AND (g.ends_at IS NULL OR g.ends_at > :now)) THEN 'active'
  WHEN EXISTS (SELECT 1 FROM access_grants g WHERE g.user_id = u.id AND g.revoked_at IS NULL AND g.starts_at > :now) THEN 'scheduled'
  WHEN EXISTS (SELECT 1 FROM access_grants g WHERE g.user_id = u.id AND g.revoked_at IS NULL AND g.ends_at IS NOT NULL AND g.ends_at <= :now) THEN 'expired'
  WHEN EXISTS (SELECT 1 FROM access_grants g WHERE g.user_id = u.id) THEN 'revoked'
  ELSE 'pending' END`;

/**
 * @param {import('../db/index.js').Db} db
 * @param {{ userId: number, grantId?: number | null, action: string, actor?: { id: number, email: string } | null, details?: object }} e
 */
function accessEvent(db, e) {
  db.run(
    `INSERT INTO access_events (user_id, grant_id, action, actor_id, actor_label, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    e.userId,
    e.grantId ?? null,
    e.action,
    e.actor?.id ?? null,
    e.actor?.email ?? 'system',
    JSON.stringify(e.details ?? {}),
    Date.now(),
  );
}

/**
 * @param {import('../db/index.js').Db} db
 * @param {{ userId: number, planId: string, startsAt: number, endsAt: number | null, source: 'admin' | 'invite' | 'waitlist' | 'system',
 *   actor?: { id: number, email: string } | null, inviteCodeId?: number | null, note?: string }} g
 */
export function grantAccess(db, g) {
  if (g.endsAt !== null && g.endsAt <= g.startsAt) throw badRequest('The access must end after it starts.');
  if (!db.get('SELECT 1 FROM plans WHERE id = ?', g.planId)) throw notFound('Plan not found.');
  const now = Date.now();
  const { lastId } = db.run(
    `INSERT INTO access_grants (user_id, plan_id, starts_at, ends_at, source, invite_code_id, granted_by, granted_by_label, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    g.userId,
    g.planId,
    g.startsAt,
    g.endsAt,
    g.source,
    g.inviteCodeId ?? null,
    g.actor?.id ?? null,
    g.actor?.email ?? (g.source === 'invite' ? 'invite code' : 'system'),
    g.note ?? '',
    now,
    now,
  );
  accessEvent(db, {
    userId: g.userId,
    grantId: lastId,
    action: 'granted',
    actor: g.actor,
    details: { planId: g.planId, startsAt: g.startsAt, endsAt: g.endsAt, source: g.source, note: g.note || undefined },
  });
  return lastId;
}

/**
 * Extends the user's current (or latest scheduled) grant. If nothing is
 * current, a fresh grant starting now is created instead.
 * @param {import('../db/index.js').Db} db
 * @param {{ userId: number, endsAt?: number, addDays?: number, planId?: string, actor: { id: number, email: string } }} e
 */
export function extendAccess(db, e) {
  const now = Date.now();
  const grant = db.get(
    `SELECT * FROM access_grants WHERE user_id = ? AND revoked_at IS NULL AND (ends_at IS NULL OR ends_at > ?)
     ORDER BY COALESCE(ends_at, 9007199254740991) DESC LIMIT 1`,
    e.userId,
    now,
  );
  if (!grant) {
    const endsAt = e.endsAt ?? now + (e.addDays ?? 0) * DAY_MS;
    return { grantId: grantAccess(db, { userId: e.userId, planId: e.planId || 'free', startsAt: now, endsAt, source: 'admin', actor: e.actor }), created: true };
  }
  if (grant.ends_at === null) throw badRequest('This access has no end date, so it cannot be extended.');
  const endsAt = e.endsAt ?? grant.ends_at + (e.addDays ?? 0) * DAY_MS;
  if (endsAt <= grant.ends_at) throw badRequest('The new end date must be later than the current one.');
  db.run('UPDATE access_grants SET ends_at = ?, expiry_logged = 0, updated_at = ? WHERE id = ?', endsAt, now, grant.id);
  accessEvent(db, { userId: e.userId, grantId: grant.id, action: 'extended', actor: e.actor, details: { from: grant.ends_at, to: endsAt } });
  return { grantId: grant.id, created: false };
}

/**
 * Immediately revokes every current and scheduled grant of a user.
 * @param {import('../db/index.js').Db} db
 * @param {{ userId: number, actor: { id: number, email: string } | null, reason?: string }} e
 */
export function revokeAccess(db, e) {
  const now = Date.now();
  const grants = db.all(
    `SELECT id FROM access_grants WHERE user_id = ? AND revoked_at IS NULL AND (ends_at IS NULL OR ends_at > ?)`,
    e.userId,
    now,
  );
  for (const g of grants) {
    db.run(
      `UPDATE access_grants SET revoked_at = ?, revoked_by = ?, revoked_by_label = ?, revoke_reason = ?, updated_at = ? WHERE id = ?`,
      now,
      e.actor?.id ?? null,
      e.actor?.email ?? 'system',
      e.reason ?? '',
      now,
      g.id,
    );
    accessEvent(db, { userId: e.userId, grantId: g.id, action: 'revoked', actor: e.actor, details: { reason: e.reason || undefined } });
  }
  return grants.length;
}

/** @param {import('../db/index.js').Db} db @param {number} userId */
export function accessHistory(db, userId) {
  const grants = db.all(
    `SELECT g.*, p.name AS plan_name FROM access_grants g JOIN plans p ON p.id = g.plan_id WHERE g.user_id = ? ORDER BY g.id DESC`,
    userId,
  );
  const events = db
    .all('SELECT * FROM access_events WHERE user_id = ? ORDER BY id DESC LIMIT 200', userId)
    .map((r) => ({ ...r, details: JSON.parse(r.details) }));
  return { grants, events };
}

/**
 * Records an "expired" history event once per grant. Correctness never
 * depends on this job — expiry is evaluated per request.
 * @param {import('../db/index.js').Db} db
 */
export function sweepExpired(db, now = Date.now()) {
  const rows = db.all(
    `SELECT id, user_id, ends_at FROM access_grants WHERE revoked_at IS NULL AND expiry_logged = 0 AND ends_at IS NOT NULL AND ends_at <= ? LIMIT 500`,
    now,
  );
  db.tx(() => {
    for (const r of rows) {
      db.run('UPDATE access_grants SET expiry_logged = 1 WHERE id = ?', r.id);
      accessEvent(db, { userId: r.user_id, grantId: r.id, action: 'expired', actor: null, details: { endsAt: r.ends_at } });
    }
  });
  return rows.length;
}
