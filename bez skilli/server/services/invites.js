import { generateInviteCode, hmac, normalizeInviteCode } from '../lib/crypto.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { DAY_MS, grantAccess } from './access.js';

/**
 * Invite codes are stored only as an HMAC-SHA256 keyed with APP_SECRET plus a
 * short hint (last 4 symbols). The plaintext is shown to the admin once.
 */

/** @param {string} secret @param {string} code normalised code */
export const codeHash = (secret, code) => hmac(secret, `invite:${code}`);

/**
 * @param {import('../db/index.js').Db} db
 * @param {string} secret
 * @param {{ label?: string, planId: string, accessDays: number, startsAt: number, expiresAt: number | null, maxUses: number,
 *   boundEmail?: string | null, actor: { id: number, email: string } | null }} o
 */
export function createInvite(db, secret, o) {
  if (o.expiresAt !== null && o.expiresAt <= o.startsAt) throw badRequest('The code must expire after it becomes valid.');
  if (!db.get('SELECT 1 FROM plans WHERE id = ?', o.planId)) throw notFound('Plan not found.');
  const code = generateInviteCode();
  const now = Date.now();
  const { lastId } = db.run(
    `INSERT INTO invite_codes (code_hash, code_hint, label, plan_id, access_days, starts_at, expires_at, max_uses, bound_email, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    codeHash(secret, code),
    code.slice(-4),
    o.label ?? '',
    o.planId,
    o.accessDays,
    o.startsAt,
    o.expiresAt,
    o.maxUses,
    o.boundEmail ?? null,
    o.actor?.id ?? null,
    now,
    now,
  );
  return { id: lastId, code };
}

/**
 * Redeems a code for a user atomically. The UPDATE with use_count < max_uses
 * is the concurrency guard: two simultaneous redemptions of the last use
 * cannot both succeed. A user can use a given code only once.
 * @param {import('../db/index.js').Db} db
 * @param {string} secret
 * @param {{ id: number, email: string }} user
 * @param {string} rawCode
 */
export function redeemInvite(db, secret, user, rawCode) {
  const code = normalizeInviteCode(rawCode);
  const generic = forbidden('This invite code is invalid or no longer available.', 'invalid_invite');
  if (!code) throw generic;
  return db.tx(() => {
    const now = Date.now();
    const row = db.get('SELECT * FROM invite_codes WHERE code_hash = ?', codeHash(secret, code));
    if (!row || !row.is_active || row.starts_at > now || (row.expires_at !== null && row.expires_at <= now)) throw generic;
    if (row.bound_email && row.bound_email.toLowerCase() !== user.email.toLowerCase()) throw generic;
    if (db.get('SELECT 1 FROM invite_redemptions WHERE code_id = ? AND user_id = ?', row.id, user.id)) {
      throw conflict('You have already used this invite code.');
    }
    const upd = db.run(
      'UPDATE invite_codes SET use_count = use_count + 1, updated_at = ? WHERE id = ? AND is_active = 1 AND use_count < max_uses',
      now,
      row.id,
    );
    if (upd.changes !== 1) throw generic;
    const grantId = grantAccess(db, {
      userId: user.id,
      planId: row.plan_id,
      startsAt: now,
      endsAt: now + row.access_days * DAY_MS,
      source: 'invite',
      inviteCodeId: row.id,
      note: row.label ? `Invite: ${row.label}` : `Invite …${row.code_hint}`,
    });
    db.run(
      'INSERT INTO invite_redemptions (code_id, user_id, user_label, grant_id, redeemed_at) VALUES (?, ?, ?, ?, ?)',
      row.id,
      user.id,
      user.email,
      grantId,
      now,
    );
    db.run(`UPDATE waitlist SET status = 'joined', updated_at = ? WHERE email = ?`, now, user.email);
    return { planId: row.plan_id, accessDays: row.access_days, grantId, codeId: row.id, hint: row.code_hint };
  });
}

/** @param {import('../db/index.js').Db} db */
export function listInvites(db, { status = '', page = 1, pageSize = 50 } = {}) {
  const now = Date.now();
  const stateSql = `CASE
      WHEN i.is_active = 0 THEN 'inactive'
      WHEN i.use_count >= i.max_uses THEN 'used_up'
      WHEN i.expires_at IS NOT NULL AND i.expires_at <= :now THEN 'expired'
      WHEN i.starts_at > :now THEN 'scheduled'
      ELSE 'active' END`;
  const where = status ? `WHERE ${stateSql} = :status` : '';
  const named = status ? { now, status } : { now };
  const total = db.get(`SELECT COUNT(*) AS n FROM invite_codes i ${where}`, named).n;
  const rows = db.all(
    `SELECT i.id, i.code_hint, i.label, i.plan_id, i.access_days, i.starts_at, i.expires_at, i.max_uses, i.use_count, i.is_active,
            i.bound_email, i.created_at, u.email AS created_by_email, ${stateSql} AS state
       FROM invite_codes i LEFT JOIN users u ON u.id = i.created_by ${where}
      ORDER BY i.id DESC LIMIT :limit OFFSET :offset`,
    { ...named, limit: pageSize, offset: (page - 1) * pageSize },
  );
  return { total, rows };
}

/** @param {import('../db/index.js').Db} db @param {number} id */
export function inviteRedemptions(db, id) {
  if (!db.get('SELECT 1 FROM invite_codes WHERE id = ?', id)) throw notFound('Invite code not found.');
  return db.all(
    `SELECT r.id, r.user_id, r.user_label, r.redeemed_at, r.grant_id, g.ends_at, g.revoked_at
       FROM invite_redemptions r LEFT JOIN access_grants g ON g.id = r.grant_id WHERE r.code_id = ? ORDER BY r.id DESC`,
    id,
  );
}

/** @param {import('../db/index.js').Db} db @param {number} id @param {boolean} active */
export function setInviteActive(db, id, active) {
  const r = db.run('UPDATE invite_codes SET is_active = ?, updated_at = ? WHERE id = ?', active ? 1 : 0, Date.now(), id);
  if (!r.changes) throw notFound('Invite code not found.');
  return db.get('SELECT id, code_hint, label FROM invite_codes WHERE id = ?', id);
}

/** Only codes that were never used can be deleted (history is preserved). */
export function deleteInvite(db, id) {
  const row = db.get('SELECT id, use_count, code_hint, label FROM invite_codes WHERE id = ?', id);
  if (!row) throw notFound('Invite code not found.');
  if (row.use_count > 0) throw conflict('This code has been used. Deactivate it instead to keep the history.');
  db.run('DELETE FROM invite_codes WHERE id = ?', id);
  return row;
}
