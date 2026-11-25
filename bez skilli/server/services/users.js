import { conflict, notFound } from '../lib/errors.js';
import { ACCESS_STATE_SQL, accessHistory, accessState, getCurrentAccess } from './access.js';

/** Fields that may leave the server for the account owner. */
export function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    timezone: u.timezone,
    workStart: u.work_start,
    workEnd: u.work_end,
    workDays: String(u.work_days).split(',').filter(Boolean).map(Number),
    lunchStart: u.lunch_start,
    lunchMinutes: u.lunch_minutes,
    bufferMinutes: u.buffer_minutes,
    maxBlockMinutes: u.max_block_minutes,
    marketingConsent: !!u.marketing_consent,
    createdAt: u.created_at,
  };
}

/** @param {import('../db/index.js').Db} db @param {number} id */
export const getUser = (db, id) => db.get('SELECT * FROM users WHERE id = ?', id);

/** @param {import('../db/index.js').Db} db @param {string} email */
export const findByEmail = (db, email) => db.get('SELECT * FROM users WHERE email = ?', String(email).toLowerCase());

/**
 * @param {import('../db/index.js').Db} db
 * @param {{ email: string, name: string, passwordHash: string, termsVersion: string, marketing: boolean, timezone: string, role?: 'user' | 'admin' }} o
 */
export function createUser(db, o) {
  if (findByEmail(db, o.email)) throw conflict('An account with this e-mail already exists.');
  const now = Date.now();
  const { lastId } = db.run(
    `INSERT INTO users (email, name, password_hash, role, timezone, lunch_start, marketing_consent, marketing_consent_at, terms_version, terms_accepted_at,
       password_changed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 720, ?, ?, ?, ?, ?, ?, ?)`,
    o.email.toLowerCase(),
    o.name,
    o.passwordHash,
    o.role ?? 'user',
    o.timezone,
    o.marketing ? 1 : 0,
    o.marketing ? now : null,
    o.termsVersion,
    now,
    now,
    now,
    now,
  );
  return getUser(db, lastId);
}

/**
 * Hard-deletes a user and everything they own (FK cascades), and anonymises
 * references kept for accountability (audit log, invite history).
 * @param {import('../db/index.js').Db} db
 * @param {number} userId
 */
export function deleteUser(db, userId) {
  const user = getUser(db, userId);
  if (!user) throw notFound('User not found.');
  const label = `deleted user #${userId}`;
  db.tx(() => {
    db.run(`UPDATE audit_logs SET target_label = ? WHERE target_type = 'user' AND target_id = ?`, label, String(userId));
    db.run('UPDATE audit_logs SET actor_label = ? WHERE actor_id = ?', label, userId);
    db.run('UPDATE invite_redemptions SET user_label = ? WHERE user_id = ?', label, userId);
    db.run('UPDATE access_grants SET granted_by_label = ? WHERE granted_by = ?', label, userId);
    db.run('UPDATE access_grants SET revoked_by_label = ? WHERE revoked_by = ?', label, userId);
    db.run('UPDATE access_events SET actor_label = ? WHERE actor_id = ?', label, userId);
    db.run('DELETE FROM waitlist WHERE email = ?', user.email);
    db.run('DELETE FROM email_outbox WHERE to_email = ?', user.email);
    db.run('UPDATE invite_codes SET bound_email = NULL WHERE bound_email = ?', user.email);
    db.run('DELETE FROM users WHERE id = ?', userId);
  });
  return user;
}

/**
 * Full machine-readable export of the user's personal data (GDPR art. 15/20).
 * @param {import('../db/index.js').Db} db
 * @param {number} userId
 */
export function exportUserData(db, userId) {
  const u = getUser(db, userId);
  if (!u) throw notFound('User not found.');
  return {
    exportedAt: new Date().toISOString(),
    format: 'kedgely-export-v1',
    profile: {
      ...publicUser(u),
      termsVersion: u.terms_version,
      termsAcceptedAt: u.terms_accepted_at,
      marketingConsentAt: u.marketing_consent_at,
      lastLoginAt: u.last_login_at,
    },
    access: accessHistory(db, userId),
    projects: db.all('SELECT * FROM projects WHERE user_id = ? ORDER BY id', userId),
    tasks: db.all('SELECT * FROM tasks WHERE user_id = ? ORDER BY id', userId),
    taskHistory: db.all('SELECT * FROM task_events WHERE user_id = ? ORDER BY id', userId),
    schedule: db.all('SELECT * FROM schedule_blocks WHERE user_id = ? ORDER BY date, start_min', userId),
    assistantMessages: db.all('SELECT role, content, mode, created_at FROM ai_messages WHERE user_id = ? ORDER BY id', userId),
    sessions: db.all('SELECT scope, user_agent, ip_prefix, created_at, last_seen_at FROM sessions WHERE user_id = ?', userId),
  };
}

/**
 * @param {import('../db/index.js').Db} db
 * @param {{ q?: string, state?: string, role?: string, plan?: string, page: number, pageSize: number }} f
 */
export function adminListUsers(db, f) {
  const now = Date.now();
  const where = [];
  /** @type {Record<string, unknown>} */
  const named = { now };
  if (f.q) {
    where.push('(u.email LIKE :q OR u.name LIKE :q)');
    named.q = `%${f.q.replace(/[%_]/g, '')}%`;
  }
  if (f.role) {
    where.push('u.role = :role');
    named.role = f.role;
  }
  if (f.state) {
    where.push('state = :state');
    named.state = f.state;
  }
  if (f.plan) {
    where.push('current_plan = :plan');
    named.plan = f.plan;
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const base = `WITH x AS (
      SELECT u.id, u.email, u.name, u.role, u.status, u.created_at, u.last_login_at, u.last_active_at,
        ${ACCESS_STATE_SQL} AS state,
        (SELECT g.plan_id FROM access_grants g JOIN plans p ON p.id = g.plan_id
          WHERE g.user_id = u.id AND g.revoked_at IS NULL AND g.starts_at <= :now AND (g.ends_at IS NULL OR g.ends_at > :now)
          ORDER BY p.sort_order DESC LIMIT 1) AS current_plan,
        (SELECT MAX(COALESCE(g.ends_at, 9007199254740991)) FROM access_grants g
          WHERE g.user_id = u.id AND g.revoked_at IS NULL AND g.starts_at <= :now AND (g.ends_at IS NULL OR g.ends_at > :now)) AS access_ends_at
      FROM users u)
    SELECT * FROM x u`;
  const total = db.get(`SELECT COUNT(*) AS n FROM (${base} ${w})`, named).n;
  const rows = db.all(`${base} ${w} ORDER BY u.id DESC LIMIT :limit OFFSET :offset`, {
    ...named,
    limit: f.pageSize,
    offset: (f.page - 1) * f.pageSize,
  });
  for (const r of rows) if (r.access_ends_at === 9007199254740991) r.access_ends_at = null;
  return { total, rows };
}

/** @param {import('../db/index.js').Db} db @param {number} id */
export function adminUserDetail(db, id) {
  const u = getUser(db, id);
  if (!u) throw notFound('User not found.');
  const current = getCurrentAccess(db, id);
  return {
    user: {
      ...publicUser(u),
      lastLoginAt: u.last_login_at,
      lastActiveAt: u.last_active_at,
      blockedReason: u.blocked_reason,
      failedLogins: u.failed_logins,
      lockedUntil: u.locked_until,
      termsVersion: u.terms_version,
    },
    state: accessState(db, u),
    currentAccess: current && { grantId: current.grantId, planId: current.plan.id, planName: current.plan.name, startsAt: current.startsAt, endsAt: current.endsAt, source: current.source },
    history: accessHistory(db, id),
    redemptions: db.all(
      `SELECT r.redeemed_at, i.code_hint, i.label, i.id AS code_id FROM invite_redemptions r JOIN invite_codes i ON i.id = r.code_id WHERE r.user_id = ? ORDER BY r.id DESC`,
      id,
    ),
    stats: db.get(
      `SELECT (SELECT COUNT(*) FROM tasks WHERE user_id = :id) AS tasks,
              (SELECT COUNT(*) FROM tasks WHERE user_id = :id AND status = 'done') AS tasks_done,
              (SELECT COUNT(*) FROM projects WHERE user_id = :id) AS projects,
              (SELECT COUNT(*) FROM ai_usage WHERE user_id = :id) AS ai_requests,
              (SELECT COUNT(*) FROM sessions WHERE user_id = :id) AS sessions`,
      { id },
    ),
  };
}
