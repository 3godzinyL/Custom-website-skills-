import { Router } from 'express';
import { z } from 'zod';
import { ipPrefix, sha256 } from '../lib/crypto.js';
import { badRequest, conflict, HttpError, notFound } from '../lib/errors.js';
import { rateLimit } from '../lib/rateLimit.js';
import { addDays, zonedParts } from '../lib/time.js';
import { idParam, parse, v } from '../lib/validate.js';
import { clearSessionCookie, requireAdmin, requireCsrf, setSessionCookie } from '../middleware/auth.js';
import { ACCESS_STATE_SQL, DAY_MS, extendAccess, getCurrentAccess, grantAccess, revokeAccess } from '../services/access.js';
import { audit, listAudit } from '../services/audit.js';
import { createInvite, deleteInvite, inviteRedemptions, listInvites, setInviteActive } from '../services/invites.js';
import { getPlan, listPlans, updatePlan } from '../services/plans.js';
import { createSession, destroySession, destroyUserSessions } from '../services/sessions.js';
import { getSettings, saveSettings, SETTINGS_SCHEMA } from '../services/settings.js';
import { adminListUsers, adminUserDetail, deleteUser, getUser } from '../services/users.js';
import { deleteWaitlistEntry, exportWaitlistCsv, listWaitlist, purgeWaitlist } from '../services/waitlist.js';
import { verifyLogin } from './auth.js';

const page = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), pageSize: z.coerce.number().int().min(5).max(100).default(25) });
const planId = z.enum(['free', 'pro', 'team']);
const ts = z.coerce.number().int().min(0).max(4102444800000); // epoch ms up to year 2100

/**
 * Administration API. Separate session scope and cookie (SameSite=Strict,
 * short lifetime); every route requires role=admin on the server and logs
 * changes to the audit trail.
 * @param {import('../app.js').Deps} deps
 */
export function adminRoutes(deps) {
  const { db, config, mailer } = deps;
  const r = Router();
  /** @param {import('express').Request} req */
  const actorOf = (req) => ({ id: req.auth.user.id, email: req.auth.user.email });
  /** @param {import('express').Request} req @param {Omit<Parameters<typeof audit>[1], 'actor' | 'ip'>} e */
  const log = (req, e) => audit(db, { ...e, actor: actorOf(req), ip: ipPrefix(req.ip) });

  // ---------- Authentication ----------
  const loginLimit = rateLimit({ windowMs: 15 * 60000, max: 10, disabled: config.rateLimits.disabled, message: 'Too many attempts. Try again later.' });
  r.post('/auth/login', loginLimit, async (req, res) => {
    const body = parse(z.object({ email: v.email(), password: z.string().min(1).max(128) }), req.body);
    let user;
    try {
      user = await verifyLogin(deps, body.email, body.password);
    } catch (err) {
      audit(db, { actor: null, action: 'admin.login_failed', targetLabel: body.email, ip: ipPrefix(req.ip) });
      throw err;
    }
    if (user.role !== 'admin') {
      audit(db, { actor: null, action: 'admin.login_denied', targetType: 'user', targetId: user.id, targetLabel: user.email, ip: ipPrefix(req.ip) });
      throw new HttpError(401, 'invalid_credentials', 'E-mail or password is incorrect.');
    }
    const s = createSession(db, config, { userId: user.id, scope: 'admin', userAgent: req.get('user-agent'), ip: req.ip });
    setSessionCookie(config, res, 'admin', s.token, s.maxAgeMs);
    audit(db, { actor: { id: user.id, email: user.email }, action: 'admin.login', targetType: 'user', targetId: user.id, targetLabel: user.email, ip: ipPrefix(req.ip) });
    const session = db.get('SELECT csrf_token FROM sessions WHERE token_hash = ?', sha256(s.token));
    res.json({ user: { id: user.id, email: user.email, name: user.name }, csrfToken: session.csrf_token });
  });

  r.use(requireAdmin, requireCsrf);

  r.get('/auth/session', (req, res) => {
    const u = req.auth.user;
    res.json({ user: { id: u.id, email: u.email, name: u.name }, csrfToken: req.auth.session.csrf_token, ai: deps.ai.status(), mail: config.mail.transport });
  });
  r.post('/auth/logout', (req, res) => {
    destroySession(db, req.auth.session.id);
    clearSessionCookie(config, res, 'admin');
    log(req, { action: 'admin.logout' });
    res.json({ ok: true });
  });

  // ---------- Overview ----------
  r.get('/overview', (_req, res) => {
    const now = Date.now();
    const states = db.all(`SELECT state, COUNT(*) AS n FROM (SELECT ${ACCESS_STATE_SQL} AS state FROM users u) GROUP BY state`, { now });
    /** @type {Record<string, number>} */
    const byState = { active: 0, pending: 0, scheduled: 0, expired: 0, revoked: 0, blocked: 0 };
    for (const s of states) byState[s.state] = s.n;
    const total = db.get('SELECT COUNT(*) AS n FROM users').n;
    const activeGrants = db.all(
      `SELECT g.plan_id, COUNT(DISTINCT g.user_id) AS n FROM access_grants g
        WHERE g.revoked_at IS NULL AND g.starts_at <= ? AND (g.ends_at IS NULL OR g.ends_at > ?) GROUP BY g.plan_id`,
      now,
      now,
    );
    const today = zonedParts(now, 'UTC').date;
    const from = addDays(today, -29);
    const signups = db.all(
      `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM users WHERE created_at >= ? GROUP BY day`,
      Date.parse(`${from}T00:00:00Z`),
    );
    const waitlistDays = db.all(
      `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM waitlist WHERE created_at >= ? GROUP BY day`,
      Date.parse(`${from}T00:00:00Z`),
    );
    const active = db.all('SELECT day, COUNT(*) AS n FROM user_activity_days WHERE day >= ? GROUP BY day', from);
    const series = [];
    for (let i = 0; i < 30; i++) {
      const d = addDays(from, i);
      series.push({
        date: d,
        signups: signups.find((x) => x.day === d)?.n ?? 0,
        waitlist: waitlistDays.find((x) => x.day === d)?.n ?? 0,
        activeUsers: active.find((x) => x.day === d)?.n ?? 0,
      });
    }
    res.json({
      users: { total, ...byState },
      betaAccessActive: activeGrants.reduce((s, g) => s + g.n, 0),
      activeByPlan: activeGrants,
      expiringSoon: db.get(
        `SELECT COUNT(DISTINCT user_id) AS n FROM access_grants WHERE revoked_at IS NULL AND ends_at > ? AND ends_at <= ?`,
        now,
        now + 7 * DAY_MS,
      ).n,
      waitlist: db.get(
        `SELECT COUNT(*) AS total, SUM(CASE WHEN confirmed_at IS NOT NULL THEN 1 ELSE 0 END) AS confirmed,
                SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) AS waiting FROM waitlist`,
      ),
      invites: db.get(`SELECT COUNT(*) AS total, SUM(use_count) AS redemptions, SUM(CASE WHEN is_active = 1 AND use_count < max_uses AND (expires_at IS NULL OR expires_at > ?) THEN 1 ELSE 0 END) AS usable FROM invite_codes`, now),
      ai: db.get(`SELECT COUNT(*) AS total, SUM(CASE WHEN mode = 'live' THEN 1 ELSE 0 END) AS live FROM ai_usage WHERE created_at > ?`, now - DAY_MS),
      activeToday: db.get('SELECT COUNT(*) AS n FROM user_activity_days WHERE day = ?', today).n,
      series,
      recentEvents: listAudit(db, { page: 1, pageSize: 10 }).rows,
      recentUsers: db.all('SELECT id, email, name, created_at FROM users ORDER BY id DESC LIMIT 6'),
    });
  });

  // ---------- Users ----------
  const userQuery = page.extend({
    q: z.string().trim().max(100).optional(),
    state: z.enum(['active', 'pending', 'scheduled', 'expired', 'revoked', 'blocked']).optional(),
    role: z.enum(['user', 'admin']).optional(),
    plan: planId.optional(),
  });
  r.get('/users', (req, res) => {
    const f = parse(userQuery, req.query);
    res.json({ ...adminListUsers(db, f), page: f.page, pageSize: f.pageSize });
  });
  r.get('/users/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    res.json(adminUserDetail(db, id));
  });

  r.patch('/users/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    const body = parse(z.object({ name: v.name().optional(), email: v.email().optional(), role: z.enum(['user', 'admin']).optional() }).strict(), req.body);
    const u = getUser(db, id);
    if (!u) throw notFound('User not found.');
    if (body.role && body.role !== u.role && id === req.auth.user.id) throw badRequest('You cannot change your own role.');
    if (body.role === 'user' && u.role === 'admin' && db.get(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'`).n <= 1) {
      throw conflict('At least one active administrator must remain.');
    }
    if (body.email && body.email !== u.email && db.get('SELECT 1 FROM users WHERE email = ? AND id != ?', body.email, id)) {
      throw conflict('Another account already uses this e-mail.');
    }
    db.tx(() => {
      db.run('UPDATE users SET name = ?, email = ?, role = ?, updated_at = ? WHERE id = ?', body.name ?? u.name, body.email ?? u.email, body.role ?? u.role, Date.now(), id);
      if (body.role && body.role !== u.role) {
        // Privilege changes end existing sessions so they take effect everywhere.
        destroyUserSessions(db, id);
        log(req, { action: 'user.role_changed', targetType: 'user', targetId: id, targetLabel: body.email ?? u.email, details: { from: u.role, to: body.role } });
      }
      const changed = Object.keys(body).filter((k) => k !== 'role' && body[/** @type {'name'|'email'} */ (k)] !== u[k]);
      if (changed.length) log(req, { action: 'user.updated', targetType: 'user', targetId: id, targetLabel: u.email, details: { fields: changed } });
    });
    res.json(adminUserDetail(db, id));
  });

  r.post('/users/:id/block', (req, res) => {
    const { id } = parse(idParam, req.params);
    const { reason } = parse(z.object({ reason: v.text(300).optional() }), req.body);
    if (id === req.auth.user.id) throw badRequest('You cannot block yourself.');
    const u = getUser(db, id);
    if (!u) throw notFound('User not found.');
    db.tx(() => {
      db.run(`UPDATE users SET status = 'blocked', blocked_reason = ?, updated_at = ? WHERE id = ?`, reason ?? '', Date.now(), id);
      destroyUserSessions(db, id);
      log(req, { action: 'user.blocked', targetType: 'user', targetId: id, targetLabel: u.email, details: { reason } });
    });
    res.json(adminUserDetail(db, id));
  });

  r.post('/users/:id/unblock', (req, res) => {
    const { id } = parse(idParam, req.params);
    const u = getUser(db, id);
    if (!u) throw notFound('User not found.');
    db.run(`UPDATE users SET status = 'active', blocked_reason = NULL, failed_logins = 0, locked_until = NULL, updated_at = ? WHERE id = ?`, Date.now(), id);
    log(req, { action: 'user.unblocked', targetType: 'user', targetId: id, targetLabel: u.email });
    res.json(adminUserDetail(db, id));
  });

  r.post('/users/:id/sessions/revoke', (req, res) => {
    const { id } = parse(idParam, req.params);
    const u = getUser(db, id);
    if (!u) throw notFound('User not found.');
    const ended = destroyUserSessions(db, id, id === req.auth.user.id ? { exceptId: req.auth.session.id } : {});
    log(req, { action: 'user.sessions_revoked', targetType: 'user', targetId: id, targetLabel: u.email, details: { ended } });
    res.json({ ended });
  });

  r.delete('/users/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    if (id === req.auth.user.id) throw badRequest('You cannot delete your own account from the admin panel.');
    const u = getUser(db, id);
    if (!u) throw notFound('User not found.');
    if (u.role === 'admin' && db.get(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'`).n <= 1) {
      throw conflict('At least one active administrator must remain.');
    }
    deleteUser(db, id);
    log(req, { action: 'user.deleted', targetType: 'user', targetId: id, targetLabel: `deleted user #${id}` });
    res.json({ ok: true });
  });

  // ---------- Time-limited access ----------
  const grantSchema = z
    .object({
      planId,
      preset: z.enum(['1d', '3d', '7d', '14d', '30d', '90d', 'custom', 'unlimited']),
      startsAt: ts.optional(),
      endsAt: ts.optional(),
      note: v.text(300).optional(),
      notify: z.boolean().optional(),
    })
    .superRefine((b, ctx) => {
      if (b.preset === 'custom' && !b.endsAt) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Pick an end date.' });
    });
  r.post('/users/:id/access', async (req, res) => {
    const { id } = parse(idParam, req.params);
    const b = parse(grantSchema, req.body);
    const u = getUser(db, id);
    if (!u) throw notFound('User not found.');
    const startsAt = b.startsAt ?? Date.now();
    const days = { '1d': 1, '3d': 3, '7d': 7, '14d': 14, '30d': 30, '90d': 90 }[/** @type {'1d'} */ (b.preset)];
    const endsAt = b.preset === 'unlimited' ? null : b.preset === 'custom' ? /** @type {number} */ (b.endsAt) : startsAt + days * DAY_MS;
    if (endsAt !== null && endsAt <= Date.now()) throw badRequest('The access would already be over. Pick a later end date.', { fields: { endsAt: 'Must be in the future.' } });
    const grantId = db.tx(() => {
      const gid = grantAccess(db, { userId: id, planId: b.planId, startsAt, endsAt, source: 'admin', actor: actorOf(req), note: b.note });
      log(req, { action: 'access.granted', targetType: 'user', targetId: id, targetLabel: u.email, details: { grantId: gid, planId: b.planId, startsAt, endsAt, preset: b.preset } });
      return gid;
    });
    if (b.notify) await mailer.accessGranted(u.email, getPlan(db, b.planId).name, endsAt);
    res.status(201).json({ grantId, ...adminUserDetail(db, id) });
  });

  r.post('/users/:id/access/extend', (req, res) => {
    const { id } = parse(idParam, req.params);
    const b = parse(
      z.object({ days: z.number().int().min(1).max(3650).optional(), endsAt: ts.optional(), planId: planId.optional() }).refine((x) => x.days || x.endsAt, 'Give a number of days or an end date.'),
      req.body,
    );
    const u = getUser(db, id);
    if (!u) throw notFound('User not found.');
    db.tx(() => {
      const out = extendAccess(db, { userId: id, addDays: b.days, endsAt: b.endsAt, planId: b.planId, actor: actorOf(req) });
      log(req, { action: 'access.extended', targetType: 'user', targetId: id, targetLabel: u.email, details: { ...b, grantId: out.grantId, created: out.created } });
    });
    res.json(adminUserDetail(db, id));
  });

  r.post('/users/:id/access/revoke', (req, res) => {
    const { id } = parse(idParam, req.params);
    const { reason } = parse(z.object({ reason: v.text(300).optional() }), req.body);
    const u = getUser(db, id);
    if (!u) throw notFound('User not found.');
    db.tx(() => {
      const n = revokeAccess(db, { userId: id, actor: actorOf(req), reason });
      log(req, { action: 'access.revoked', targetType: 'user', targetId: id, targetLabel: u.email, details: { grants: n, reason } });
    });
    res.json(adminUserDetail(db, id));
  });

  r.get('/access', (req, res) => {
    const f = parse(page.extend({ state: z.enum(['active', 'scheduled', 'expiring', 'expired', 'revoked']).optional() }), req.query);
    const now = Date.now();
    const stateSql = `CASE WHEN g.revoked_at IS NOT NULL THEN 'revoked'
        WHEN g.starts_at > :now THEN 'scheduled'
        WHEN g.ends_at IS NOT NULL AND g.ends_at <= :now THEN 'expired'
        WHEN g.ends_at IS NOT NULL AND g.ends_at <= :soon THEN 'expiring'
        ELSE 'active' END`;
    const where = f.state ? `WHERE (${stateSql}) = :state OR (:state = 'active' AND (${stateSql}) = 'expiring')` : '';
    const named = { now, soon: now + 7 * DAY_MS, state: f.state ?? '' };
    const total = db.get(`SELECT COUNT(*) AS n FROM access_grants g ${where}`, named).n;
    const rows = db.all(
      `SELECT g.id, g.user_id, u.email, g.plan_id, g.starts_at, g.ends_at, g.source, g.granted_by_label, g.note, g.revoked_at,
              g.revoked_by_label, g.revoke_reason, g.created_at, ${stateSql} AS state
         FROM access_grants g JOIN users u ON u.id = g.user_id ${where}
        ORDER BY g.id DESC LIMIT :limit OFFSET :offset`,
      { ...named, limit: f.pageSize, offset: (f.page - 1) * f.pageSize },
    );
    res.json({ total, rows, page: f.page, pageSize: f.pageSize });
  });

  // ---------- Invite codes ----------
  r.get('/invites', (req, res) => {
    const f = parse(page.extend({ status: z.enum(['active', 'scheduled', 'expired', 'used_up', 'inactive']).optional() }), req.query);
    res.json({ ...listInvites(db, { status: f.status, page: f.page, pageSize: f.pageSize }), page: f.page, pageSize: f.pageSize });
  });
  const inviteSchema = z.object({
    label: v.text(80).optional(),
    planId,
    accessDays: z.number().int().min(1).max(3650),
    startsAt: ts.optional(),
    expiresAt: ts.nullable().optional(),
    maxUses: z.number().int().min(1).max(10000),
    boundEmail: v.email().nullable().optional(),
    count: z.number().int().min(1).max(50).default(1),
  });
  r.post('/invites', (req, res) => {
    const b = parse(inviteSchema, req.body);
    const created = db.tx(() => {
      const out = [];
      for (let i = 0; i < b.count; i++) {
        const c = createInvite(db, config.secret, {
          label: b.label,
          planId: b.planId,
          accessDays: b.accessDays,
          startsAt: b.startsAt ?? Date.now(),
          expiresAt: b.expiresAt ?? null,
          maxUses: b.maxUses,
          boundEmail: b.boundEmail ?? null,
          actor: actorOf(req),
        });
        out.push(c);
        log(req, { action: 'invite.created', targetType: 'invite', targetId: c.id, targetLabel: `…${c.code.slice(-4)}`, details: { planId: b.planId, accessDays: b.accessDays, maxUses: b.maxUses, label: b.label } });
      }
      return out;
    });
    res.status(201).json({ codes: created, notice: 'Copy these codes now — they are stored only as hashes and cannot be shown again.' });
  });
  r.patch('/invites/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    const { active } = parse(z.object({ active: z.boolean() }), req.body);
    const row = setInviteActive(db, id, active);
    log(req, { action: active ? 'invite.activated' : 'invite.deactivated', targetType: 'invite', targetId: id, targetLabel: `…${row.code_hint}` });
    res.json({ ok: true });
  });
  r.delete('/invites/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    const row = deleteInvite(db, id);
    log(req, { action: 'invite.deleted', targetType: 'invite', targetId: id, targetLabel: `…${row.code_hint}` });
    res.json({ ok: true });
  });
  r.get('/invites/:id/redemptions', (req, res) => {
    const { id } = parse(idParam, req.params);
    res.json({ redemptions: inviteRedemptions(db, id) });
  });

  // ---------- Waitlist ----------
  const wlQuery = page.extend({
    q: z.string().trim().max(100).optional(),
    status: z.enum(['waiting', 'invited', 'joined']).optional(),
    confirmed: z.enum(['yes', 'no']).optional(),
    marketing: z.enum(['yes']).optional(),
  });
  r.get('/waitlist', (req, res) => {
    const f = parse(wlQuery, req.query);
    res.json({ ...listWaitlist(db, f), page: f.page, pageSize: f.pageSize, retentionDays: getSettings(db).waitlistRetentionDays });
  });
  r.get('/waitlist/export.csv', (req, res) => {
    log(req, { action: 'waitlist.exported' });
    res.setHeader('Content-Disposition', `attachment; filename="kedgely-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.setHeader('Cache-Control', 'no-store');
    res.type('text/csv').send(exportWaitlistCsv(db));
  });
  r.delete('/waitlist/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    const row = deleteWaitlistEntry(db, id);
    log(req, { action: 'waitlist.deleted', targetType: 'waitlist', targetId: id, targetLabel: row.email });
    res.json({ ok: true });
  });
  r.post('/waitlist/purge', (req, res) => {
    const out = purgeWaitlist(db, getSettings(db).waitlistRetentionDays);
    log(req, { action: 'waitlist.purged', details: out });
    res.json(out);
  });
  r.post('/waitlist/:id/invite', async (req, res) => {
    const { id } = parse(idParam, req.params);
    const b = parse(z.object({ planId: planId.default('free'), accessDays: z.number().int().min(1).max(365).default(30) }), req.body);
    const entry = db.get('SELECT * FROM waitlist WHERE id = ?', id);
    if (!entry) throw notFound('Entry not found.');
    if (entry.status === 'joined') throw conflict('This person already has an account.');
    const invite = db.tx(() => {
      const c = createInvite(db, config.secret, {
        label: `Waitlist: ${entry.email}`,
        planId: b.planId,
        accessDays: b.accessDays,
        startsAt: Date.now(),
        expiresAt: Date.now() + 30 * DAY_MS,
        maxUses: 1,
        boundEmail: entry.email,
        actor: actorOf(req),
      });
      db.run(`UPDATE waitlist SET status = 'invited', invited_at = ?, invite_code_id = ?, updated_at = ? WHERE id = ?`, Date.now(), c.id, Date.now(), id);
      log(req, { action: 'waitlist.invited', targetType: 'waitlist', targetId: id, targetLabel: entry.email, details: { inviteId: c.id, planId: b.planId, accessDays: b.accessDays } });
      return c;
    });
    const sent = await mailer.waitlistInvite(entry.email, invite.code, b.accessDays);
    res.json({ ok: true, emailed: sent, code: invite.code });
  });

  // ---------- Plans ----------
  r.get('/plans', (_req, res) => {
    const counts = db.all(
      `SELECT plan_id, COUNT(DISTINCT user_id) AS n FROM access_grants WHERE revoked_at IS NULL AND starts_at <= ? AND (ends_at IS NULL OR ends_at > ?) GROUP BY plan_id`,
      Date.now(),
      Date.now(),
    );
    res.json({ plans: listPlans(db).map((p) => ({ ...p, activeUsers: counts.find((c) => c.plan_id === p.id)?.n ?? 0 })) });
  });
  const planPatch = z
    .object({
      name: v.text(40, 1).optional(),
      description: v.text(200).optional(),
      price_cents: z.number().int().min(0).max(1000000).optional(),
      max_projects: z.number().int().min(0).max(100000).optional(),
      max_open_tasks: z.number().int().min(0).max(1000000).optional(),
      ai_daily_limit: z.number().int().min(0).max(100000).optional(),
      analytics_days: z.number().int().min(7).max(3650).optional(),
      features: z.object({ ai_assistant: z.boolean(), ai_breakdown: z.boolean(), weekly_reports: z.boolean(), advanced_analytics: z.boolean() }).partial().optional(),
      is_active: z.boolean().optional(),
      billing_price_id: z.string().trim().max(100).nullable().optional(),
    })
    .strict();
  r.patch('/plans/:id', (req, res) => {
    const { id } = parse(z.object({ id: planId }), req.params);
    const patch = parse(planPatch, req.body);
    const { before, after } = updatePlan(db, id, patch);
    /** @type {Record<string, { from: unknown, to: unknown }>} */
    const diff = {};
    for (const k of Object.keys(patch)) {
      const a = JSON.stringify(before[/** @type {keyof typeof before} */ (k)]);
      const b2 = JSON.stringify(after[/** @type {keyof typeof after} */ (k)]);
      if (a !== b2) diff[k] = { from: before[/** @type {keyof typeof before} */ (k)], to: after[/** @type {keyof typeof after} */ (k)] };
    }
    log(req, { action: 'plan.updated', targetType: 'plan', targetId: id, targetLabel: after.name, details: diff });
    res.json({ plan: after });
  });

  // ---------- Settings ----------
  r.get('/settings', (_req, res) => {
    res.json({ settings: getSettings(db), runtime: { ai: deps.ai.status(), mail: config.mail.transport, env: config.nodeEnv, ephemeralSecret: config.ephemeralSecret } });
  });
  r.put('/settings', (req, res) => {
    const next = parse(SETTINGS_SCHEMA, req.body);
    const before = getSettings(db);
    saveSettings(db, next, req.auth.user.id);
    log(req, { action: 'settings.updated', details: { before, after: next } });
    res.json({ settings: next });
  });

  // ---------- Audit & outbox ----------
  r.get('/audit', (req, res) => {
    const f = parse(page.extend({ action: z.string().trim().max(60).optional(), q: z.string().trim().max(100).optional() }), req.query);
    res.json({ ...listAudit(db, f), page: f.page, pageSize: f.pageSize });
  });
  r.get('/outbox', (req, res) => {
    const f = parse(page, req.query);
    const total = db.get('SELECT COUNT(*) AS n FROM email_outbox').n;
    const rows = db.all(
      'SELECT id, to_email, template, subject, body_text, transport, status, error, created_at FROM email_outbox ORDER BY id DESC LIMIT ? OFFSET ?',
      f.pageSize,
      (f.page - 1) * f.pageSize,
    );
    res.json({ total, rows, page: f.page, pageSize: f.pageSize, transport: config.mail.transport });
  });

  r.get('/users/:id/access/current', (req, res) => {
    const { id } = parse(idParam, req.params);
    res.json({ access: getCurrentAccess(db, id) });
  });

  return r;
}
