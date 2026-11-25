import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp } from './helpers.js';

let t;
before(async () => { t = await startTestApp(); });
after(async () => { await t.close(); });

test('security headers on every response', async () => {
  for (const url of ['/', '/api/waitlist/stats', '/nie-ma-takiej']) {
    const r = await t.req('GET', url);
    assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
    assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  }
});

test('404 for pages and API', async () => {
  assert.equal((await t.req('GET', '/nie-ma')).status, 404);
  const api = await t.req('GET', '/api/nie-ma');
  assert.equal(api.status, 404);
  assert.equal(api.data.error, 'not_found');
});

test('static files cannot escape public/ or expose dotfiles', async () => {
  for (const p of ['/..%2f..%2fpackage.json', '/%2e%2e/server.js', '/.env', '/..\\server.js']) {
    const r = await t.req('GET', p);
    assert.notEqual(r.status, 200, p);
  }
});

test('A/B variant can be forced for QA and is rendered', async () => {
  for (const v of ['a', 'b', 'c']) {
    const r = await t.req('GET', `/?v=${v}`);
    assert.match(r.text, new RegExp(`data-variant="${v}"`));
  }
});

test('robots and sitemap', async () => {
  const robots = await t.req('GET', '/robots.txt');
  assert.match(robots.text, /Disallow: \/admin/);
  const sm = await t.req('GET', '/sitemap.xml');
  assert.match(sm.text, /\/poradnik\/plan-b-kiedy-dzien-sie-sypie/);
});

test('blog renders published posts', async () => {
  assert.equal((await t.req('GET', '/poradnik')).status, 200);
  assert.equal((await t.req('GET', '/poradnik/pierwszy-krok-10-minut')).status, 200);
  assert.equal((await t.req('GET', '/poradnik/nie-istnieje')).status, 404);
});

test('events: only whitelisted names are counted, bots ignored', async () => {
  const send = (name, ua = 'Mozilla/5.0') => t.req('POST', '/api/e', { body: { name, variant: 'b', lang: 'pl' }, headers: { 'User-Agent': ua } });
  await send('demo_run'); await send('demo_run'); await send('hack_me'); await send('demo_run', 'Googlebot');
  const n = t.app.db.prepare("SELECT SUM(count) n FROM events_daily WHERE name = 'demo_run'").get().n;
  assert.equal(n, 2);
  assert.equal(t.app.db.prepare("SELECT COUNT(*) n FROM events_daily WHERE name = 'hack_me'").get().n, 0);
});

test('healthz', async () => {
  const r = await t.req('GET', '/healthz');
  assert.equal(r.data.ok, true);
});

test('jobs: cleanup and backup', async () => {
  const { cleanup, backupDb } = await import('../src/jobs.js');
  t.app.db.prepare("INSERT INTO subscribers(email, email_key, status, created_at) VALUES('stary@x.pl', 'stary@x.pl', 'pending', 0)").run();
  assert.ok(cleanup(t.app.db).pending >= 1);
  const fs = await import('node:fs');
  const file = backupDb(t.app.db, t.app.config);
  assert.ok(fs.statSync(file).size > 0);
});
