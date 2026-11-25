import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp } from './helpers.js';
import { signPayload } from '../src/payments.js';

let t;
before(async () => {
  t = await startTestApp();
  t.app.db.prepare("INSERT INTO discount_codes(code, percent, max_uses, created_at) VALUES('START20', 20, 1, 0)").run();
  t.app.db.prepare("INSERT INTO discount_codes(code, percent, created_at) VALUES('TEST20', 20, 0)").run();
});
after(async () => { await t.close(); });

const order = (body) => t.req('POST', '/api/orders', { body: { email: 'kupujacy@poczta.pl', acceptTerms: true, lang: 'pl', ...body } });
const keyOf = (url) => decodeURIComponent(url.split('key=')[1]);

test('client cannot set the price; discount applied by server', async () => {
  const r = await order({ amount: 1, price: 1, code: 'test20' });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.data.amount, 7920);
  const o = t.app.db.prepare('SELECT * FROM orders WHERE public_id = ?').get(r.data.orderId);
  assert.equal(o.amount, 7920);
  assert.equal(o.status, 'pending');
});

test('an unpaid order holds a single-use code for 30 minutes', async () => {
  t.app.db.prepare("INSERT INTO discount_codes(code, percent, max_uses, created_at) VALUES('RAZ', 50, 1, 0)").run();
  assert.equal((await order({ code: 'RAZ' })).status, 201);
  assert.equal((await order({ code: 'RAZ' })).status, 422, 'second parallel use rejected');
  t.app.db.prepare("UPDATE orders SET created_at = created_at - 31 * 60000 WHERE discount_code = 'RAZ'").run();
  assert.equal((await order({ code: 'RAZ' })).status, 201, 'abandoned order releases the code');
});

test('terms must be accepted, NIP validated, unknown code rejected', async () => {
  assert.equal((await order({ acceptTerms: false })).status, 422);
  assert.equal((await order({ nip: '1234567890' })).status, 422);
  assert.equal((await order({ code: 'NIEMA' })).status, 422);
});

test('sandbox payment marks order paid via signed webhook; code usage counted once', async () => {
  const r = await order({ code: 'START20' });
  const key = keyOf(r.data.redirectUrl);
  const p = await t.req('POST', '/api/sandbox/pay', { body: { orderId: r.data.orderId, key, outcome: 'success' } });
  assert.equal(p.status, 200, p.text);
  const o = t.app.db.prepare('SELECT * FROM orders WHERE public_id = ?').get(r.data.orderId);
  assert.equal(o.status, 'paid');
  assert.equal(t.app.db.prepare("SELECT used FROM discount_codes WHERE code = 'START20'").get().used, 1);
  // code now exhausted
  assert.equal((await order({ code: 'START20' })).status, 422);
  // the order page link from the payment redirect still works
  assert.equal((await t.req('GET', `/zamowienie/${o.public_id}?key=${encodeURIComponent(key)}`)).status, 200);
  assert.equal((await t.req('GET', `/zamowienie/${o.public_id}?key=zly`)).status, 404);
});

test('webhook: bad signature, wrong amount, replay', async () => {
  const r = await order({});
  const o = t.app.db.prepare('SELECT * FROM orders WHERE public_id = ?').get(r.data.orderId);
  const secret = t.app.config.payments.sandboxSecret;
  const send = (evt, sig) => {
    const raw = JSON.stringify(evt);
    return fetch(`${t.base}/api/webhooks/sandbox`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Sandbox-Signature': sig ?? signPayload(secret, raw) }, body: raw });
  };
  const evt = (id, amount) => ({ id, type: 'payment.succeeded', data: { order_id: o.public_id, ref: o.provider_ref, amount, currency: 'pln' } });

  assert.equal((await send(evt('e1', o.amount), 't=1,v1=00')).status, 400);
  assert.equal((await send(evt('e2', 100))).status, 400, 'amount mismatch');
  assert.equal(t.app.db.prepare('SELECT status FROM orders WHERE id = ?').get(o.id).status, 'pending');
  assert.equal((await send({ ...evt('e3', o.amount), data: { ...evt('e3', o.amount).data, ref: 'sb_other' } })).status, 400, 'ref mismatch');
  assert.equal((await send(evt('e4', o.amount))).status, 200);
  assert.equal((await send(evt('e4', o.amount))).status, 200, 'replay is idempotent');
  assert.equal(t.app.db.prepare('SELECT status FROM orders WHERE id = ?').get(o.id).status, 'paid');
  assert.equal(t.app.db.prepare("SELECT COUNT(*) n FROM emails WHERE kind = 'order_paid' AND html LIKE ?").get(`%${o.public_id}%`).n, 1);
});

test('sandbox pay needs the order key', async () => {
  const r = await order({});
  assert.equal((await t.req('POST', '/api/sandbox/pay', { body: { orderId: r.data.orderId, key: 'zly', outcome: 'success' } })).status, 404);
});

test('quote endpoint flags invalid codes', async () => {
  const q = await t.req('GET', '/api/quote?code=NIEMA');
  assert.equal(q.data.invalidCode, true);
  assert.equal(q.data.amount, 9900);
});
