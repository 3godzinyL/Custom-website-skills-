import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp } from './helpers.js';
import { totpCode } from '../src/security.js';

let t;
before(async () => { t = await startTestApp(); });
after(async () => { await t.close(); });

const login = (email, password) => t.req('POST', '/api/admin/login', { body: { email, password } });

test('admin API requires a session', async () => {
  assert.equal((await t.req('GET', '/api/admin/dashboard', { cookie: false })).status, 401);
  assert.equal((await t.req('GET', '/api/admin/subscribers.csv', { cookie: false })).status, 401);
});

test('wrong password → 401, right one → session with HttpOnly SameSite=Strict cookie', async () => {
  assert.equal((await login('owner@test.local', 'nope')).status, 401);
  assert.equal((await login('nobody@test.local', 'nope')).status, 401);
  const r = await login('owner@test.local', 'owner-password-123');
  assert.equal(r.status, 200);
  const cookie = r.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  t.csrf = r.data.csrf;
  assert.equal((await t.req('GET', '/api/admin/dashboard')).status, 200);
});

test('state changes need the CSRF token', async () => {
  const body = { code: 'ZIMA10', percent: 10 };
  assert.equal((await t.req('POST', '/api/admin/codes', { body })).status, 403);
  assert.equal((await t.req('POST', '/api/admin/codes', { body, headers: { 'X-CSRF-Token': 'zly' } })).status, 403);
  assert.equal((await t.req('POST', '/api/admin/codes', { body, headers: { 'X-CSRF-Token': t.csrf } })).status, 201);
  assert.equal((await t.req('POST', '/api/admin/codes', { body: { code: 'X', percent: 500 }, headers: { 'X-CSRF-Token': t.csrf } })).status, 422);
});

test('CSV export neutralises formulas', async () => {
  t.app.db.prepare("INSERT INTO subscribers(email, email_key, status, survey_answer, created_at) VALUES('=cmd@x.pl', '=cmd@x.pl', 'pending', NULL, 0)").run();
  const r = await t.req('GET', '/api/admin/subscribers.csv');
  assert.equal(r.status, 200);
  assert.match(r.text, /'=cmd@x\.pl/);
});

test('viewer role cannot change or delete anything', async () => {
  const created = await t.req('POST', '/api/admin/users', { body: { email: 'view@test.local', name: 'Podgląd', role: 'viewer' }, headers: { 'X-CSRF-Token': t.csrf } });
  assert.equal(created.status, 201);
  const ownerCookie = t.jar.cookie;
  const r = await t.req('POST', '/api/admin/login', { body: { email: 'view@test.local', password: created.data.tempPassword }, cookie: false });
  t.jar.cookie = r.headers.get('set-cookie').split(';')[0];
  const csrf = r.data.csrf;
  assert.equal((await t.req('GET', '/api/admin/dashboard')).status, 200);
  assert.equal((await t.req('DELETE', '/api/admin/subscribers/1', { headers: { 'X-CSRF-Token': csrf } })).status, 403);
  assert.equal((await t.req('POST', '/api/admin/codes', { body: { code: 'V10', percent: 10 }, headers: { 'X-CSRF-Token': csrf } })).status, 403);
  assert.equal((await t.req('GET', '/api/admin/users')).status, 403);
  t.jar.cookie = ownerCookie;
});

test('last owner cannot be demoted', async () => {
  const me = (await t.req('GET', '/api/admin/me')).data.user;
  const r = await t.req('PUT', `/api/admin/users/${me.id}`, { body: { role: 'viewer' }, headers: { 'X-CSRF-Token': t.csrf } });
  assert.equal(r.status, 409);
});

test('2FA: setup, enable, login needs the code', async () => {
  const s = await t.req('POST', '/api/admin/2fa/setup', { body: {}, headers: { 'X-CSRF-Token': t.csrf } });
  assert.equal(s.status, 200);
  assert.equal((await t.req('POST', '/api/admin/2fa/enable', { body: { code: '000000' }, headers: { 'X-CSRF-Token': t.csrf } })).status, 422);
  assert.equal((await t.req('POST', '/api/admin/2fa/enable', { body: { code: totpCode(s.data.secret) }, headers: { 'X-CSRF-Token': t.csrf } })).status, 200);
  await t.req('POST', '/api/admin/logout', { body: {} });
  const r = await login('owner@test.local', 'owner-password-123');
  assert.equal(r.data.twoFactor, true);
  assert.equal((await t.req('GET', '/api/admin/dashboard')).status, 401, 'half-logged session has no access');
  assert.equal((await t.req('POST', '/api/admin/login/2fa', { body: { code: '000000' } })).status, 401);
  // the code used to enable 2FA can't be replayed; the next time step works
  assert.equal((await t.req('POST', '/api/admin/login/2fa', { body: { code: totpCode(s.data.secret) } })).status, 401, 'replayed code rejected');
  const next = totpCode(s.data.secret, Date.now() + 30_000);
  const ok = await t.req('POST', '/api/admin/login/2fa', { body: { code: next } });
  assert.equal((await t.req('POST', '/api/admin/logout', { body: {} })).status, 200);
  const again = await login('owner@test.local', 'owner-password-123');
  assert.equal(again.data.twoFactor, true);
  assert.equal((await t.req('POST', '/api/admin/login/2fa', { body: { code: next } })).status, 401, 'same code cannot log in twice');
  assert.equal(ok.status, 200);
  // the next valid code appears only in 30 s — switch 2FA off in the DB so later tests keep an owner session
  t.app.db.prepare("UPDATE users SET totp_enabled = 0 WHERE email = 'owner@test.local'").run();
  const plain = await login('owner@test.local', 'owner-password-123');
  t.csrf = plain.data.csrf;
  assert.equal((await t.req('GET', '/api/admin/dashboard')).status, 200);
});

test('refund (owner) changes status and e-mails the buyer', async () => {
  const r = await t.req('POST', '/api/orders', { body: { email: 'zwrot@poczta.pl', acceptTerms: true } });
  const key = decodeURIComponent(r.data.redirectUrl.split('key=')[1]);
  await t.req('POST', '/api/sandbox/pay', { body: { orderId: r.data.orderId, key, outcome: 'success' } });
  const f = await t.req('POST', `/api/admin/orders/${r.data.orderId}/refund`, { body: {}, headers: { 'X-CSRF-Token': t.csrf } });
  assert.equal(f.status, 200, f.text);
  assert.equal(t.app.db.prepare('SELECT status FROM orders WHERE public_id = ?').get(r.data.orderId).status, 'refunded');
  assert.ok(t.lastEmail('zwrot@poczta.pl', 'order_refunded'));
  assert.equal((await t.req('POST', `/api/admin/orders/${r.data.orderId}/refund`, { body: {}, headers: { 'X-CSRF-Token': t.csrf } })).status, 409);
});

test('audit log records admin actions', async () => {
  const r = await t.req('GET', '/api/admin/audit');
  const actions = r.data.rows.map((x) => x.action);
  for (const a of ['login', 'code_create', 'export_csv', 'user_create', '2fa_enable', 'order_refund']) assert.ok(actions.includes(a), a);
});

test('account locks after repeated failures without revealing it', async () => {
  for (let i = 0; i < 8; i++) await t.req('POST', '/api/admin/login', { body: { email: 'view@test.local', password: 'zle' }, headers: { 'X-Forwarded-For': `10.0.0.${i}` } });
  const r = await login('view@test.local', 'whatever');
  assert.equal(r.status, 429);
});
