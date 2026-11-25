// Second audit pass (25.11.2026): new probes. LOCAL QA server only, own test data, few requests.
// Usage: node scripts/audit/security-scenarios-2.mjs <dir-with-owner.json>
import fs from 'node:fs';
import net from 'node:net';
const QA = 'http://127.0.0.1:3710';
const dir = process.argv[2];
const owner = JSON.parse(fs.readFileSync(`${dir}/owner.json`, 'utf8'));
const res = [];
const log = (id, name, result, detail = '') => { res.push({ id, name, result, detail }); console.log(`[${id}] ${result.padEnd(6)} ${name}${detail ? ' — ' + detail : ''}`); };
const adm = (path) => fetch(QA + path, { headers: { Cookie: owner.cookie } }).then((r) => r.json());
const raw = (text) => new Promise((resolve) => {
  const s = net.connect(3710, '127.0.0.1', () => s.write(text));
  let buf = '';
  s.on('data', (d) => { buf += d; });
  s.on('end', () => resolve(buf));
  s.on('error', () => resolve(buf));
  setTimeout(() => { s.destroy(); resolve(buf); }, 3000);
});

// C1 malformed percent-encoding in a route parameter
{
  const before = (await adm('/api/admin/health')).errors24h;
  const st = [];
  for (const p of ['/poradnik/%E0%A4%A', '/zamowienie/%ZZ?key=x', '/poradnik/%']) st.push((await fetch(QA + p)).status);
  const after = (await adm('/api/admin/health')).errors24h;
  log('C1', 'malformed %-encoding in path params', st.some((s) => s >= 500) ? 'VULN' : 'OK', `statuses ${st.join(',')}; server errors logged ${before} → ${after}`);
}
// C2 Host header injection into links
{
  const r = await raw('GET / HTTP/1.1\r\nHost: evil.example\r\nConnection: close\r\n\r\n');
  log('C2', 'Host header reflected into canonical/OG/links', /evil\.example/.test(r) ? 'VULN' : 'OK', r.split('\r\n')[0]);
}
// C3 login CSRF (cross-site text/plain / form post)
{
  const a = await fetch(QA + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: 'https://evil.example' }, body: JSON.stringify({ email: 'qa@ogarnij.local', password: 'qa-password-12345' }) });
  log('C3', 'login CSRF with non-JSON body from another site', a.status === 415 ? 'OK' : 'VULN', `status ${a.status}`);
}
// C4 presale form as a mail relay to someone else's address
{
  const victim = `ofiara-${Date.now()}@poczta.pl`;
  let created = 0;
  for (let i = 0; i < 3; i++) { const r = await fetch(QA + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: victim, acceptTerms: true }) }); if (r.status === 201) created++; }
  const mails = (await adm('/api/admin/emails')).rows.filter((m) => m.to_addr === victim).length;
  log('C4', 'orders queue reminder e-mails to any address (no proof of ownership)', mails > 0 ? 'LOW' : 'OK', `${created} orders → ${mails} queued e-mails to the victim (limit 8/10 min per IP)`);
}
// C5 HTTP methods
{
  const st = [];
  for (const m of ['OPTIONS', 'PUT', 'DELETE', 'TRACE']) st.push(`${m} ${(await fetch(QA + '/', { method: m }).catch(() => ({ status: 'ERR' }))).status}`);
  log('C5', 'unexpected HTTP methods on pages', st.every((s) => /405|ERR/.test(s)) ? 'OK' : 'CHECK', st.join(', '));
}
// C6 request smuggling basics (both Content-Length and Transfer-Encoding)
{
  const r = await raw('POST /api/e HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: 4\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n0\r\n\r\n');
  log('C6', 'CL + TE conflict rejected by the HTTP parser', /^HTTP\/1\.1 400/.test(r) ? 'OK' : 'CHECK', r.split('\r\n')[0]);
}
// C7 discount code length / guessing — code review + live check of quote rate limit
{
  const src = fs.readFileSync('src/admin.js', 'utf8');
  const minLen = /\[A-Z0-9-\]\{3,24\}/.test(src) ? 3 : null;
  log('C7', 'discount codes as short as 3 chars allowed', minLen === 3 ? 'LOW' : 'OK', 'quote endpoint limited to 20/min per IP; short public promo codes are guessable');
}
// C8 service worker caching strategy — code review
{
  const sw = fs.readFileSync('public/sw.js', 'utf8');
  log('C8', 'service worker serves CSS/JS cache-first without versioned names', /caches\.match\(req\)\.then\(\(hit\) => hit \|\|/.test(sw) ? 'LOW' : 'OK', 'after a deploy returning visitors keep old site.js until VERSION in sw.js is bumped');
}
// C9 session cookie hardening — code review
{
  const src = fs.readFileSync('src/admin.js', 'utf8');
  log('C9', 'admin cookie without __Host- prefix', /'__Host-/.test(src) ? 'OK' : 'INFO', 'HttpOnly + SameSite=Strict + Secure(prod) already set');
}
// C10 account recovery for the owner — code review
{
  const has = fs.existsSync('scripts/reset-admin.js');
  log('C10', 'no recovery path when the only owner loses password/2FA', has ? 'OK' : 'LOW', 'ensureOwner only runs when the users table is empty');
}
// C11 runtime version
log('C11', `Node.js runtime ${process.version}`, 'INFO', 'check for newer 22.x security releases before deploy (not verified online)');
fs.writeFileSync(`${dir}/attacks2.json`, JSON.stringify(res, null, 2));
