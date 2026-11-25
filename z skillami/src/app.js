import http from 'node:http';
import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { createLog } from './log.js';
import {
  Router, HttpError, readJson, readBody, json, send, redirect, securityHeaders, serveStatic, clientIp, assertSameOrigin,
} from './http.js';
import { RateLimiter, emailKey, validEmail } from './security.js';
import * as waitlist from './waitlist.js';
import { createMailer } from './emails.js';
import { createPayments, formatMoney } from './payments.js';
import { recordEvent, recordError, pickVariant, isBot, CLIENT_EVENTS } from './analytics.js';
import { listPosts, getPost, renderMarkdown, seedPosts } from './blog.js';
import { registerAdmin, ensureOwner } from './admin.js';
import { startJobs } from './jobs.js';
import { createPages } from './pages.js';

async function readForm(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/x-www-form-urlencoded')) throw new HttpError(415, 'form_required');
  return new URLSearchParams((await readBody(req, 8192)).toString('utf8'));
}

export function createApp(overrides = {}, { quiet = false } = {}) {
  const config = loadConfig(overrides);
  const log = createLog(config, { quiet });
  const db = openDb(config.dbFile);
  log.setErrorSink((scope, err) => recordError(db, 'server', `${scope}: ${err?.message || err}`, err?.stack));
  seedPosts(db);
  const owner = ensureOwner(db, config, log);
  const limiter = new RateLimiter(config.rateScale);
  const mailer = createMailer(config, log);
  const payments = createPayments(config, log);
  const pages = createPages({ config });
  const router = new Router();
  const ctx = { db, config, log, limiter, mailer, payments, pages };

  const limit = (req, name, max, windowMs, extraKey = '') => {
    const r = limiter.hit(`${name}:${clientIp(req, config.trustProxy)}${extraKey}`, max, windowMs);
    if (!r.ok) throw new HttpError(429, 'rate_limited', null, { retryAfter: r.retryAfter });
  };
  const langOf = (pathname) => (pathname.startsWith('/en/') || pathname === '/en' ? 'en' : 'pl');
  const html = (res, body, status = 200, headers = {}) => send(res, status, body, 'text/html; charset=utf-8', { 'Cache-Control': 'no-store', ...headers });

  // ---------- public API ----------
  router.post('/api/waitlist', async (req, res) => {
    assertSameOrigin(req, config.baseUrl);
    limit(req, 'signup', 6, 10 * 60_000);
    const b = await readJson(req, 4096);
    const lang = b.lang === 'en' ? 'en' : 'pl';
    const next = lang === 'en' ? '/en/dziekujemy' : '/dziekujemy';
    // Honeypot: bots fill the hidden field; they get the same answer and nothing is stored.
    if (b.website) return json(res, 200, { ok: true, next });
    if (!validEmail(String(b.email || '').trim())) throw new HttpError(422, 'invalid_email');
    // Per-address limit stops using the form to flood someone's inbox.
    const r = limiter.hit(`signup-mail:${emailKey(String(b.email).trim())}`, 3, 3600_000);
    if (!r.ok) return json(res, 200, { ok: true, next });
    waitlist.signup(db, config, b);
    recordEvent(db, 'waitlist_submit', { variant: b.variant, lang });
    json(res, 200, { ok: true, next });
  });

  router.post('/api/waitlist/confirm', async (req, res) => {
    assertSameOrigin(req, config.baseUrl);
    limit(req, 'confirm', 20, 10 * 60_000);
    const b = await readJson(req, 1024);
    const r = waitlist.confirm(db, config, b.token);
    if (!r.ok) return json(res, 200, { ok: false, reason: r.reason });
    recordEvent(db, 'waitlist_confirm', { lang: r.lang });
    json(res, 200, { ok: true, next: `${r.lang === 'en' ? '/en' : ''}/kolejka?key=${encodeURIComponent(r.key)}` });
  });
  // No-JS fallback for the confirmation page.
  router.post('/potwierdz', async (req, res) => {
    assertSameOrigin(req, config.baseUrl);
    limit(req, 'confirm', 20, 10 * 60_000);
    const f = await readForm(req);
    const r = waitlist.confirm(db, config, f.get('token'));
    if (!r.ok) return html(res, pages.confirm({ lang: f.get('lang') === 'en' ? 'en' : 'pl', token: '', failed: r.reason }), 400);
    recordEvent(db, 'waitlist_confirm', { lang: r.lang });
    redirect(res, `${r.lang === 'en' ? '/en' : ''}/kolejka?key=${encodeURIComponent(r.key)}`);
  });

  router.get('/api/waitlist/stats', (req, res) => json(res, 200, waitlist.publicStats(db, config), { 'Cache-Control': 'public, max-age=60' }));
  router.get('/api/waitlist/me', (req, res) => {
    limit(req, 'me', 60, 60_000);
    const me = waitlist.me(db, config, req.query.get('key'));
    if (!me) throw new HttpError(404, 'not_found');
    json(res, 200, me);
  });
  router.post('/api/survey', async (req, res) => {
    assertSameOrigin(req, config.baseUrl);
    limit(req, 'survey', 10, 10 * 60_000);
    const b = await readJson(req, 1024);
    waitlist.saveSurvey(db, b.key, b.answer);
    recordEvent(db, 'survey_answer');
    json(res, 200, { ok: true });
  });

  router.post('/api/e', async (req, res) => {
    limit(req, 'event', 120, 60_000);
    const b = await readJson(req, 1024);
    const name = String(b.name || '');
    // Server-side events (impressions, signups, payments) can't be sent by the browser — they'd skew the A/B test.
    if (CLIENT_EVENTS.has(name) && !isBot(req.headers['user-agent'])) recordEvent(db, name, { variant: b.variant, lang: b.lang });
    send(res, 204, '');
  });
  router.post('/api/e/error', async (req, res) => {
    limit(req, 'cerr', 10, 60_000);
    const b = await readJson(req, 4096);
    // Global daily cap so anonymous reports can't flood the database or bury real errors.
    if (limiter.hit('cerr-global', 500, 86_400_000).ok) recordError(db, 'client', String(b.message || 'unknown'), `${b.source || ''}:${b.line || ''}`, String(b.path || ''));
    send(res, 204, '');
  });

  // ---------- presale ----------
  router.get('/api/quote', (req, res) => {
    limit(req, 'quote', 20, 60_000);
    const code = req.query.get('code') || '';
    const q = payments.quote(db, code);
    if (code && !q.code) return json(res, 200, { ...q, invalidCode: true });
    json(res, 200, q);
  });
  const presaleOn = () => { if (!config.payments.enabled) throw new HttpError(503, 'presale_unavailable'); };
  const sandboxOn = () => { if (!config.payments.enabled || config.payments.provider !== 'sandbox') throw new HttpError(404, 'not_found'); };
  router.post('/api/orders', async (req, res) => {
    presaleOn();
    assertSameOrigin(req, config.baseUrl);
    limit(req, 'order', 8, 10 * 60_000);
    const b = await readJson(req, 4096);
    const r = await payments.createOrder(db, b);
    recordEvent(db, 'presale_start', { lang: b.lang });
    json(res, 201, r);
  });
  router.post('/api/sandbox/pay', async (req, res) => {
    sandboxOn();
    assertSameOrigin(req, config.baseUrl);
    limit(req, 'sbpay', 20, 10 * 60_000);
    const b = await readJson(req, 1024);
    const r = payments.sandboxPay(db, b.orderId, b.key, b.outcome === 'success' ? 'success' : 'failure');
    if (r.paid) recordEvent(db, 'presale_paid');
    const o = payments.orderByKey(db, b.orderId, b.key);
    json(res, 200, { ok: true, next: `${o.lang === 'en' ? '/en' : ''}/zamowienie/${o.public_id}?key=${encodeURIComponent(b.key)}` });
  });
  for (const provider of ['stripe', 'sandbox']) {
    router.post(`/api/webhooks/${provider}`, async (req, res) => {
      if (provider === 'sandbox') sandboxOn();
      const raw = (await readBody(req, 256 * 1024)).toString('utf8');
      const header = provider === 'stripe' ? req.headers['stripe-signature'] : req.headers['x-sandbox-signature'];
      const r = payments.handleWebhook(db, provider, raw, header);
      if (r.paid) recordEvent(db, 'presale_paid');
      json(res, 200, { received: true });
    });
  }

  // ---------- health ----------
  router.get('/healthz', (req, res) => {
    db.prepare('SELECT 1').get();
    json(res, 200, { ok: true, uptimeS: Math.round(process.uptime()) });
  });

  // ---------- pages ----------
  for (const prefix of ['', '/en']) {
    router.get(prefix + '/', (req, res) => {
      const lang = prefix ? 'en' : 'pl';
      const forced = req.query.get('v');
      const variant = ['a', 'b', 'c'].includes(forced) ? forced : pickVariant();
      if (!forced && !isBot(req.headers['user-agent'])) recordEvent(db, 'hero_impression', { variant, lang });
      const ref = /^[A-Za-z0-9]{4,12}$/.test(req.query.get('ref') || '') ? req.query.get('ref') : '';
      html(res, pages.landing({ lang, variant, count: waitlist.publicStats(db, config).count, ref }));
    });
    router.get(prefix + '/dziekujemy', (req, res) => html(res, pages.thanks({ lang: prefix ? 'en' : 'pl' })));
    router.get(prefix + '/potwierdz', (req, res) => html(res, pages.confirm({ lang: prefix ? 'en' : 'pl', token: req.query.get('token') || '' })));
    router.get(prefix + '/kolejka', (req, res) => {
      limit(req, 'me', 60, 60_000);
      const lang = prefix ? 'en' : 'pl';
      const key = req.query.get('key') || '';
      const me = waitlist.me(db, config, key);
      html(res, pages.queue({ lang, me, key }), me ? 200 : 404, { 'Referrer-Policy': 'no-referrer' });
    });
    router.get(prefix + '/zamow', (req, res) => html(res, pages.presale({ lang: prefix ? 'en' : 'pl', quote: payments.quote(db, ''), provider: config.payments.provider, enabled: config.payments.enabled })));
    router.get(prefix + '/zamowienie/:id', (req, res) => {
      const key = req.query.get('key') || '';
      const o = payments.orderByKey(db, req.params.id, key);
      if (!o) return html(res, pages.notFound({ lang: prefix ? 'en' : 'pl' }), 404);
      html(res, pages.order({ lang: o.lang, order: o, key, money: (v) => formatMoney(v, o.lang) }), 200, { 'Referrer-Policy': 'no-referrer' });
    });
  }
  router.get('/platnosc-testowa/:id', (req, res) => {
    if (config.payments.provider !== 'sandbox' || !config.payments.enabled) return html(res, pages.notFound({ lang: 'pl' }), 404);
    const key = req.query.get('key') || '';
    const o = payments.orderByKey(db, req.params.id, key);
    if (!o) return html(res, pages.notFound({ lang: 'pl' }), 404);
    html(res, pages.sandboxPay({ order: o, key, money: (v) => formatMoney(v, o.lang) }), 200, { 'Referrer-Policy': 'no-referrer' });
  });
  router.get('/wypisz', (req, res) => html(res, pages.unsubscribe({ key: req.query.get('key') || '', done: false }), 200, { 'Referrer-Policy': 'no-referrer' }));
  router.post('/wypisz', async (req, res) => {
    assertSameOrigin(req, config.baseUrl);
    limit(req, 'unsub', 20, 10 * 60_000);
    const f = await readForm(req);
    const ok = waitlist.unsubscribe(db, f.get('key') || req.query.get('key'));
    html(res, pages.unsubscribe({ key: '', done: ok, failed: !ok }), ok ? 200 : 404);
  });
  router.get('/poradnik', (req, res) => html(res, pages.blogIndex({ lang: 'pl', posts: listPosts(db, 'pl') }), 200, { 'Cache-Control': 'public, max-age=300' }));
  router.get('/poradnik/:slug', (req, res) => {
    const p = getPost(db, req.params.slug, 'pl');
    if (!p) return html(res, pages.notFound({ lang: 'pl' }), 404);
    html(res, pages.blogPost({ lang: 'pl', post: p, body: renderMarkdown(p.body_md), more: listPosts(db, 'pl').filter((x) => x.slug !== p.slug).slice(0, 2) }), 200, { 'Cache-Control': 'public, max-age=300' });
  });
  const legal = { '/prywatnosc': ['privacy', 'pl'], '/zasady-listy': ['rules', 'pl'], '/regulamin-przedsprzedazy': ['terms', 'pl'], '/en/privacy': ['privacy', 'en'], '/en/waitlist-rules': ['rules', 'en'], '/en/presale-terms': ['terms', 'en'] };
  for (const [p, [name, lang]] of Object.entries(legal)) router.get(p, (req, res) => html(res, pages.legal({ name, lang }), 200, { 'Cache-Control': 'public, max-age=3600' }));
  router.get('/offline', (req, res) => html(res, pages.offline({ lang: 'pl' })));
  router.get('/admin', (req, res) => html(res, pages.admin(), 200, { 'X-Robots-Tag': 'noindex' }));
  router.get('/en', (req, res) => redirect(res, '/en/', 301));
  router.get('/.well-known/security.txt', (req, res) => send(res, 200, `Contact: mailto:security@ogarnij.example
Expires: 2027-11-30T00:00:00.000Z
Preferred-Languages: pl, en
Canonical: ${config.baseUrl}/.well-known/security.txt
`, 'text/plain; charset=utf-8'));
  router.get('/robots.txt', (req, res) => send(res, 200, `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /kolejka\nDisallow: /zamowienie/\nDisallow: /wypisz\nSitemap: ${config.baseUrl}/sitemap.xml\n`, 'text/plain; charset=utf-8'));
  router.get('/sitemap.xml', (req, res) => {
    const urls = ['/', '/en/', '/poradnik', '/zamow', '/prywatnosc', '/zasady-listy', '/regulamin-przedsprzedazy', ...listPosts(db, 'pl').map((p) => `/poradnik/${p.slug}`)];
    send(res, 200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${config.baseUrl}${u}</loc></url>`).join('\n')}\n</urlset>\n`, 'application/xml; charset=utf-8');
  });

  registerAdmin(router, ctx);

  // ---------- server ----------
  const server = http.createServer(async (req, res) => {
    res.req = req;
    securityHeaders(res, config);
    let url;
    try { url = new URL(req.url, 'http://x'); } catch { return send(res, 400, 'Bad request', 'text/plain'); }
    req.query = url.searchParams;
    const pathname = url.pathname;
    // Behind a TLS-terminating proxy: plain-HTTP requests are sent to HTTPS (HSTS keeps them there).
    if (config.production && config.trustProxy && req.headers['x-forwarded-proto'] === 'http') {
      return redirect(res, `${config.baseUrl}${req.url}`, 308);
    }
    try {
      const m = router.match(req.method, pathname);
      if (m?.handlers) {
        req.params = m.params;
        for (const h of m.handlers) { await h(req, res); if (res.writableEnded || res.headersSent) break; }
        return;
      }
      if ((req.method === 'GET' || req.method === 'HEAD') && serveStatic(config.publicDir, req, res, pathname)) return;
      if (m?.methodNotAllowed) throw new HttpError(405, 'method_not_allowed');
      if (pathname.startsWith('/api/')) throw new HttpError(404, 'not_found');
      html(res, pages.notFound({ lang: langOf(pathname) }), 404);
    } catch (err) {
      if (err instanceof HttpError) {
        const headers = err.extra?.retryAfter ? { 'Retry-After': String(err.extra.retryAfter) } : {};
        if (pathname.startsWith('/api/')) return json(res, err.status, { error: err.code }, headers);
        return html(res, pages.error({ lang: langOf(pathname), status: err.status, code: err.code }), err.status, headers);
      }
      log.error(`${req.method} ${pathname}`, err);
      if (pathname.startsWith('/api/')) return json(res, 500, { error: 'server_error' });
      html(res, pages.error({ lang: langOf(pathname), status: 500, code: 'server_error' }), 500);
    }
  });

  let stopJobs = () => {};
  return {
    config, db, log, server, owner, mailer, payments,
    listen() {
      if (config.jobs) stopJobs = startJobs({ db, config, mailer, log });
      return new Promise((resolve) => server.listen(config.port, config.host, () => resolve(server.address())));
    },
    async close() {
      stopJobs();
      await new Promise((r) => server.close(r));
      db.close();
    },
  };
}
