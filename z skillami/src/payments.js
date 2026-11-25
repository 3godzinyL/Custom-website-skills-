import { randomToken, sha256, safeEqual, hmacHex, validEmail, validNip, linkKey } from './security.js';
import { now, tx } from './db.js';
import { enqueueEmail } from './emails.js';
import { HttpError } from './http.js';

export const PRODUCT = {
  id: 'founder-plus-12m',
  price: 9900, // grosze — price is decided here, never by the client
  name: { pl: 'Pakiet założycielski: Ogarnij Plus na 12 miesięcy', en: 'Founder pack: Ogarnij Plus for 12 months' },
};
const TOLERANCE_S = 300;
const RESERVE_MS = 30 * 60_000;

export function formatMoney(grosze, lang = 'pl') {
  const v = (grosze / 100).toFixed(2);
  return lang === 'en' ? `PLN ${v}` : `${v.replace('.', ',')} zł`;
}

function codeRow(db, code) {
  if (!code) return null;
  const c = String(code).trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,24}$/.test(c)) return null;
  const row = db.prepare('SELECT * FROM discount_codes WHERE code = ? AND active = 1').get(c);
  if (!row) return null;
  if (row.expires_at && row.expires_at < now()) return null;
  if (row.max_uses != null) {
    // Unpaid orders from the last 30 min hold the code, so one single-use code can't be paid twice in parallel.
    const held = db.prepare("SELECT COUNT(*) n FROM orders WHERE discount_code = ? AND status = 'pending' AND created_at > ?").get(c, now() - RESERVE_MS).n;
    if (row.used + held >= row.max_uses) return null;
  }
  return row;
}

export function quote(db, code) {
  const row = codeRow(db, code);
  const discount = row ? Math.round((PRODUCT.price * row.percent) / 100) : 0;
  return { base: PRODUCT.price, discount, amount: PRODUCT.price - discount, code: row?.code ?? null, percent: row?.percent ?? 0, currency: 'pln' };
}

// --- signatures (same scheme as Stripe: t=<unix>,v1=<hmac(t.payload)>) ---
export function signPayload(secret, raw, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${hmacHex(secret, `${t}.${raw}`)}`;
}
export function verifySignature(secret, raw, header, nowS = Math.floor(Date.now() / 1000)) {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(String(header).split(',').map((p) => p.split('=').map((s) => s.trim())));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(nowS - t) > TOLERANCE_S) return false;
  const expected = hmacHex(secret, `${t}.${raw}`);
  return String(header).split(',').some((p) => { const [k, v] = p.split('=').map((s) => s.trim()); return k === 'v1' && safeEqual(v, expected); });
}

export function createPayments(config, log) {
  const P = config.payments;

  async function stripe(pathname, params) {
    const r = await fetch(`https://api.stripe.com/v1/${pathname}`, {
      method: params ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${P.stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params ? new URLSearchParams(params) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(`stripe ${r.status}: ${body?.error?.message || ''}`);
    return body;
  }

  const orderKey = (publicId) => linkKey(config.appSecret, 'order', publicId);

  function orderUrl(o, key) {
    return `${config.baseUrl}${o.lang === 'en' ? '/en' : ''}/zamowienie/${o.public_id}?key=${key}`;
  }

  async function createOrder(db, input) {
    const email = String(input.email || '').trim();
    if (!validEmail(email)) throw new HttpError(422, 'invalid_email');
    if (input.acceptTerms !== true) throw new HttpError(422, 'terms_required');
    const name = String(input.name || '').trim().slice(0, 120) || null;
    const nip = input.nip ? String(input.nip).replace(/[\s-]/g, '') : null;
    if (nip && !validNip(nip)) throw new HttpError(422, 'invalid_nip');
    const lang = input.lang === 'en' ? 'en' : 'pl';
    if (input.code && !codeRow(db, input.code)) throw new HttpError(422, 'invalid_code');
    const q = quote(db, input.code);

    const publicId = 'OG-' + randomToken(6).replace(/[-_]/g, 'X').toUpperCase().slice(0, 8);
    const key = orderKey(publicId);
    const t = now();
    const id = db.prepare(`INSERT INTO orders(public_id, key_hash, email, name, nip, lang, product, base_amount, discount_code, discount_amount,
      amount, currency, provider, terms_accepted_at, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(publicId, sha256(key), email, name, nip, lang, PRODUCT.id, q.base, q.code, q.discount, q.amount, q.currency, P.provider, t, t).lastInsertRowid;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    let redirectUrl, ref;
    if (P.provider === 'stripe') {
      const s = await stripe('checkout/sessions', {
        mode: 'payment',
        customer_email: email,
        'line_items[0][quantity]': '1',
        'line_items[0][price_data][currency]': 'pln',
        'line_items[0][price_data][unit_amount]': String(q.amount),
        'line_items[0][price_data][product_data][name]': PRODUCT.name[lang],
        'metadata[order_id]': publicId,
        success_url: orderUrl(order, key),
        cancel_url: orderUrl(order, key),
      });
      redirectUrl = s.url; ref = s.id;
    } else {
      ref = 'sb_' + randomToken(12);
      redirectUrl = `${config.baseUrl}/platnosc-testowa/${publicId}?key=${key}`;
    }
    db.prepare('UPDATE orders SET provider_ref = ? WHERE id = ?').run(ref, id);
    enqueueEmail(db, { to: email, kind: 'order_created', lang, baseUrl: config.baseUrl,
      data: { orderId: publicId, amount: formatMoney(q.amount, lang), orderUrl: orderUrl(order, key) }, delayMs: 30 * 60_000 });
    return { orderId: publicId, redirectUrl, amount: q.amount };
  }

  function orderByKey(db, publicId, key) {
    const o = db.prepare('SELECT * FROM orders WHERE public_id = ?').get(String(publicId || ''));
    if (!o || !key || !safeEqual(o.key_hash, sha256(key))) return null;
    return o;
  }

  /** Single place where an order becomes paid. Called only after signature verification. */
  function applyEvent(db, provider, evt) {
    return tx(db, () => {
      const seen = db.prepare('INSERT OR IGNORE INTO webhook_events(provider, event_id, received_at) VALUES(?,?,?)').run(provider, evt.id, now());
      if (seen.changes === 0) return { ok: true, duplicate: true };
      const o = db.prepare('SELECT * FROM orders WHERE public_id = ?').get(evt.orderId);
      if (!o) return { ok: false, reason: 'unknown_order' };
      if (o.provider !== provider || o.provider_ref !== evt.ref) return { ok: false, reason: 'ref_mismatch' };
      if (evt.type === 'failed') {
        if (o.status === 'pending') db.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").run(o.id);
        return { ok: true };
      }
      if (evt.amount !== o.amount || String(evt.currency).toLowerCase() !== o.currency) return { ok: false, reason: 'amount_mismatch' };
      if (o.status === 'paid') return { ok: true };
      if (!['pending', 'failed'].includes(o.status)) return { ok: false, reason: 'bad_state' };
      db.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?").run(now(), o.id);
      if (o.discount_code) db.prepare('UPDATE discount_codes SET used = used + 1 WHERE code = ?').run(o.discount_code);
      // The pending "finish your payment" reminder is no longer needed.
      db.prepare("UPDATE emails SET cancelled_at = ? WHERE kind = 'order_created' AND to_addr = ? AND sent_at IS NULL AND html LIKE ?")
        .run(now(), o.email, `%${o.public_id}%`);
      const key = orderKey(o.public_id);
      enqueueEmail(db, { to: o.email, kind: 'order_paid', lang: o.lang, baseUrl: config.baseUrl,
        data: { orderId: o.public_id, amount: formatMoney(o.amount, o.lang), orderUrl: orderUrl(o, key) } });
      return { ok: true, paid: true };
    });
  }

  function handleWebhook(db, provider, raw, header) {
    const secret = provider === 'stripe' ? P.stripeWebhookSecret : P.sandboxSecret;
    if (!verifySignature(secret, raw, header)) throw new HttpError(400, 'bad_signature');
    let body;
    try { body = JSON.parse(raw); } catch { throw new HttpError(400, 'bad_json'); }
    let evt;
    if (provider === 'stripe') {
      const obj = body?.data?.object || {};
      const types = { 'checkout.session.completed': 'paid', 'checkout.session.async_payment_succeeded': 'paid', 'checkout.session.async_payment_failed': 'failed' };
      const type = types[body.type];
      if (!type) return { ok: true, ignored: true };
      if (type === 'paid' && obj.payment_status !== 'paid') return { ok: true, ignored: true };
      evt = { id: body.id, type, orderId: obj.metadata?.order_id, ref: obj.id, amount: obj.amount_total, currency: obj.currency };
    } else {
      const d = body.data || {};
      evt = { id: body.id, type: body.type === 'payment.succeeded' ? 'paid' : 'failed', orderId: d.order_id, ref: d.ref, amount: d.amount, currency: d.currency };
    }
    if (!evt.id || !evt.orderId) throw new HttpError(400, 'bad_event');
    const r = applyEvent(db, provider, evt);
    if (!r.ok) {
      log.error('webhook', new Error(`${provider} ${r.reason} ${evt.orderId}`));
      throw new HttpError(400, r.reason);
    }
    return r;
  }

  /** Sandbox "payment provider": builds a signed event and sends it through the same verification path. */
  function sandboxPay(db, publicId, key, outcome) {
    if (P.provider !== 'sandbox') throw new HttpError(404, 'not_found');
    const o = orderByKey(db, publicId, key);
    if (!o) throw new HttpError(404, 'not_found');
    const raw = JSON.stringify({
      id: 'evt_' + randomToken(10),
      type: outcome === 'success' ? 'payment.succeeded' : 'payment.failed',
      data: { order_id: o.public_id, ref: o.provider_ref, amount: o.amount, currency: o.currency },
    });
    return handleWebhook(db, 'sandbox', raw, signPayload(P.sandboxSecret, raw));
  }

  async function refund(db, orderId) {
    const o = db.prepare('SELECT * FROM orders WHERE public_id = ?').get(orderId);
    if (!o) throw new HttpError(404, 'not_found');
    if (o.status !== 'paid') throw new HttpError(409, 'not_paid');
    if (o.provider === 'stripe') {
      const s = await stripe(`checkout/sessions/${encodeURIComponent(o.provider_ref)}`);
      await stripe('refunds', { payment_intent: s.payment_intent });
    }
    const key = orderKey(o.public_id);
    db.prepare("UPDATE orders SET status = 'refunded', refunded_at = ? WHERE id = ?").run(now(), o.id);
    if (o.discount_code) db.prepare('UPDATE discount_codes SET used = MAX(0, used - 1) WHERE code = ?').run(o.discount_code);
    enqueueEmail(db, { to: o.email, kind: 'order_refunded', lang: o.lang, baseUrl: config.baseUrl,
      data: { orderId: o.public_id, amount: formatMoney(o.amount, o.lang), orderUrl: orderUrl(o, key) } });
    return { ok: true };
  }

  return { createOrder, orderByKey, orderKey, handleWebhook, sandboxPay, refund, quote: (db, c) => quote(db, c) };
}
