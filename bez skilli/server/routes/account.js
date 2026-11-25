import { Router } from 'express';
import { z } from 'zod';
import { hashPassword, ipPrefix, verifyPassword } from '../lib/crypto.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { rateLimit } from '../lib/rateLimit.js';
import { idParam, parse, v } from '../lib/validate.js';
import { clearSessionCookie, requireCsrf, requireUser } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { redeemInvite } from '../services/invites.js';
import { destroyUserSessions, listSessions } from '../services/sessions.js';
import { deleteUser, exportUserData, getUser, publicUser } from '../services/users.js';
import { sessionPayload } from './auth.js';

/** @param {import('../app.js').Deps} deps */
export function accountRoutes(deps) {
  const { db, config } = deps;
  const r = Router();
  r.use(requireUser, requireCsrf);

  r.get('/', (req, res) => {
    res.json({ user: publicUser(req.auth.user) });
  });

  const profileSchema = z
    .object({
      name: v.name().optional(),
      timezone: v.timezone().optional(),
      workStart: v.minuteOfDay().optional(),
      workEnd: v.minuteOfDay().optional(),
      workDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
      lunchStart: v.minuteOfDay().nullable().optional(),
      lunchMinutes: z.number().int().min(0).max(180).optional(),
      bufferMinutes: z.number().int().min(0).max(60).optional(),
      maxBlockMinutes: z.number().int().min(25).max(240).optional(),
      marketingConsent: z.boolean().optional(),
    })
    .strict();

  r.patch('/', (req, res) => {
    const p = parse(profileSchema, req.body);
    const u = req.auth.user;
    const next = {
      name: p.name ?? u.name,
      timezone: p.timezone ?? u.timezone,
      work_start: p.workStart ?? u.work_start,
      work_end: p.workEnd ?? u.work_end,
      work_days: p.workDays ? [...new Set(p.workDays)].sort().join(',') : u.work_days,
      lunch_start: p.lunchStart !== undefined ? p.lunchStart : u.lunch_start,
      lunch_minutes: p.lunchMinutes ?? u.lunch_minutes,
      buffer_minutes: p.bufferMinutes ?? u.buffer_minutes,
      max_block_minutes: p.maxBlockMinutes ?? u.max_block_minutes,
      marketing_consent: p.marketingConsent !== undefined ? (p.marketingConsent ? 1 : 0) : u.marketing_consent,
    };
    if (next.work_end - next.work_start < 60) throw badRequest('Working hours must span at least one hour.', { fields: { workEnd: 'Must be at least 1 hour after the start.' } });
    if (!next.work_days) throw badRequest('Pick at least one working day.', { fields: { workDays: 'Pick at least one day.' } });
    const consentChanged = next.marketing_consent !== u.marketing_consent;
    db.run(
      `UPDATE users SET name = ?, timezone = ?, work_start = ?, work_end = ?, work_days = ?, lunch_start = ?, lunch_minutes = ?, buffer_minutes = ?,
         max_block_minutes = ?, marketing_consent = ?, marketing_consent_at = ?, updated_at = ? WHERE id = ?`,
      next.name,
      next.timezone,
      next.work_start,
      next.work_end,
      next.work_days,
      next.lunch_start,
      next.lunch_minutes,
      next.buffer_minutes,
      next.max_block_minutes,
      next.marketing_consent,
      consentChanged ? (next.marketing_consent ? Date.now() : null) : u.marketing_consent_at,
      Date.now(),
      u.id,
    );
    res.json({ user: publicUser(getUser(db, u.id)) });
  });

  const pwLimit = rateLimit({ windowMs: 15 * 60000, max: 10, disabled: config.rateLimits.disabled, key: (req) => `pw:${req.auth?.user.id}` });
  r.post('/password', pwLimit, async (req, res) => {
    const body = parse(z.object({ currentPassword: z.string().min(1).max(128), newPassword: v.password() }), req.body);
    const u = req.auth.user;
    if (!(await verifyPassword(body.currentPassword, u.password_hash))) {
      throw badRequest('Your current password is incorrect.', { fields: { currentPassword: 'Incorrect password.' } });
    }
    if (body.currentPassword === body.newPassword) throw badRequest('Choose a password different from the current one.', { fields: { newPassword: 'Must differ from the current password.' } });
    const hash = await hashPassword(body.newPassword);
    db.run('UPDATE users SET password_hash = ?, password_changed_at = ?, updated_at = ? WHERE id = ?', hash, Date.now(), Date.now(), u.id);
    const ended = destroyUserSessions(db, u.id, { exceptId: req.auth.session.id });
    audit(db, { actor: { id: u.id, email: u.email }, action: 'user.password_changed', targetType: 'user', targetId: u.id, targetLabel: u.email, ip: ipPrefix(req.ip) });
    res.json({ ok: true, endedSessions: ended });
  });

  r.get('/sessions', (req, res) => {
    res.json({ sessions: listSessions(db, req.auth.user.id).map((s) => ({ ...s, current: s.id === req.auth.session.id })) });
  });

  r.delete('/sessions/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    const out = db.run('DELETE FROM sessions WHERE id = ? AND user_id = ?', id, req.auth.user.id);
    if (!out.changes) throw notFound('Session not found.');
    if (id === req.auth.session.id) clearSessionCookie(config, res, 'app');
    res.json({ ok: true });
  });

  r.post('/sessions/revoke-others', (req, res) => {
    res.json({ ended: destroyUserSessions(db, req.auth.user.id, { exceptId: req.auth.session.id }) });
  });

  r.get('/export', (req, res) => {
    const data = exportUserData(db, req.auth.user.id);
    res.setHeader('Content-Disposition', `attachment; filename="kedgely-export-${new Date().toISOString().slice(0, 10)}.json"`);
    res.setHeader('Cache-Control', 'no-store');
    res.type('application/json').send(JSON.stringify(data, null, 2));
  });

  r.post('/delete', async (req, res) => {
    const body = parse(z.object({ password: z.string().min(1).max(128), confirm: z.literal('DELETE', { errorMap: () => ({ message: 'Type DELETE to confirm.' }) }) }), req.body);
    const u = req.auth.user;
    if (!(await verifyPassword(body.password, u.password_hash))) throw badRequest('Incorrect password.', { fields: { password: 'Incorrect password.' } });
    if (u.role === 'admin' && db.get(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'`).n <= 1) {
      throw conflict('You are the last administrator. Promote another administrator before deleting this account.');
    }
    deleteUser(db, u.id);
    audit(db, { actor: null, action: 'user.self_deleted', targetType: 'user', targetId: u.id, targetLabel: `deleted user #${u.id}`, ip: ipPrefix(req.ip) });
    clearSessionCookie(config, res, 'app');
    res.json({ ok: true });
  });

  return r;
}

/** @param {import('../app.js').Deps} deps */
export function accessRoutes(deps) {
  const { db, config } = deps;
  const r = Router();
  r.use(requireUser, requireCsrf);
  const redeemLimit = rateLimit({
    windowMs: 3600000,
    max: 10,
    disabled: config.rateLimits.disabled,
    key: (req) => `redeem:${req.auth?.user.id ?? req.ip}`,
    message: 'Too many invite attempts. Try again in an hour.',
  });

  r.get('/', (req, res) => {
    res.json(sessionPayload(deps, req.auth.user, req.auth.session));
  });

  r.post('/redeem', redeemLimit, (req, res) => {
    const { code } = parse(z.object({ code: z.string().trim().min(4).max(40) }), req.body);
    const u = req.auth.user;
    if (u.status !== 'active') throw forbidden();
    const out = redeemInvite(db, config.secret, u, code);
    audit(db, { actor: { id: u.id, email: u.email }, action: 'invite.redeemed', targetType: 'invite', targetId: out.codeId, targetLabel: `…${out.hint}`, details: { planId: out.planId, days: out.accessDays }, ip: ipPrefix(req.ip) });
    res.json({ ok: true, ...sessionPayload(deps, getUser(db, u.id), req.auth.session) });
  });

  return r;
}
