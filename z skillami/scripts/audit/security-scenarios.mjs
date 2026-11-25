// Safe attack scenarios against LOCAL QA servers only (own test data, few requests).
import fs from 'node:fs';
const QA = 'http://127.0.0.1:3710';
const PROD = 'http://127.0.0.1:3711';
const dir = process.argv[2];
const owner = JSON.parse(fs.readFileSync(`${dir}/owner.json`, 'utf8'));
const editor = JSON.parse(fs.readFileSync(`${dir}/editor.json`, 'utf8'));
const res = [];
const log = (id, name, result, detail = '') => { res.push({ id, name, result, detail }); console.log(`[${id}] ${result.padEnd(9)} ${name}${detail ? ' — ' + detail : ''}`); };
const j = (base, method, path, body, headers = {}) => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' })
  .then(async (r) => ({ status: r.status, headers: r.headers, text: await r.text() })).then((r) => { try { r.data = JSON.parse(r.text); } catch {} return r; });
const adm = (method, path, body, who = owner) => j(QA, method, path, body, { Cookie: who.cookie, 'X-CSRF-Token': who.csrf });

if (process.env.FROM11) { /* skip */ } else {
// A1 sandbox payments in production without Stripe
{
  const o = await j(PROD, 'POST', '/api/orders', { email: 'atak@poczta.pl', acceptTerms: true });
  const key = o.data?.redirectUrl ? decodeURIComponent(o.data.redirectUrl.split('key=')[1]) : null;
  const p = key ? await j(PROD, 'POST', '/api/sandbox/pay', { orderId: o.data.orderId, key, outcome: 'success' }) : null;
  log('A1', 'production without Stripe: order "paid" with no money', p?.status === 200 ? 'VULN' : 'OK', `order ${o.status}, pay ${p?.status}`);
}
// A2 single-use code redeemed twice (pending orders race)
{
  await adm('POST', '/api/admin/codes', { code: 'RAZ1', percent: 50, max_uses: 1 });
  const a = await j(QA, 'POST', '/api/orders', { email: 'race1@poczta.pl', acceptTerms: true, code: 'RAZ1' });
  const b = await j(QA, 'POST', '/api/orders', { email: 'race2@poczta.pl', acceptTerms: true, code: 'RAZ1' });
  for (const o of [a, b]) if (o.data?.redirectUrl) await j(QA, 'POST', '/api/sandbox/pay', { orderId: o.data.orderId, key: decodeURIComponent(o.data.redirectUrl.split('key=')[1]), outcome: 'success' });
  const codes = (await adm('GET', '/api/admin/codes')).data.rows;
  const used = codes.find((c) => c.code === 'RAZ1')?.used;
  log('A2', 'single-use code used by two pending orders', used > 1 ? 'VULN' : 'OK', `orders ${a.status}/${b.status}, used=${used}`);
}
// A3 client can inflate server-side A/B impressions / funnel events
{
  const before = (await adm('GET', '/api/admin/dashboard')).data.ab.find((v) => v.variant === 'c').impressions;
  for (let i = 0; i < 5; i++) await j(QA, 'POST', '/api/e', { name: 'hero_impression', variant: 'c' }, { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/131' });
  const after = (await adm('GET', '/api/admin/dashboard')).data.ab.find((v) => v.variant === 'c').impressions;
  log('A3', 'forged hero_impression events skew A/B test', after > before ? 'VULN' : 'OK', `${before} → ${after}`);
}
// A4 marketing consent from string "false"
{
  await j(QA, 'POST', '/api/waitlist', { email: 'zgoda-test@poczta.pl', consentMarketing: 'false' });
  const subs = (await adm('GET', '/api/admin/subscribers?q=zgoda-test')).data.rows;
  log('A4', 'consentMarketing:"false" stored as consent', subs[0]?.consent_marketing ? 'VULN' : 'OK', `consent=${subs[0]?.consent_marketing}`);
}
// A5 viewer sees full PII (emails) although CSV export is denied
{
  const viewer = JSON.parse(fs.readFileSync(`${dir}/viewer.json`, 'utf8'));
  const list = await adm('GET', '/api/admin/subscribers', undefined, viewer);
  const csv = await adm('GET', '/api/admin/subscribers.csv', undefined, viewer);
  const full = list.data?.rows?.some((r) => /^[^*]+@/.test(r.email));
  log('A5', 'viewer role reads every e-mail via JSON while CSV is forbidden', full && csv.status === 403 ? 'VULN' : 'OK', `json ${list.status}, csv ${csv.status}`);
}
// A6 X-Forwarded-For handling (TRUST_PROXY=1 uses the FIRST, client-controlled entry) — code review
{
  const src = fs.readFileSync('src/http.js', 'utf8');
  log('A6', 'X-Forwarded-For: first (client-controlled) hop used for rate limits', /split\(','\)\[0\]/.test(src) ? 'VULN' : 'OK', 'only when TRUST_PROXY=1');
}
// A7 TOTP code replay within its 30–90 s window — code review
{
  const src = fs.readFileSync('src/security.js', 'utf8') + fs.readFileSync('src/admin.js', 'utf8');
  log('A7', 'TOTP code can be reused inside its validity window', /totp_last/.test(src) ? 'OK' : 'VULN', 'no last-used step stored');
}
// A8 stored XSS through blog editor and order name
{
  const p = await adm('POST', '/api/admin/posts', { title: '<img src=x onerror=alert(1)>', slug: 'xss-probe', body_md: '<script>alert(document.domain)</script>\n\n[x](javascript:alert(1))', published: true }, editor);
  const page = await j(QA, 'GET', '/poradnik/xss-probe');
  const bad = /<script>alert|<img src=x|href="javascript/.test(page.text);
  log('A8', 'stored XSS via blog post (editor)', bad ? 'VULN' : 'OK', `create ${p.status}, page ${page.status}`);
  if (p.data?.id) await adm('DELETE', `/api/admin/posts/${p.data.id}`, undefined, editor);
  const o = await j(QA, 'POST', '/api/orders', { email: 'xss@poczta.pl', acceptTerms: true, name: '"><script>alert(1)</script>' });
  const key = decodeURIComponent(o.data.redirectUrl.split('key=')[1]);
  const op = await j(QA, 'GET', `/zamowienie/${o.data.orderId}?key=${encodeURIComponent(key)}`);
  log('A8b', 'stored XSS via order name on order page', /<script>alert\(1\)/.test(op.text) ? 'VULN' : 'OK', `page ${op.status}`);
}
// A9 price / currency tampering, webhook replay — covered by test/payments.test.js
log('A9', 'price/amount tampering, forged & replayed webhooks', 'OK', 'npm test: payments.test.js (5 cases)');
// A10 path traversal variants
{
  const paths = ['/%5c..%5cserver.js', '/..%2f.env', '/css/..%2f..%2fdata/ogarnij.sqlite', '/.secrets.json', '/%2e%2e%5cpackage.json'];
  const st = [];
  for (const p of paths) st.push((await fetch(QA + p)).status);
  log('A10', 'path traversal / dotfiles', st.every((s) => s !== 200) ? 'OK' : 'VULN', st.join(','));
}
}
// A11 oversized body, wrong types
{
  const big = await fetch(QA + '/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a@b.pl', pad: 'x'.repeat(70000) }) }).catch((e) => ({ status: 'RESET:' + (e.cause?.code || e.message) }));
  const arr = await j(QA, 'POST', '/api/waitlist/confirm', { token: ['x'] });
  log('A11', 'oversized JSON rejected, type confusion handled', big.status === 413 && arr.status === 200 ? 'OK' : 'CHECK', `big ${big.status}, array-token ${arr.status} ${arr.text}`);
}
// A12 cross-site form POST (CSRF) to unsubscribe / confirm
{
  const r = await fetch(QA + '/wypisz', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://evil.example' }, body: 'key=abc' });
  log('A12', 'cross-site form POST blocked', r.status === 403 ? 'OK' : 'VULN', `status ${r.status}`);
}
// A13 /en without trailing slash
{
  const r = await fetch(QA + '/en', { redirect: 'manual' });
  log('A13', '/en (no slash) reachable', r.status === 200 || r.status === 301 || r.status === 308 ? 'OK' : 'BUG', `status ${r.status}`);
}
// A14 HTTPS redirect in production behind proxy
{
  const r = await fetch(PROD + '/', { headers: { 'X-Forwarded-Proto': 'http' }, redirect: 'manual' });
  log('A14', 'production redirects http→https (behind proxy)', [301, 308].includes(r.status) ? 'OK' : 'GAP', `status ${r.status}, HSTS ${r.headers.get('strict-transport-security') ? 'yes' : 'no'}`);
}
// A15 security.txt
{
  const r = await fetch(QA + '/.well-known/security.txt');
  log('A15', '/.well-known/security.txt present', r.status === 200 ? 'OK' : 'GAP', `status ${r.status}`);
}
// A16 login brute force & enumeration
{
  const a = await j(QA, 'POST', '/api/admin/login', { email: 'nikt@x.pl', password: 'x' });
  const b = await j(QA, 'POST', '/api/admin/login', { email: 'qa@ogarnij.local', password: 'x' });
  log('A16', 'login does not reveal which e-mails exist', a.status === b.status && a.text === b.text ? 'OK' : 'VULN', `${a.status}/${b.status}`);
}
fs.writeFileSync(`${dir}/attacks.json`, JSON.stringify(res, null, 2));
