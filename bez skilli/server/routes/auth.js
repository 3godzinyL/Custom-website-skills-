import { Router } from 'express';
import { z } from 'zod';
import { dummyVerify, hashPassword, ipPrefix, randomToken, sha256, verifyPassword } from '../lib/crypto.js';
import { badRequest, forbidden, HttpError, unauthorized } from '../lib/errors.js';
import { rateLimit } from '../lib/rateLimit.js';
import { parse, v } from '../lib/validate.js';
import { clearSessionCookie, requireCsrf, setSessionCookie } from '../middleware/auth.js';
import { accessState, DAY_MS, getCurrentAccess, grantAccess } from '../services/access.js';
import { audit } from '../services/audit.js';
import { redeemInvite } from '../services/invites.js';
import { createSession, destroySession, destroyUserSessions } from '../services/sessions.js';
import { getSettings } from '../services/settings.js';
import { createUser, findByEmail, publicUser } from '../services/users.js';

const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60000;
const RESET_TTL_MS = 30 * 60000;

/**
 * Everything the client needs after sign-in: profile, access state, limits,
 * usage and the CSRF token bound to this session.
 * @param {import('../app.js').Deps} deps
 * @param {any} user
 * @param {any} session
 */
export function sessionPayload(deps, user, session) {
  const { db, ai } = deps;
  const access = getCurrentAccess(db, user.id);
  const state = accessState(db, user);
  const upcoming = state === 'scheduled'
    ? db.get('SELECT starts_at FROM access_grants WHERE user_id = ? AND revoked_at IS NULL AND starts_at > ? ORDER BY starts_at LIMIT 1', user.id, Date.now())
    : null;
  return {
    user: publicUser(user),
    csrfToken: session.csrf_token,
    access: {
      state,
      startsAt: upcoming?.starts_at ?? null,
      endsAt: access?.endsAt ?? null,
      source: access?.source ?? null,
      plan: access
        ? {
            id: access.plan.id,
            name: access.plan.name,
            limits: {
              projects: access.plan.max_projects,
              openTasks: access.plan.max_open_tasks,
              aiDaily: access.plan.ai_daily_limit,
              analyticsDays: access.plan.analytics_days,
            },
            features: access.plan.features,
          }
        : null,
    },
    usage: access
      ? {
          aiLast24h: ai.usageToday(user.id),
          projects: db.get(`SELECT COUNT(*) AS n FROM projects WHERE user_id = ? AND status != 'archived'`, user.id).n,
          openTasks: db.get(`SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND status != 'done'`, user.id).n,
        }
      : null,
    ai: ai.status(),
    banner: getSettings(db).maintenanceBanner || null,
  };
}

/**
 * Shared password sign-in with lockout, used by the app and the admin panel.
 * Responses are identical for unknown e-mails and wrong passwords.
 * @param {import('../app.js').Deps} deps
 * @param {string} email
 * @param {string} password
 */
export async function verifyLogin(deps, email, password) {
  const { db } = deps;
  const user = findByEmail(db, email);
  const generic = new HttpError(401, 'invalid_credentials', 'E-mail or password is incorrect.');
  if (!user) {
    await dummyVerify();
    throw generic;
  }
  const now = Date.now();
  if (user.locked_until && user.locked_until > now) {
    const mins = Math.ceil((user.locked_until - now) / 60000);
    throw new HttpError(429, 'locked', `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    const failed = user.failed_logins + 1;
    db.run('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?', failed, failed % LOCK_AFTER === 0 ? now + LOCK_MS : user.locked_until, user.id);
    throw generic;
  }
  if (user.status === 'blocked') throw forbidden('This account has been suspended. Contact support if you think this is a mistake.', 'blocked');
  db.run('UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = ? WHERE id = ?', now, user.id);
  return user;
}

/** @param {import('../app.js').Deps} deps */
export function authRoutes(deps) {
  const { db, config, mailer } = deps;
  const r = Router();
  const disabled = config.rateLimits.disabled;
  const signupLimit = rateLimit({ windowMs: 3600000, max: 10, disabled, message: 'Too many sign-ups from this network. Try again later.' });
  const loginIpLimit = rateLimit({ windowMs: 15 * 60000, max: 30, disabled, message: 'Too many sign-in attempts. Try again in a few minutes.' });
  const loginEmailLimit = rateLimit({
    windowMs: 15 * 60000,
    max: 10,
    disabled,
    key: (req) => `e:${String(req.body?.email || '').toLowerCase().slice(0, 254)}`,
    message: 'Too many sign-in attempts for this account. Try again in a few minutes.',
  });
  const forgotLimit = rateLimit({ windowMs: 3600000, max: 6, disabled, message: 'Too many reset requests. Try again later.' });

  const signupSchema = z.object({
    name: v.name(),
    email: v.email(),
    password: v.password(),
    timezone: v.timezone().catch('UTC'),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Please accept the Terms and Privacy Policy.' }) }),
    marketing: z.boolean().optional().default(false),
    inviteCode: z.string().trim().max(40).optional().default(''),
  });

  r.post('/signup', signupLimit, async (req, res) => {
    const body = parse(signupSchema, req.body);
    const settings = getSettings(db);
    if (!settings.registrationOpen && !body.inviteCode) {
      throw forbidden('Registration is currently invite-only. Enter your invite code.', 'invite_required');
    }
    const passwordHash = await hashPassword(body.password);
    const { user, redeemed } = db.tx(() => {
      const user = createUser(db, {
        email: body.email,
        name: body.name,
        passwordHash,
        termsVersion: config.termsVersion,
        marketing: body.marketing,
        timezone: body.timezone,
      });
      let redeemed = null;
      if (body.inviteCode) redeemed = redeemInvite(db, config.secret, user, body.inviteCode);
      else if (settings.autoGrant.enabled) {
        const now = Date.now();
        grantAccess(db, { userId: user.id, planId: settings.autoGrant.planId, startsAt: now, endsAt: now + settings.autoGrant.days * DAY_MS, source: 'system', note: 'Automatic access on sign-up' });
      }
      audit(db, { actor: { id: user.id, email: user.email }, action: 'user.signup', targetType: 'user', targetId: user.id, targetLabel: user.email, details: { invite: !!redeemed }, ip: ipPrefix(req.ip) });
      if (redeemed) {
        audit(db, { actor: { id: user.id, email: user.email }, action: 'invite.redeemed', targetType: 'invite', targetId: redeemed.codeId, targetLabel: `…${redeemed.hint}`, details: { planId: redeemed.planId, days: redeemed.accessDays }, ip: ipPrefix(req.ip) });
      }
      return { user, redeemed };
    });
    const s = createSession(db, config, { userId: user.id, scope: 'app', userAgent: req.get('user-agent'), ip: req.ip });
    setSessionCookie(config, res, 'app', s.token, s.maxAgeMs);
    res.status(201).json({ ...sessionPayload(deps, user, db.get('SELECT * FROM sessions WHERE token_hash = ?', sha256(s.token))), invite: redeemed ? { planId: redeemed.planId, days: redeemed.accessDays } : null });
  });

  const loginSchema = z.object({ email: v.email(), password: z.string().min(1).max(128) });
  r.post('/login', loginIpLimit, loginEmailLimit, async (req, res) => {
    const body = parse(loginSchema, req.body);
    const user = await verifyLogin(deps, body.email, body.password);
    if (req.auth?.session) destroySession(db, req.auth.session.id);
    const s = createSession(db, config, { userId: user.id, scope: 'app', userAgent: req.get('user-agent'), ip: req.ip });
    setSessionCookie(config, res, 'app', s.token, s.maxAgeMs);
    res.json(sessionPayload(deps, db.get('SELECT * FROM users WHERE id = ?', user.id), db.get('SELECT * FROM sessions WHERE token_hash = ?', sha256(s.token))));
  });

  r.post(
    '/logout',
    (req, res, next) => (req.auth ? requireCsrf(req, res, next) : next()),
    (req, res) => {
      if (req.auth) destroySession(db, req.auth.session.id);
      clearSessionCookie(config, res, 'app');
      res.json({ ok: true });
    },
  );

  r.get('/session', (req, res) => {
    if (!req.auth) throw unauthorized();
    res.json(sessionPayload(deps, req.auth.user, req.auth.session));
  });

  r.post('/forgot', forgotLimit, async (req, res) => {
    const { email } = parse(z.object({ email: v.email() }), req.body);
    const user = findByEmail(db, email);
    if (user && user.status !== 'blocked') {
      const recent = db.get('SELECT COUNT(*) AS n FROM password_resets WHERE user_id = ? AND created_at > ?', user.id, Date.now() - 3600000).n;
      if (recent < 3) {
        const token = randomToken(32);
        db.run('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL', Date.now(), user.id);
        db.run('INSERT INTO password_resets (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)', user.id, sha256(token), Date.now() + RESET_TTL_MS, Date.now());
        await mailer.passwordReset(user.email, `${config.baseUrl}/reset-password?token=${encodeURIComponent(token)}`);
      }
    } else {
      await dummyVerify();
    }
    res.json({ ok: true, message: 'If an account exists for that address, a reset link is on its way.' });
  });

  r.post('/reset', forgotLimit, async (req, res) => {
    const body = parse(z.object({ token: z.string().min(20).max(100), password: v.password() }), req.body);
    const row = db.get('SELECT * FROM password_resets WHERE token_hash = ?', sha256(body.token));
    if (!row || row.used_at || row.expires_at <= Date.now()) throw badRequest('This reset link is invalid or has expired. Request a new one.');
    const hash = await hashPassword(body.password);
    db.tx(() => {
      db.run('UPDATE password_resets SET used_at = ? WHERE id = ?', Date.now(), row.id);
      db.run('UPDATE users SET password_hash = ?, password_changed_at = ?, failed_logins = 0, locked_until = NULL, updated_at = ? WHERE id = ?', hash, Date.now(), Date.now(), row.user_id);
      destroyUserSessions(db, row.user_id);
      audit(db, { actor: null, action: 'user.password_reset', targetType: 'user', targetId: row.user_id, targetLabel: db.get('SELECT email FROM users WHERE id = ?', row.user_id)?.email, ip: ipPrefix(req.ip) });
    });
    clearSessionCookie(config, res, 'app');
    res.json({ ok: true });
  });

  return r;
}
