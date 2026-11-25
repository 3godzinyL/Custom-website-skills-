import { ipPrefix, randomToken, sha256 } from '../lib/crypto.js';

/**
 * Server-side sessions. The browser holds an opaque random token in an
 * HttpOnly cookie; the database only stores its SHA-256, so a database leak
 * does not leak usable session tokens. App and admin sessions are separate
 * scopes with separate cookies and lifetimes.
 */

/**
 * @param {import('../db/index.js').Db} db
 * @param {import('../config.js').AppConfig} config
 * @param {{ userId: number, scope: 'app' | 'admin', userAgent?: string, ip?: string }} o
 */
export function createSession(db, config, o) {
  const token = randomToken(32);
  const csrf = randomToken(24);
  const now = Date.now();
  const idle = o.scope === 'admin' ? config.sessions.adminIdleMs : config.sessions.appIdleMs;
  const absolute = o.scope === 'admin' ? config.sessions.adminAbsoluteMs : config.sessions.appAbsoluteMs;
  db.run(
    `INSERT INTO sessions (token_hash, user_id, scope, csrf_token, user_agent, ip_prefix, created_at, last_seen_at, expires_at, absolute_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    sha256(token),
    o.userId,
    o.scope,
    csrf,
    String(o.userAgent || '').slice(0, 200),
    ipPrefix(o.ip),
    now,
    now,
    Math.min(now + idle, now + absolute),
    now + absolute,
  );
  return { token, csrf, maxAgeMs: absolute };
}

/**
 * Looks up a session by raw token. Expired sessions are deleted. Activity
 * slides the idle expiry (written at most once a minute).
 * @param {import('../db/index.js').Db} db
 * @param {import('../config.js').AppConfig} config
 * @param {string | undefined} token
 * @param {'app' | 'admin'} scope
 */
export function findSession(db, config, token, scope) {
  if (!token || token.length > 100) return null;
  const s = db.get('SELECT * FROM sessions WHERE token_hash = ? AND scope = ?', sha256(token), scope);
  if (!s) return null;
  const now = Date.now();
  if (s.expires_at <= now || s.absolute_expires_at <= now) {
    db.run('DELETE FROM sessions WHERE id = ?', s.id);
    return null;
  }
  if (now - s.last_seen_at > 60000) {
    const idle = scope === 'admin' ? config.sessions.adminIdleMs : config.sessions.appIdleMs;
    const expires = Math.min(now + idle, s.absolute_expires_at);
    db.run('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?', now, expires, s.id);
    s.last_seen_at = now;
    s.expires_at = expires;
  }
  return s;
}

/** @param {import('../db/index.js').Db} db @param {number} id */
export const destroySession = (db, id) => db.run('DELETE FROM sessions WHERE id = ?', id);

/**
 * @param {import('../db/index.js').Db} db
 * @param {number} userId
 * @param {{ exceptId?: number, scope?: 'app' | 'admin' }} [o]
 */
export function destroyUserSessions(db, userId, o = {}) {
  let sql = 'DELETE FROM sessions WHERE user_id = ?';
  const params = [userId];
  if (o.exceptId) {
    sql += ' AND id != ?';
    params.push(o.exceptId);
  }
  if (o.scope) {
    sql += ' AND scope = ?';
    params.push(o.scope);
  }
  return db.run(sql, ...params).changes;
}

/** @param {import('../db/index.js').Db} db @param {number} userId */
export const listSessions = (db, userId) =>
  db.all(
    `SELECT id, scope, user_agent, ip_prefix, created_at, last_seen_at, expires_at FROM sessions WHERE user_id = ? ORDER BY last_seen_at DESC`,
    userId,
  );

/** @param {import('../db/index.js').Db} db */
export const purgeExpiredSessions = (db, now = Date.now()) =>
  db.run('DELETE FROM sessions WHERE expires_at <= ? OR absolute_expires_at <= ?', now, now).changes;
