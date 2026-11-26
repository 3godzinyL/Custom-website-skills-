#!/usr/bin/env node
// Passive website security scan — Node 18+, no dependencies.
// Only GET/HEAD/OPTIONS, sequential requests with a delay, capped request count.
// Use ONLY on sites you own or are authorized to test.
//
// Usage:
//   node passive-scan.mjs https://example.com [--out scan.json] [--max-js 15] [--delay 300]
//
// Output: Markdown summary on stdout, full JSON with --out.
// Every result is a LEAD to verify manually, not a confirmed finding.

const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) {
  console.error('Usage: node passive-scan.mjs <url> [--out file.json] [--max-js N] [--delay ms]');
  process.exit(1);
}
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : def;
};
const START = new URL(args[0].includes('://') ? args[0] : `https://${args[0]}`);
// Local/dev targets have no TLS by design: HTTPS/HSTS leads would be noise there.
const LOCAL = /^(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[\w-]+\.(local|test|localhost|internal))$/i.test(START.hostname);
const OUT = opt('--out', null);
const MAX_JS = Number(opt('--max-js', 15));
const DELAY = Number(opt('--delay', 300));
const MAX_REQUESTS = 120;
const TIMEOUT = 15000;
const UA = 'website-security-checker/1.0 (passive; authorized audit)';

let requestCount = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const leads = []; // { level: 'high'|'medium'|'low'|'info', area, text }
const lead = (level, area, text) => leads.push({ level, area, text });

async function req(url, { method = 'GET', headers = {}, redirect = 'manual', body = true } = {}) {
  if (requestCount >= MAX_REQUESTS) return { error: 'request cap reached' };
  requestCount++;
  await sleep(DELAY);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { method, headers: { 'User-Agent': UA, ...headers }, redirect, signal: ctrl.signal });
    let text = '';
    if (body && method !== 'HEAD') {
      const buf = await res.arrayBuffer();
      text = Buffer.from(buf.slice(0, 3_000_000)).toString('utf8');
    }
    return { status: res.status, headers: res.headers, text, url: res.url || url };
  } catch (e) {
    return { error: e.name === 'AbortError' ? 'timeout' : String(e.message || e) };
  } finally {
    clearTimeout(t);
  }
}

const result = {
  target: START.href,
  scannedAt: new Date().toISOString(),
  https: {},
  headers: {},
  cookies: [],
  cors: {},
  tech: [],
  files: [],
  scripts: [],
  secrets: [],
  endpoints: [],
  forms: [],
  links: [],
  leads,
};

// ---------- 1. HTTPS and redirects ----------
async function checkHttps() {
  if (LOCAL) {
    lead('info', 'HTTPS', `Local target (${START.hostname}): HTTPS redirect and HSTS were not checked — check them on the production domain`);
    return;
  }
  const httpUrl = new URL(START.href);
  httpUrl.protocol = 'http:';
  let r = await req(httpUrl.href, { body: false, method: 'HEAD' });
  if (!r.error && (r.status === 405 || r.status === 501)) r = await req(httpUrl.href, { body: false, method: 'GET' });
  if (r.error) {
    result.https.http = r.error;
  } else {
    const loc = r.headers.get('location') || '';
    result.https.httpStatus = r.status;
    result.https.httpRedirect = loc;
    if (r.status >= 200 && r.status < 300) lead('high', 'HTTPS', `HTTP (${httpUrl.href}) answers ${r.status} without redirecting to HTTPS`);
    else if (r.status >= 300 && r.status < 400 && !loc.startsWith('https://')) lead('medium', 'HTTPS', `HTTP redirects to non-HTTPS location: ${loc}`);
  }
}

// ---------- 2. Main page: headers, cookies, tech ----------
const SEC_HEADERS = {
  'strict-transport-security': ['medium', 'HSTS missing — add Strict-Transport-Security: max-age=31536000; includeSubDomains'],
  'content-security-policy': ['medium', 'CSP missing — no second layer of protection against XSS'],
  'x-content-type-options': ['low', 'X-Content-Type-Options: nosniff missing'],
  'referrer-policy': ['low', 'Referrer-Policy missing'],
  'permissions-policy': ['low', 'Permissions-Policy missing'],
};

function analyzeHeaders(h) {
  const all = {};
  h.forEach((v, k) => (all[k] = v));
  result.headers = all;
  for (const [name, [level, text]] of Object.entries(SEC_HEADERS)) {
    if (LOCAL && name === 'strict-transport-security') continue;
    if (!h.get(name)) lead(level, 'Headers', text);
  }
  const csp = h.get('content-security-policy') || '';
  if (csp) {
    if (/'unsafe-inline'/.test(csp) && !/nonce-|sha256-/.test(csp)) lead('medium', 'Headers', "CSP allows 'unsafe-inline' scripts without nonces/hashes");
    if (/'unsafe-eval'/.test(csp)) lead('low', 'Headers', "CSP allows 'unsafe-eval'");
    if (/(script-src|default-src)[^;]*\s\*(\s|;|$)/.test(csp)) lead('medium', 'Headers', 'CSP script source allows * (any host)');
  }
  if (!/frame-ancestors/.test(csp) && !h.get('x-frame-options')) lead('medium', 'Headers', 'No frame-ancestors / X-Frame-Options — clickjacking possible');
  for (const k of ['server', 'x-powered-by', 'x-aspnet-version', 'x-generator']) {
    const v = h.get(k);
    if (v && /\d/.test(v)) lead('low', 'Headers', `Version disclosure in ${k}: ${v}`);
    else if (v) result.tech.push(`${k}: ${v}`);
  }
  if (h.get('cf-ray')) result.tech.push('Cloudflare');
  if (h.get('x-vercel-id')) result.tech.push('Vercel');
  if (h.get('x-nf-request-id')) result.tech.push('Netlify');
  if (h.get('x-amz-cf-id')) result.tech.push('AWS CloudFront');
}

function analyzeCookies(h) {
  const list = typeof h.getSetCookie === 'function' ? h.getSetCookie() : (h.get('set-cookie') ? [h.get('set-cookie')] : []);
  for (const c of list) {
    const name = c.split('=')[0].trim();
    const lower = c.toLowerCase();
    const flags = { httpOnly: lower.includes('httponly'), secure: lower.includes('secure'), sameSite: (lower.match(/samesite=(\w+)/) || [])[1] || null };
    result.cookies.push({ name, ...flags });
    const sensitive = /sess|auth|token|jwt|sid|login|user|admin|wordpress_logged|phpsessid|connect\.sid/i.test(name);
    if (!flags.secure) lead(sensitive ? 'medium' : 'low', 'Cookies', `Cookie "${name}" without Secure`);
    if (sensitive && !flags.httpOnly) lead('medium', 'Cookies', `Session-like cookie "${name}" without HttpOnly (readable by XSS)`);
    if (!flags.sameSite) lead('low', 'Cookies', `Cookie "${name}" without SameSite`);
  }
}

const FINGERPRINTS = [
  [/wp-content|wp-includes|wp-json/i, 'WordPress'],
  [/woocommerce/i, 'WooCommerce'],
  [/cdn\.shopify\.com|Shopify\.theme/i, 'Shopify'],
  [/prestashop/i, 'PrestaShop'],
  [/__NEXT_DATA__|\/_next\//, 'Next.js'],
  [/\/_nuxt\//, 'Nuxt'],
  [/astro-island|\/_astro\//, 'Astro'],
  [/ng-version=/, 'Angular'],
  [/data-reactroot|react-dom/, 'React'],
  [/wix\.com|wixstatic/i, 'Wix'],
  [/webflow/i, 'Webflow'],
  [/squarespace/i, 'Squarespace'],
  [/supabase\.co/i, 'Supabase'],
  [/firebaseio\.com|firebaseapp\.com|firebase/i, 'Firebase'],
  [/js\.stripe\.com/i, 'Stripe.js'],
  [/przelewy24/i, 'Przelewy24'],
  [/payu/i, 'PayU'],
  [/tpay/i, 'Tpay'],
  [/googletagmanager\.com|gtag\(/i, 'Google Tag Manager/Analytics'],
  [/connect\.facebook\.net|fbq\(/i, 'Meta Pixel'],
  [/hotjar/i, 'Hotjar'],
  [/recaptcha|hcaptcha|challenges\.cloudflare\.com\/turnstile/i, 'Captcha'],
  [/jquery/i, 'jQuery'],
];

function analyzeHtml(html, baseUrl) {
  const gen = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i);
  if (gen) {
    result.tech.push(`generator: ${gen[1]}`);
    if (/wordpress/i.test(gen[1])) result.tech.push("WordPress");
    if (/prestashop/i.test(gen[1])) result.tech.push("PrestaShop");
    if (/\d/.test(gen[1])) lead('low', 'Tech', `Generator meta reveals version: ${gen[1]}`);
  }
  for (const [re, name] of FINGERPRINTS) if (re.test(html)) result.tech.push(name);

  // scripts
  const srcs = [...html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi)].map((m) => m[0]);
  for (const tag of srcs) {
    const src = tag.match(/src=["']([^"']+)/i)[1];
    let abs;
    try { abs = new URL(src, baseUrl).href; } catch { continue; }
    const thirdParty = new URL(abs).hostname !== START.hostname;
    const hasSri = /\sintegrity=/i.test(tag);
    result.scripts.push({ src: abs, thirdParty, sri: hasSri });
    if (thirdParty && !hasSri && /cdn|unpkg|jsdelivr|cdnjs/i.test(abs)) lead('low', 'Supply chain', `CDN script without SRI: ${abs}`);
  }
  const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n');
  scanSecrets(inline, `${baseUrl} (inline scripts)`);
  scanEndpoints(inline, `${baseUrl} (inline)`);
  if (/__NEXT_DATA__/.test(html)) {
    const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nd && /"(email|phone|password|token|address)"\s*:/i.test(nd[1])) lead('medium', 'Data exposure', '__NEXT_DATA__ contains fields like email/phone/token/address — verify they are not private');
  }

  // forms
  for (const m of html.matchAll(/<form([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const attrs = m[1];
    const inner = m[2];
    const action = (attrs.match(/action=["']([^"']*)/i) || [])[1] || '(same page)';
    const method = ((attrs.match(/method=["']([^"']*)/i) || [])[1] || 'GET').toUpperCase();
    const fields = [...inner.matchAll(/<(input|textarea|select)[^>]*name=["']([^"']+)/gi)].map((x) => x[2]);
    const hasCsrf = fields.some((f) => /csrf|token|nonce|_wpnonce|authenticity/i.test(f));
    const hasCaptcha = /recaptcha|hcaptcha|turnstile|captcha/i.test(inner);
    const hasFile = /type=["']file/i.test(inner);
    result.forms.push({ page: baseUrl, action, method, fields, csrfField: hasCsrf, captcha: hasCaptcha, fileUpload: hasFile });
    if (method === 'POST' && !hasCaptcha) lead('info', 'Forms', `POST form → ${action} without visible captcha — verify server-side rate limiting/honeypot`);
    if (method !== 'POST' && /type=["']?password/i.test(inner)) lead('high', 'Forms', `Form with a password field is ${method} (no method="post") on ${baseUrl} — submitted before JS loads, the password lands in the URL, browser history and proxy logs`);
    if (/^http:\/\//i.test(action)) lead('high', 'Forms', `Form submits over plain HTTP: ${action}`);
  }

  // same-origin links for a shallow crawl
  for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(m[1], baseUrl);
      if (u.hostname === START.hostname && /^https?:$/.test(u.protocol) && !/\.(jpg|jpeg|png|gif|webp|svg|css|js|pdf|zip|ico|woff2?)$/i.test(u.pathname)) {
        u.hash = '';
        if (!result.links.includes(u.href)) result.links.push(u.href);
      }
    } catch {}
  }
  if (/http:\/\/[^"'\s>]+\.(js|css)/i.test(html) && START.protocol === 'https:') lead('medium', 'HTTPS', 'Mixed content: page references http:// scripts or styles');
}

// ---------- 3. Secrets and endpoints in JS ----------
const SECRET_PATTERNS = [
  ['critical', 'Stripe secret key', /\b(sk|rk)_live_[0-9a-zA-Z]{20,}/g],
  ['high', 'Stripe test secret key', /\bsk_test_[0-9a-zA-Z]{20,}/g],
  ['critical', 'AWS access key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['medium', 'Google API key (check restrictions)', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['critical', 'OpenAI API key', /\bsk-(proj-)?[A-Za-z0-9_-]{32,}/g],
  ['critical', 'Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  ['critical', 'GitHub token', /\b(ghp|gho|ghs|ghu)_[A-Za-z0-9]{36}\b|github_pat_[A-Za-z0-9_]{40,}/g],
  ['critical', 'Slack token', /\bxox[abpr]-[A-Za-z0-9-]{10,}/g],
  ['high', 'Telegram bot token', /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/g],
  ['critical', 'SendGrid key', /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g],
  ['critical', 'Supabase secret key (new format)', /\bsb_secret_[A-Za-z0-9_-]{20,}/g],
  ['critical', 'Stripe webhook signing secret', /\bwhsec_[A-Za-z0-9]{24,}/g],
  ['high', 'Resend API key (likely)', /\bre_[A-Za-z0-9]{8}_[A-Za-z0-9]{16,}/g],
  ['high', 'Mailgun API key', /\bkey-[0-9a-f]{32}\b/g],
  ['high', 'Google OAuth client secret', /\bGOCSPX-[A-Za-z0-9_-]{24,}/g],
  ['critical', 'npm access token', /\bnpm_[A-Za-z0-9]{36}\b/g],
  ['high', 'Hugging Face token', /\bhf_[A-Za-z0-9]{34}\b/g],
  ['high', 'Groq API key', /\bgsk_[A-Za-z0-9]{40,}/g],
  ['high', 'Discord webhook URL (anyone can post as the site)', /https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]{20,}/g],
  ['high', 'Slack incoming webhook URL', /https:\/\/hooks\.slack\.com\/services\/T[A-Za-z0-9]+\/B[A-Za-z0-9]+\/[A-Za-z0-9]{20,}/g],
  ['critical', 'Private key', /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/g],
  ['high', 'Hardcoded password/secret assignment', /\b(password|passwd|secret|api_?key|client_secret|crc)\s*[:=]\s*["'][^"'\s]{8,}["']/gi],
  ['high', 'DB connection string', /\b(mongodb(\+srv)?|postgres(ql)?|mysql|redis):\/\/[^\s"']+:[^\s"']+@/g],
];

function decodeJwtRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return payload.role || payload.type || null;
  } catch { return null; }
}

const redact = (s) => (s.length <= 12 ? s.slice(0, 3) + '…' : `${s.slice(0, 6)}…${s.slice(-4)}`);

function scanSecrets(text, where) {
  for (const [level, name, re] of SECRET_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const value = m[0];
      if (/password|secret|api_?key/i.test(name) && /(placeholder|example|your|xxxx|changeme|\*\*\*)/i.test(value)) continue;
      result.secrets.push({ type: name, where, value: redact(value) });
      lead(level === 'critical' ? 'high' : level, 'Secrets', `${name} in ${where}: ${redact(value)}`);
    }
  }
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
    const role = decodeJwtRole(m[0]);
    if (role === 'service_role') {
      result.secrets.push({ type: 'Supabase service_role JWT', where, value: redact(m[0]) });
      lead('high', 'Secrets', `Supabase service_role key in ${where} — full database access, rotate now`);
    } else if (role === 'anon') {
      result.secrets.push({ type: 'Supabase anon key (public by design)', where, value: redact(m[0]) });
      lead('info', 'BaaS', 'Supabase anon key found — public by design; verify RLS on every table');
    }
  }
  if (/firebaseConfig|apiKey:\s*["']AIza/.test(text)) lead('info', 'BaaS', 'Firebase config found — public by design; verify Firestore/RTDB/Storage rules');
}

function scanEndpoints(text, where) {
  const found = new Set();
  const res = [
    /["'`](\/(?:api|graphql|v\d|rest|wp-json|admin|panel|dashboard|auth|login|checkout|cart|order|orders|payment|webhook|upload|user|users)[A-Za-z0-9_\-\/.:${}]*)["'`]/g,
    /["'`](https?:\/\/[A-Za-z0-9.-]+\/(?:api|graphql|v\d|rest)[A-Za-z0-9_\-\/.]*)["'`]/g,
    /["'`](wss?:\/\/[^"'`\s]+)["'`]/g,
  ];
  for (const re of res) for (const m of text.matchAll(re)) found.add(m[1]);
  for (const e of found) if (!result.endpoints.some((x) => x.path === e)) result.endpoints.push({ path: e, where });
}

async function scanScripts() {
  const firstParty = result.scripts.filter((s) => !s.thirdParty).slice(0, MAX_JS);
  for (const s of firstParty) {
    const r = await req(s.src, { redirect: 'follow' });
    if (r.error || r.status !== 200) continue;
    scanSecrets(r.text, s.src);
    scanEndpoints(r.text, s.src);
    if (/\/[\/*]# sourceMappingURL=([^\s*]+)/.test(r.text)) {
      const mapName = r.text.match(/\/[\/*]# sourceMappingURL=([^\s*]+)/)[1];
      if (!mapName.startsWith('data:')) {
        const mapUrl = new URL(mapName, s.src).href;
        const mr = await req(mapUrl, { method: 'HEAD', body: false, redirect: 'follow' });
        if (!mr.error && mr.status === 200) {
          result.files.push({ path: mapUrl, status: 200, note: 'source map' });
          lead('medium', 'Exposed files', `Source map publicly available: ${mapUrl} (reveals original source)`);
        }
      }
    }
  }
}

// ---------- 4. Exposed files ----------
const PROBES = [
  ['/.env', /^[A-Z0-9_]+\s*=/m, 'high'],
  ['/.env.local', /^[A-Z0-9_]+\s*=/m, 'high'],
  ['/.env.production', /^[A-Z0-9_]+\s*=/m, 'high'],
  ['/.git/HEAD', /^ref: refs\//, 'high'],
  ['/.git/config', /\[core\]/, 'high'],
  ['/.svn/entries', /^\d+\s*$/m, 'high'],
  ['/.DS_Store', /Bud1/, 'low'],
  ['/backup.zip', null, 'high'],
  ['/backup.sql', /(INSERT INTO|CREATE TABLE)/i, 'high'],
  ['/dump.sql', /(INSERT INTO|CREATE TABLE)/i, 'high'],
  ['/db.sql', /(INSERT INTO|CREATE TABLE)/i, 'high'],
  ['/phpinfo.php', /phpinfo\(\)|PHP Version/i, 'medium'],
  ['/server-status', /Apache Server Status/i, 'medium'],
  ['/wp-config.php.bak', /DB_PASSWORD/, 'high'],
  ['/wp-config.php~', /DB_PASSWORD/, 'high'],
  ['/wp-content/debug.log', /PHP (Notice|Warning|Fatal)/i, 'medium'],
  ['/debug.log', /(error|warning|exception)/i, 'low'],
  ['/package.json', /"dependencies"/, 'low'],
  ['/composer.json', /"require"/, 'low'],
  ['/docker-compose.yml', /services:/, 'medium'],
  ['/config.json', /(password|secret|key)/i, 'medium'],
  ['/.htpasswd', /:\$?[a-z0-9]/i, 'high'],
  ['/web.config', /<configuration/i, 'medium'],
  ['/.env.bak', /^[A-Z0-9_]+\s*=/m, 'high'],
  ['/.env.backup', /^[A-Z0-9_]+\s*=/m, 'high'],
  ['/.env.old', /^[A-Z0-9_]+\s*=/m, 'high'],
  ['/.npmrc', /_authToken|registry=/i, 'high'],
  ['/.vscode/sftp.json', /"(host|password|privateKeyPath)"/i, 'high'],
  ['/sftp-config.json', /"(host|password)"/i, 'high'],
  ['/.aws/credentials', /aws_secret_access_key/i, 'high'],
  ['/storage/logs/laravel.log', /(production|local)\.(ERROR|WARNING)/, 'medium'],
  ['/database.sqlite', /^SQLite format 3/, 'high'],
  ['/db.sqlite', /^SQLite format 3/, 'high'],
  ['/data/', /<title>Index of|Directory listing/i, 'high'],
  ['/backup/', /<title>Index of|Directory listing/i, 'high'],
  ['/uploads/', /<title>Index of|Directory listing/i, 'medium'],
  ['/openapi.json', /"(openapi|swagger)"\s*:/, 'info'],
  ['/swagger.json', /"(openapi|swagger)"\s*:/, 'info'],
  ['/actuator/env', /propertySources|activeProfiles/, 'high'],
];

const INFO_PATHS = ['/robots.txt', '/sitemap.xml', '/.well-known/security.txt', '/security.txt'];

async function probeFiles() {
  // baseline for soft-404 detection
  const rnd = await req(new URL(`/wbx-not-found-${Date.now()}.txt`, START).href, { redirect: 'follow' });
  const soft404 = !rnd.error && rnd.status === 200 ? rnd.text.slice(0, 500) : null;
  if (!rnd.error && rnd.status >= 500) lead('low', 'Errors', `Random path returns ${rnd.status} — check error handling`);
  if (!rnd.error && /(stack trace|traceback|\bat [\w.$<>]+ \(|exception|Whoops|Ignition|DEBUG = True|node_modules\/)/i.test(rnd.text)) lead('medium', 'Errors', 'Error page contains stack trace / debug output');

  for (const [path, re, level] of PROBES) {
    const r = await req(new URL(path, START).href);
    if (r.error) continue;
    if (r.status === 200) {
      const sameAsSoft = soft404 && r.text.slice(0, 500) === soft404;
      const ct = r.headers.get('content-type') || '';
      const confirmed = re ? re.test(r.text) : !/text\/html/i.test(ct);
      if (confirmed && !sameAsSoft) {
        result.files.push({ path, status: 200, confirmed: true });
        lead(level, 'Exposed files', `${path} is publicly readable (content matches expected format)`);
      } else if (!sameAsSoft) {
        result.files.push({ path, status: 200, confirmed: false });
      }
    } else if (r.status === 403 && /\.git|\.env/.test(path)) {
      result.files.push({ path, status: 403, note: 'exists but forbidden?' });
    }
  }
  for (const path of INFO_PATHS) {
    const r = await req(new URL(path, START).href);
    if (r.error || r.status !== 200 || (soft404 && r.text.slice(0, 500) === soft404)) {
      if (path.includes('security.txt')) continue;
      continue;
    }
    result.files.push({ path, status: 200, note: 'info' });
    if (path === '/robots.txt') {
      const dis = [...r.text.matchAll(/Disallow:\s*(\S+)/gi)].map((m) => m[1]).filter((p) => p !== '/');
      if (dis.length) result.robotsDisallow = dis;
      const interesting = dis.filter((p) => /admin|panel|backup|private|api|staging|test|dev|login/i.test(p));
      if (interesting.length) lead('info', 'Recon', `robots.txt reveals paths: ${interesting.join(', ')} — check they require auth`);
    }
  }
  if (!result.files.some((f) => f.path.includes('security.txt'))) lead('info', 'Recon', 'No /.well-known/security.txt (optional, helps researchers report issues)');
}

// ---------- 5. CORS ----------
async function checkCors() {
  const targets = [START.href];
  const api = result.endpoints.find((e) => e.path.startsWith('/api'));
  if (api) targets.push(new URL(api.path.replace(/\$\{[^}]*\}/g, '1'), START).href);
  for (const t of targets) {
    const r = await req(t, { headers: { Origin: 'https://evil.example' }, body: false, method: 'GET' });
    if (r.error) continue;
    const acao = r.headers.get('access-control-allow-origin');
    const acac = r.headers.get('access-control-allow-credentials');
    result.cors[t] = { acao, acac };
    if (acao === 'https://evil.example' && acac === 'true') lead('high', 'CORS', `${t} reflects arbitrary Origin WITH credentials`);
    else if (acao === 'https://evil.example') lead('medium', 'CORS', `${t} reflects arbitrary Origin (no credentials)`);
    else if (acao === '*' && t !== START.href) lead('low', 'CORS', `${t} allows any origin (*) — fine only for public data`);
  }
}

// ---------- 6. Platform-specific quick checks ----------
async function platformChecks() {
  if (result.tech.includes('WordPress')) {
    const u = await req(new URL('/wp-json/wp/v2/users', START).href);
    if (!u.error && u.status === 200 && /"slug"/.test(u.text)) lead('medium', 'WordPress', '/wp-json/wp/v2/users lists users publicly (user enumeration)');
    const x = await req(new URL('/xmlrpc.php', START).href, { body: true });
    if (!x.error && (x.status === 405 || /XML-RPC server accepts POST/i.test(x.text))) lead('low', 'WordPress', '/xmlrpc.php enabled — disable if not used (brute-force amplification)');
  }
  const gql = result.endpoints.find((e) => /graphql/i.test(e.path));
  if (gql) lead('info', 'API', `GraphQL endpoint referenced (${gql.path}) — check introspection and field-level auth manually`);
}

// ---------- run ----------
function renderMarkdown() {
  const order = { high: 0, medium: 1, low: 2, info: 3 };
  const sorted = [...leads].sort((a, b) => order[a.level] - order[b.level]);
  const lines = [];
  lines.push(`# Passive scan: ${result.target}`);
  lines.push(`Scanned: ${result.scannedAt} · requests: ${requestCount}`);
  lines.push('');
  lines.push('> Leads to verify manually — not confirmed findings.');
  lines.push('');
  lines.push(`**Tech:** ${[...new Set(result.tech)].join(', ') || 'unknown'}`);
  lines.push('');
  lines.push('## Leads');
  if (!sorted.length) lines.push('- none');
  for (const l of sorted) lines.push(`- **${l.level.toUpperCase()}** [${l.area}] ${l.text}`);
  lines.push('');
  lines.push(`## Endpoints referenced in HTML/JS (${result.endpoints.length})`);
  for (const e of result.endpoints.slice(0, 80)) lines.push(`- \`${e.path}\``);
  lines.push('');
  lines.push(`## Forms (${result.forms.length})`);
  for (const f of result.forms) lines.push(`- ${f.method} → \`${f.action}\` fields: ${f.fields.join(', ') || '-'}${f.fileUpload ? ' · FILE UPLOAD' : ''}${f.captcha ? ' · captcha' : ''}`);
  lines.push('');
  lines.push(`## Scripts (${result.scripts.length})`);
  for (const s of result.scripts) lines.push(`- ${s.thirdParty ? '3rd-party' : '1st-party'} ${s.src}${s.sri ? ' (SRI)' : ''}`);
  lines.push('');
  lines.push(`## Cookies (${result.cookies.length})`);
  for (const c of result.cookies) lines.push(`- ${c.name}: HttpOnly=${c.httpOnly} Secure=${c.secure} SameSite=${c.sameSite}`);
  lines.push('');
  lines.push(`## Same-origin links found on start page (${result.links.length})`);
  for (const l of result.links.slice(0, 40)) lines.push(`- ${l}`);
  return lines.join('\n');
}

(async () => {
  await checkHttps();
  const main = await req(START.href, { redirect: 'follow' });
  if (main.error) {
    console.error(`Cannot fetch ${START.href}: ${main.error}`);
    process.exit(2);
  }
  result.finalUrl = main.url;
  result.status = main.status;
  analyzeHeaders(main.headers);
  analyzeCookies(main.headers);
  analyzeHtml(main.text, main.url);
  await scanScripts();
  await probeFiles();
  await checkCors();
  await platformChecks();
  result.tech = [...new Set(result.tech)];
  const md = renderMarkdown();
  console.log(md);
  if (OUT) {
    const fs = await import('node:fs');
    fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
    console.log(`\nJSON saved to ${OUT}`);
  }
})();
