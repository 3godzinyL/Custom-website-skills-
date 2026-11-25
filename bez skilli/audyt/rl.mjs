// Rate-limit / brute-force probes (≤ 20 requests per check) against the rate-limited audit instance.
const BASE = process.argv[2] || 'http://localhost:3591';
const H = { 'content-type': 'application/json', origin: BASE };
const post = async (p, b, extra = {}) => {
  const r = await fetch(BASE + p, { method: 'POST', headers: { ...H, ...extra }, body: JSON.stringify(b) });
  let j = null;
  try { j = await r.json(); } catch { /* */ }
  return { s: r.status, j, ra: r.headers.get('retry-after') };
};
const out = [];
const log = (name, statuses, note = '') => { out.push({ name, statuses, note }); console.log(`${name}: ${statuses.join(',')} ${note}`); };

// Account for lockout tests
await post('/api/auth/signup', { name: 'Lock Me', email: 'lock@audit.test', password: 'Lock-Me-Password-123', acceptTerms: true });

// 1) Lockout after 5 wrong passwords (existing account) vs unknown e-mail → enumeration?
let s = [];
let msg6 = '';
for (let i = 0; i < 6; i++) { const r = await post('/api/auth/login', { email: 'lock@audit.test', password: 'wrong-' + i }); s.push(r.s); if (i === 5) msg6 = r.j?.error?.message; }
log('login wrong x6 (existing)', s, msg6);
s = []; let msgU = '';
for (let i = 0; i < 6; i++) { const r = await post('/api/auth/login', { email: 'ghost@audit.test', password: 'wrong-' + i }); s.push(r.s); if (i === 5) msgU = r.j?.error?.message; }
log('login wrong x6 (unknown)', s, msgU);
const correct = await post('/api/auth/login', { email: 'lock@audit.test', password: 'Lock-Me-Password-123' });
log('correct password while locked', [correct.s], correct.j?.error?.message || '');
// 2) Per-IP login limiter (30 / 15 min) — continue with random e-mails up to the cap
s = [];
for (let i = 0; i < 19; i++) { const r = await post('/api/auth/login', { email: `r${i}@audit.test`, password: 'x' }); s.push(r.s); }
log('login per-IP (31 total)', s.slice(-4), `last Retry-After ${''}`);
// 3) Admin login limiter (10 / 15 min)
s = [];
for (let i = 0; i < 11; i++) { const r = await post('/api/admin/auth/login', { email: 'admin@audit.test', password: 'bad' + i }); s.push(r.s); }
log('admin login x11', s);
// 4) Waitlist 5 / h
const tok = (await (await fetch(BASE + '/api/waitlist/token')).json()).token;
await new Promise((r) => setTimeout(r, 2700));
s = [];
for (let i = 0; i < 6; i++) { const r = await post('/api/waitlist', { email: `w${i}@audit.test`, acceptPrivacy: true, token: tok }); s.push(r.s); }
log('waitlist x6', s);
// 5) Forgot 6 / h
s = [];
for (let i = 0; i < 7; i++) { const r = await post('/api/auth/forgot', { email: `f${i}@audit.test` }); s.push(r.s); }
log('forgot x7', s);
// 6) Signup 10 / h (1 used above)
s = [];
for (let i = 0; i < 10; i++) { const r = await post('/api/auth/signup', { name: 'S', email: `s${i}@audit.test`, password: 'Signup-Password-123', acceptTerms: true }); s.push(r.s); }
log('signup x10 (+1 earlier)', s);
// 7) Demo parser 20 / min
s = [];
for (let i = 0; i < 21; i++) { const r = await post('/api/demo/parse', { text: 'call the bank and send invoice' }); s.push(r.s); }
log('demo parse x21', s.slice(-3));
console.log(JSON.stringify(out));
