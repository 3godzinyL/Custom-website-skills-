import fs from 'node:fs';
import path from 'node:path';
import {
  randomToken, sha256, safeEqual, hashPassword, verifyPassword, DUMMY_HASH, newTotpSecret, totpMatch, validEmail, csvCell,
} from './security.js';
import { now, kvGet } from './db.js';
import { HttpError, readJson, json, send, parseCookies, serializeCookie, clientIp } from './http.js';
import { abResults, funnel } from './analytics.js';
import { listPosts, savePost } from './blog.js';
import { SURVEY_OPTIONS, positionsMap } from './waitlist.js';

// Viewers (read-only role) see masked personal data; editors and owners see it in full.
const maskEmail = (e) => String(e).replace(/^(.)[^@]*(@.).*?(\.[^.]+)$/, '$1***$2***$3');
const privacy = (req, rows, fields) => (req.user.role === 'viewer' ? rows.map((r) => { const o = { ...r }; for (const f of fields) if (o[f]) o[f] = f === 'nip' || f === 'name' ? '***' : maskEmail(o[f]); return o; }) : rows);
import { cancelPendingEmails } from './emails.js';

export const ROLES = { viewer: 1, editor: 2, owner: 3 };
const COOKIE = 'og_admin';
const SESSION_TTL = 8 * 3600_000;
const LOCK_AFTER = 8;
const LOCK_MS = 15 * 60_000;

export function ensureOwner(db, config, log) {
  if (db.prepare('SELECT COUNT(*) n FROM users').get().n) return null;
  const email = config.admin.email || 'admin@ogarnij.local';
  const password = config.admin.password || randomToken(15);
  db.prepare('INSERT INTO users(email, name, role, pass_hash, created_at) VALUES(?,?,?,?,?)')
    .run(email.toLowerCase(), 'Właściciel', 'owner', hashPassword(password), now());
  if (!config.admin.password) {
    // Shown once, locally. Change it after the first login (Panel → Konto).
    const f = path.join(config.dataDir, 'PIERWSZE-LOGOWANIE.txt');
    fs.writeFileSync(f, `Panel: ${config.baseUrl}/admin\nE-mail: ${email}\nHasło: ${password}\n\nZmień hasło po pierwszym logowaniu i usuń ten plik.\n`, { mode: 0o600 });
    log.info(`Utworzono konto właściciela panelu. Dane logowania: ${f}`);
  }
  return { email, password };
}

export function registerAdmin(router, ctx) {
  const { db, config, limiter, payments, log } = ctx;

  const audit = (req, action, target = '', details = '') =>
    db.prepare('INSERT INTO audit_log(user_id, user_email, action, target, details, ip, created_at) VALUES(?,?,?,?,?,?,?)')
      .run(req.user?.id ?? null, req.user?.email ?? null, action, String(target), typeof details === 'string' ? details : JSON.stringify(details), clientIp(req, config.trustProxy), now());

  function setSession(res, userId, pending2fa, req) {
    const id = randomToken();
    const csrf = randomToken(24);
    const t = now();
    db.prepare('INSERT INTO sessions(id_hash, user_id, csrf, pending_2fa, created_at, expires_at, ip, ua) VALUES(?,?,?,?,?,?,?,?)')
      .run(sha256(id), userId, csrf, pending2fa ? 1 : 0, t, t + (pending2fa ? 5 * 60_000 : SESSION_TTL), clientIp(req, config.trustProxy), String(req.headers['user-agent'] || '').slice(0, 200));
    res.setHeader('Set-Cookie', serializeCookie(COOKIE, id, { sameSite: 'Strict', secure: config.production, maxAge: SESSION_TTL / 1000 }));
    return csrf;
  }
  function getSession(req) {
    const id = parseCookies(req.headers.cookie)[COOKIE];
    if (!id) return null;
    const s = db.prepare('SELECT * FROM sessions WHERE id_hash = ? AND expires_at > ?').get(sha256(id), now());
    return s || null;
  }
  function clearSession(req, res) {
    const id = parseCookies(req.headers.cookie)[COOKIE];
    if (id) db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(sha256(id));
    res.setHeader('Set-Cookie', serializeCookie(COOKIE, '', { sameSite: 'Strict', secure: config.production, maxAge: 0 }));
  }

  const auth = (minRole = 'viewer') => (req) => {
    const s = getSession(req);
    if (!s || s.pending_2fa) throw new HttpError(401, 'unauthorized');
    const u = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(s.user_id);
    if (!u) throw new HttpError(401, 'unauthorized');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const tok = req.headers['x-csrf-token'];
      if (!tok || !safeEqual(tok, s.csrf)) throw new HttpError(403, 'csrf');
    }
    if (ROLES[u.role] < ROLES[minRole]) throw new HttpError(403, 'forbidden');
    req.user = u;
    req.session = s;
  };

  const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, totpEnabled: !!u.totp_enabled, active: !!u.active, lastLoginAt: u.last_login_at });

  // ---- login / logout / 2FA ----
  router.post('/api/admin/login', async (req, res) => {
    const ip = clientIp(req, config.trustProxy);
    const body = await readJson(req, 4096);
    const email = String(body.email || '').trim().toLowerCase();
    const r1 = limiter.hit(`login-ip:${ip}`, 10, 15 * 60_000);
    const r2 = limiter.hit(`login-em:${email}`, 6, 15 * 60_000);
    if (!r1.ok || !r2.ok) throw new HttpError(429, 'rate_limited', null, { retryAfter: Math.max(r1.retryAfter, r2.retryAfter) });
    const u = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);
    const ok = verifyPassword(String(body.password || ''), u?.pass_hash || DUMMY_HASH);
    // Same answer as the rate limit, so a lock doesn't confirm that the account exists.
    if (u && u.locked_until && u.locked_until > now()) throw new HttpError(429, 'rate_limited', null, { retryAfter: Math.ceil((u.locked_until - now()) / 1000) });
    if (!u || !ok) {
      if (u) {
        const n = u.failed_logins + 1;
        db.prepare('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?').run(n, n >= LOCK_AFTER ? now() + LOCK_MS : null, u.id);
      }
      throw new HttpError(401, 'bad_credentials');
    }
    db.prepare('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?').run(u.id);
    clearSession(req, res);
    if (u.totp_enabled) { setSession(res, u.id, true, req); return json(res, 200, { twoFactor: true }); }
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now(), u.id);
    const csrf = setSession(res, u.id, false, req);
    req.user = u; audit(req, 'login');
    json(res, 200, { user: publicUser(u), csrf });
  });

  router.post('/api/admin/login/2fa', async (req, res) => {
    const s = getSession(req);
    if (!s || !s.pending_2fa) throw new HttpError(401, 'unauthorized');
    const ip = clientIp(req, config.trustProxy);
    if (!limiter.hit(`2fa:${ip}`, 8, 15 * 60_000).ok) throw new HttpError(429, 'rate_limited');
    const body = await readJson(req, 1024);
    const u = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(s.user_id);
    // Per-account limit too, so rotating IPs doesn't multiply guesses.
    if (u && !limiter.hit(`2fa-user:${u.id}`, 5, 15 * 60_000).ok) throw new HttpError(429, 'rate_limited');
    const step = u ? totpMatch(u.totp_secret, String(body.code || '')) : null;
    // Each code works once: a code seen by a shoulder-surfer or a phishing proxy can't be replayed.
    if (step == null || step <= u.totp_last_step) throw new HttpError(401, 'bad_code');
    db.prepare('UPDATE users SET totp_last_step = ? WHERE id = ?').run(step, u.id);
    clearSession(req, res);
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now(), u.id);
    const csrf = setSession(res, u.id, false, req);
    req.user = u; audit(req, 'login_2fa');
    json(res, 200, { user: publicUser(u), csrf });
  });

  router.post('/api/admin/logout', (req, res) => { clearSession(req, res); json(res, 200, { ok: true }); });

  router.get('/api/admin/me', auth(), (req, res) => json(res, 200, { user: publicUser(req.user), csrf: req.session.csrf }));

  router.post('/api/admin/password', auth(), async (req, res) => {
    const b = await readJson(req, 2048);
    if (!verifyPassword(String(b.current || ''), req.user.pass_hash)) throw new HttpError(401, 'bad_credentials');
    const next = String(b.next || '');
    if (next.length < 12 || next.length > 200) throw new HttpError(422, 'weak_password');
    db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?').run(hashPassword(next), req.user.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND id_hash != ?').run(req.user.id, req.session.id_hash);
    audit(req, 'password_change');
    json(res, 200, { ok: true });
  });

  router.post('/api/admin/2fa/setup', auth(), (req, res) => {
    if (req.user.totp_enabled) throw new HttpError(409, 'already_enabled');
    const secret = newTotpSecret();
    db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(secret, req.user.id);
    const uri = `otpauth://totp/Ogarnij:${encodeURIComponent(req.user.email)}?secret=${secret}&issuer=Ogarnij`;
    json(res, 200, { secret, uri });
  });
  router.post('/api/admin/2fa/enable', auth(), async (req, res) => {
    const b = await readJson(req, 1024);
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const step = totpMatch(u.totp_secret, String(b.code || ''));
    if (step == null) throw new HttpError(422, 'bad_code');
    db.prepare('UPDATE users SET totp_enabled = 1, totp_last_step = ? WHERE id = ?').run(step, u.id);
    audit(req, '2fa_enable');
    json(res, 200, { ok: true });
  });
  router.post('/api/admin/2fa/disable', auth(), async (req, res) => {
    const b = await readJson(req, 1024);
    if (!verifyPassword(String(b.password || ''), req.user.pass_hash)) throw new HttpError(401, 'bad_credentials');
    db.prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?').run(req.user.id);
    audit(req, '2fa_disable');
    json(res, 200, { ok: true });
  });

  // ---- dashboard ----
  router.get('/api/admin/dashboard', auth(), (req, res) => {
    const by = Object.fromEntries(db.prepare('SELECT status, COUNT(*) n FROM subscribers GROUP BY status').all().map((r) => [r.status, r.n]));
    const created = db.prepare('SELECT COUNT(*) n FROM subscribers').get().n;
    const since = now() - 30 * 86_400_000;
    const daily = db.prepare(`SELECT date(created_at / 1000, 'unixepoch') d, COUNT(*) n, SUM(confirmed_at IS NOT NULL) c
      FROM subscribers WHERE created_at >= ? GROUP BY d ORDER BY d`).all(since);
    const topRef = db.prepare(`SELECT s.id, s.email, COUNT(r.id) refs FROM subscribers s JOIN subscribers r ON r.referred_by = s.id AND r.status = 'confirmed'
      GROUP BY s.id ORDER BY refs DESC LIMIT 10`).all();
    const pos = positionsMap(db);
    for (const r of topRef) r.position = pos.get(r.id) ?? null;
    const referred = db.prepare("SELECT COUNT(*) n FROM subscribers WHERE referred_by IS NOT NULL AND status = 'confirmed'").get().n;
    const survey = Object.fromEntries(SURVEY_OPTIONS.map((o) => [o, 0]));
    for (const r of db.prepare('SELECT survey_answer a, COUNT(*) n FROM subscribers WHERE survey_answer IS NOT NULL GROUP BY a').all()) survey[r.a] = r.n;
    const orders = db.prepare("SELECT COUNT(*) n, COALESCE(SUM(amount), 0) revenue FROM orders WHERE status = 'paid'").get();
    const langs = db.prepare("SELECT lang, COUNT(*) n FROM subscribers WHERE status = 'confirmed' GROUP BY lang").all();
    json(res, 200, {
      totals: { created, confirmed: by.confirmed || 0, pending: by.pending || 0, unsubscribed: by.unsubscribed || 0, referred, marketing: db.prepare("SELECT COUNT(*) n FROM subscribers WHERE consent_marketing = 1 AND status = 'confirmed'").get().n },
      confirmRate: created ? (by.confirmed || 0) / created : 0,
      daily, topReferrers: privacy(req, topRef, ['email']), survey, funnel: funnel(db), ab: abResults(db), orders, langs,
    });
  });

  // ---- subscribers ----
  function subscriberQuery(q) {
    const where = [];
    const args = [];
    if (q.get('status')) { where.push('status = ?'); args.push(q.get('status')); }
    if (q.get('q')) { where.push('email LIKE ?'); args.push(`%${q.get('q').replace(/[%_]/g, '')}%`); }
    return { where: where.length ? 'WHERE ' + where.join(' AND ') : '', args };
  }
  router.get('/api/admin/subscribers', auth(), (req, res) => {
    const q = req.query;
    const { where, args } = subscriberQuery(q);
    const page = Math.max(1, Number(q.get('page')) || 1);
    const per = 50;
    const total = db.prepare(`SELECT COUNT(*) n FROM subscribers ${where}`).get(...args).n;
    const rows = db.prepare(`SELECT id, email, lang, status, consent_marketing, ref_code, referred_by, variant, source, survey_answer, created_at, confirmed_at
      FROM subscribers ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...args, per, (page - 1) * per);
    const pos = positionsMap(db);
    for (const r of rows) {
      r.referrals = db.prepare("SELECT COUNT(*) n FROM subscribers WHERE referred_by = ? AND status = 'confirmed'").get(r.id).n;
      r.position = r.status === 'confirmed' ? pos.get(r.id) ?? null : null;
    }
    json(res, 200, { total, page, per, rows: privacy(req, rows, ['email']) });
  });
  router.get('/api/admin/subscribers.csv', auth('editor'), (req, res) => {
    const { where, args } = subscriberQuery(req.query);
    const rows = db.prepare(`SELECT id, email, lang, status, consent_marketing, ref_code, variant, source, survey_answer, created_at, confirmed_at FROM subscribers ${where} ORDER BY id`).all(...args);
    const head = ['id', 'email', 'jezyk', 'status', 'zgoda_marketing', 'kod_polecajacy', 'wariant', 'zrodlo', 'ankieta', 'zapis', 'potwierdzenie'];
    const iso = (t) => (t ? new Date(t).toISOString() : '');
    const lines = [head.join(';'), ...rows.map((r) => [r.id, r.email, r.lang, r.status, r.consent_marketing, r.ref_code, r.variant, r.source, r.survey_answer, iso(r.created_at), iso(r.confirmed_at)].map(csvCell).join(';'))];
    audit(req, 'export_csv', '', { count: rows.length });
    send(res, 200, '﻿' + lines.join('\r\n'), 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="ogarnij-lista.csv"', 'Cache-Control': 'no-store' });
  });
  router.delete('/api/admin/subscribers/:id', auth('owner'), (req, res) => {
    const s = db.prepare('SELECT id, email FROM subscribers WHERE id = ?').get(Number(req.params.id));
    if (!s) throw new HttpError(404, 'not_found');
    cancelPendingEmails(db, s.id);
    db.prepare('DELETE FROM subscribers WHERE id = ?').run(s.id);
    audit(req, 'subscriber_delete', s.id, { email: s.email.replace(/(^.).*(@.*$)/, '$1***$2') });
    json(res, 200, { ok: true });
  });

  // ---- posts ----
  router.get('/api/admin/posts', auth(), (req, res) => json(res, 200, { rows: listPosts(db, '', { includeDrafts: true }) }));
  router.get('/api/admin/posts/:id', auth(), (req, res) => {
    const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(Number(req.params.id));
    if (!p) throw new HttpError(404, 'not_found');
    json(res, 200, p);
  });
  router.post('/api/admin/posts', auth('editor'), async (req, res) => {
    const id = savePost(db, await readJson(req, 64 * 1024));
    audit(req, 'post_create', id);
    json(res, 201, { id });
  });
  router.put('/api/admin/posts/:id', auth('editor'), async (req, res) => {
    const id = savePost(db, await readJson(req, 64 * 1024), Number(req.params.id));
    audit(req, 'post_update', id);
    json(res, 200, { id });
  });
  router.delete('/api/admin/posts/:id', auth('editor'), (req, res) => {
    const r = db.prepare('DELETE FROM posts WHERE id = ?').run(Number(req.params.id));
    if (!r.changes) throw new HttpError(404, 'not_found');
    audit(req, 'post_delete', req.params.id);
    json(res, 200, { ok: true });
  });

  // ---- discount codes ----
  router.get('/api/admin/codes', auth(), (req, res) => json(res, 200, { rows: db.prepare('SELECT * FROM discount_codes ORDER BY created_at DESC').all() }));
  router.post('/api/admin/codes', auth('editor'), async (req, res) => {
    const b = await readJson(req, 2048);
    const code = String(b.code || '').trim().toUpperCase();
    const percent = Number(b.percent);
    if (!/^[A-Z0-9-]{3,24}$/.test(code)) throw new HttpError(422, 'invalid_code');
    if (!Number.isInteger(percent) || percent < 1 || percent > 90) throw new HttpError(422, 'invalid_percent');
    const maxUses = b.max_uses == null || b.max_uses === '' ? null : Number(b.max_uses);
    if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1)) throw new HttpError(422, 'invalid_max_uses');
    const exp = b.expires_at ? Date.parse(b.expires_at) : null;
    if (b.expires_at && !Number.isFinite(exp)) throw new HttpError(422, 'invalid_date');
    try {
      db.prepare('INSERT INTO discount_codes(code, percent, max_uses, expires_at, created_at) VALUES(?,?,?,?,?)').run(code, percent, maxUses, exp, now());
    } catch (e) { if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'code_taken'); throw e; }
    audit(req, 'code_create', code, { percent, maxUses });
    json(res, 201, { ok: true });
  });
  router.put('/api/admin/codes/:id', auth('editor'), async (req, res) => {
    const b = await readJson(req, 1024);
    const r = db.prepare('UPDATE discount_codes SET active = ? WHERE id = ?').run(b.active ? 1 : 0, Number(req.params.id));
    if (!r.changes) throw new HttpError(404, 'not_found');
    audit(req, b.active ? 'code_enable' : 'code_disable', req.params.id);
    json(res, 200, { ok: true });
  });

  // ---- orders ----
  router.get('/api/admin/orders', auth(), (req, res) => json(res, 200, {
    rows: privacy(req, db.prepare('SELECT id, public_id, email, name, nip, lang, base_amount, discount_code, discount_amount, amount, currency, status, provider, created_at, paid_at, refunded_at FROM orders ORDER BY created_at DESC LIMIT 500').all(), ['email', 'name', 'nip']),
  }));
  router.post('/api/admin/orders/:id/refund', auth('owner'), async (req, res) => {
    const r = await payments.refund(db, req.params.id);
    audit(req, 'order_refund', req.params.id);
    json(res, 200, r);
  });

  // ---- emails, errors, audit, health ----
  router.get('/api/admin/emails', auth(), (req, res) => json(res, 200, {
    rows: privacy(req, db.prepare('SELECT id, to_addr, kind, subject, send_after, sent_at, cancelled_at, attempts, last_error FROM emails ORDER BY id DESC LIMIT 200').all(), ['to_addr']),
  }));
  router.get('/api/admin/audit', auth('owner'), (req, res) => json(res, 200, { rows: db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 300').all() }));
  router.get('/api/admin/health', auth(), (req, res) => {
    let dbSize = 0;
    try { dbSize = fs.statSync(config.dbFile).size; } catch {}
    const q = db.prepare('SELECT SUM(sent_at IS NULL AND cancelled_at IS NULL AND attempts < 5) pending, SUM(sent_at IS NULL AND attempts >= 5) failed FROM emails').get();
    json(res, 200, {
      uptimeS: Math.round(process.uptime()), node: process.version, memoryMb: Math.round(process.memoryUsage().rss / 1048576),
      dbSizeKb: Math.round(dbSize / 1024), emails: { pending: q.pending || 0, failed: q.failed || 0 },
      errors24h: db.prepare('SELECT COUNT(*) n FROM errors WHERE created_at > ?').get(now() - 86_400_000).n,
      lastBackup: kvGet(db, 'last_backup'), mailTransport: config.mail.transport, paymentProvider: config.payments.provider,
      recentErrors: db.prepare('SELECT source, message, path, created_at FROM errors ORDER BY id DESC LIMIT 30').all(),
    });
  });

  // ---- users (owner) ----
  router.get('/api/admin/users', auth('owner'), (req, res) => json(res, 200, { rows: db.prepare('SELECT * FROM users ORDER BY id').all().map(publicUser) }));
  router.post('/api/admin/users', auth('owner'), async (req, res) => {
    const b = await readJson(req, 2048);
    const email = String(b.email || '').trim().toLowerCase();
    const name = String(b.name || '').trim().slice(0, 80);
    if (!validEmail(email) || !name) throw new HttpError(422, 'invalid_user');
    if (!ROLES[b.role]) throw new HttpError(422, 'invalid_role');
    const temp = randomToken(12);
    try {
      db.prepare('INSERT INTO users(email, name, role, pass_hash, created_at) VALUES(?,?,?,?,?)').run(email, name, b.role, hashPassword(temp), now());
    } catch (e) { if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'email_taken'); throw e; }
    audit(req, 'user_create', email, { role: b.role });
    json(res, 201, { ok: true, tempPassword: temp });
  });
  router.put('/api/admin/users/:id', auth('owner'), async (req, res) => {
    const b = await readJson(req, 1024);
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
    if (!u) throw new HttpError(404, 'not_found');
    const role = b.role ?? u.role;
    const active = b.active == null ? u.active : (b.active ? 1 : 0);
    if (!ROLES[role]) throw new HttpError(422, 'invalid_role');
    const owners = db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'owner' AND active = 1").get().n;
    if (u.role === 'owner' && u.active && (role !== 'owner' || !active) && owners <= 1) throw new HttpError(409, 'last_owner');
    db.prepare('UPDATE users SET role = ?, active = ? WHERE id = ?').run(role, active, u.id);
    if (!active) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
    if (b.reset2fa) db.prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?').run(u.id);
    audit(req, 'user_update', u.email, { role, active, reset2fa: !!b.reset2fa });
    json(res, 200, { ok: true });
  });
}
