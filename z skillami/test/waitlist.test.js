import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, tokenFrom } from './helpers.js';

let t;
before(async () => { t = await startTestApp(); });
after(async () => { await t.close(); });

async function signupAndConfirm(email, extra = {}) {
  const r = await t.req('POST', '/api/waitlist', { body: { email, lang: 'pl', ...extra } });
  assert.equal(r.status, 200, r.text);
  const mail = t.lastEmail(email, 'confirm');
  assert.ok(mail, 'confirmation e-mail queued');
  const token = tokenFrom(mail.html, 'token');
  const c = await t.req('POST', '/api/waitlist/confirm', { body: { token } });
  assert.equal(c.data.ok, true, c.text);
  return { key: decodeURIComponent(c.data.next.split('key=')[1]) };
}

test('signup → confirm → queue position and private page', async () => {
  const { key } = await signupAndConfirm('ola@poczta.pl', { consentMarketing: true });
  const me = await t.req('GET', `/api/waitlist/me?key=${encodeURIComponent(key)}`);
  assert.equal(me.status, 200);
  assert.equal(me.data.position, 1);
  assert.match(me.data.refUrl, /\?ref=[A-Za-z0-9]+$/);
  const page = await t.req('GET', `/kolejka?key=${encodeURIComponent(key)}`);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
  // welcome + 2 drip e-mails for marketing consent
  const kinds = t.app.db.prepare("SELECT kind FROM emails WHERE to_addr = 'ola@poczta.pl' ORDER BY id").all().map((r) => r.kind);
  assert.deepEqual(kinds, ['confirm', 'welcome', 'drip3', 'drip7']);
});

test('confirmation token works once and wrong tokens fail', async () => {
  await t.req('POST', '/api/waitlist', { body: { email: 'raz@poczta.pl' } });
  const token = tokenFrom(t.lastEmail('raz@poczta.pl', 'confirm').html, 'token');
  assert.equal((await t.req('POST', '/api/waitlist/confirm', { body: { token } })).data.ok, true);
  assert.equal((await t.req('POST', '/api/waitlist/confirm', { body: { token } })).data.ok, false);
  assert.equal((await t.req('POST', '/api/waitlist/confirm', { body: { token: 'x'.repeat(43) } })).data.reason, 'invalid');
});

test('referrals move the referrer up by 5 places', async () => {
  const keys = [];
  for (let i = 0; i < 6; i++) keys.push((await signupAndConfirm(`kolejka${i}@firma.pl`)).key);
  const last = keys[5];
  const before = (await t.req('GET', `/api/waitlist/me?key=${encodeURIComponent(last)}`)).data;
  const ref = before.refUrl.split('ref=')[1];
  await signupAndConfirm('znajomy@firma.pl', { ref });
  const afterMe = (await t.req('GET', `/api/waitlist/me?key=${encodeURIComponent(last)}`)).data;
  assert.equal(afterMe.referrals, 1);
  assert.equal(afterMe.position, Math.max(1, before.position - 5));
});

test('aliases and repeat signups do not create extra spots or reveal membership', async () => {
  const a = await t.req('POST', '/api/waitlist', { body: { email: 'Jan.Kowal+1@gmail.com' } });
  const b = await t.req('POST', '/api/waitlist', { body: { email: 'jankowal@gmail.com' } });
  const c = await t.req('POST', '/api/waitlist', { body: { email: 'ola@poczta.pl' } }); // already confirmed
  assert.deepEqual([a.status, b.status, c.status], [200, 200, 200]);
  assert.deepEqual(a.data, b.data);
  assert.deepEqual(a.data, c.data);
  assert.equal(t.app.db.prepare("SELECT COUNT(*) n FROM subscribers WHERE email_key = 'jankowal@gmail.com'").get().n, 1);
});

test('honeypot is silently ignored', async () => {
  const r = await t.req('POST', '/api/waitlist', { body: { email: 'bot@spam.pl', website: 'http://spam' } });
  assert.equal(r.status, 200);
  assert.equal(t.app.db.prepare("SELECT COUNT(*) n FROM subscribers WHERE email = 'bot@spam.pl'").get().n, 0);
});

test('invalid input, wrong content type and cross-site origin are rejected', async () => {
  assert.equal((await t.req('POST', '/api/waitlist', { body: { email: 'nie-mail' } })).status, 422);
  assert.equal((await t.req('POST', '/api/waitlist', { form: { email: 'a@b.pl' } })).status, 415);
  const cross = await t.req('POST', '/api/waitlist', { body: { email: 'x@y.pl' }, headers: { Origin: 'https://evil.example' } });
  assert.equal(cross.status, 403);
});

test('survey accepts only known answers', async () => {
  const { key } = await signupAndConfirm('ankieta@poczta.pl');
  assert.equal((await t.req('POST', '/api/survey', { body: { key, answer: 'kartki' } })).status, 200);
  assert.equal((await t.req('POST', '/api/survey', { body: { key, answer: '<b>x</b>' } })).status, 422);
  assert.equal((await t.req('POST', '/api/survey', { body: { key: 'zly', answer: 'kartki' } })).status, 404);
});

test('unsubscribe is a POST and cancels scheduled e-mails', async () => {
  const { key } = await signupAndConfirm('wypis@poczta.pl', { consentMarketing: true });
  const page = await t.req('GET', `/wypisz?key=${encodeURIComponent(key)}`);
  assert.equal(page.status, 200);
  assert.equal(t.app.db.prepare("SELECT status FROM subscribers WHERE email = 'wypis@poczta.pl'").get().status, 'confirmed', 'GET alone does nothing');
  const r = await t.req('POST', '/wypisz', { form: { key } });
  assert.equal(r.status, 200);
  const s = t.app.db.prepare("SELECT * FROM subscribers WHERE email = 'wypis@poczta.pl'").get();
  assert.equal(s.status, 'unsubscribed');
  const pending = t.app.db.prepare('SELECT COUNT(*) n FROM emails WHERE subscriber_id = ? AND sent_at IS NULL AND cancelled_at IS NULL').get(s.id).n;
  assert.equal(pending, 0);
});

test('public counter is hidden below threshold and rounded above it', async () => {
  const r = await t.req('GET', '/api/waitlist/stats');
  assert.equal(r.status, 200);
  const n = t.app.db.prepare("SELECT COUNT(*) n FROM subscribers WHERE status = 'confirmed'").get().n;
  assert.equal(r.data.count, Math.floor(n / 10) * 10);
});

test('signup rate limit per IP and per address (real limits)', async () => {
  const s = await startTestApp({ RATE_LIMIT_SCALE: '1' });
  try {
    const r1 = [];
    for (let i = 0; i < 4; i++) r1.push((await s.req('POST', '/api/waitlist', { body: { email: 'jeden@poczta.pl' } })).status);
    assert.deepEqual(r1, [200, 200, 200, 200], 'same answer even when the per-address limit stops mailing');
    assert.equal(s.app.db.prepare("SELECT COUNT(*) n FROM emails WHERE to_addr = 'jeden@poczta.pl'").get().n, 3);
    let last;
    for (let i = 0; i < 4; i++) last = await s.req('POST', '/api/waitlist', { body: { email: `limit${i}@poczta.pl` } });
    assert.equal(last.status, 429);
    assert.ok(last.headers.get('retry-after'));
  } finally { await s.close(); }
});
