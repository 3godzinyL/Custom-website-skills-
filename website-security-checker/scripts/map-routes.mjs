#!/usr/bin/env node
// Map backend routes and frontend calls from source code, and diff them.
// Node 18+, no dependencies, read-only (never executes project code).
//
// Usage:
//   node map-routes.mjs <project-dir> [--out routes.json] [--ignore dir1,dir2] [--max-kb 1500]
//
// Detects: Express/Koa/Hono/Fastify-style routes (+ simple router mounts), raw Node http
// routing (pathname === '/x', startsWith('/api/')), Next.js app/pages API routes, Nuxt
// server/api, SvelteKit +server files, PHP entry points; frontend calls via fetch, axios,
// XMLHttpRequest, jQuery, WebSocket, EventSource, sendBeacon and HTML forms.
// Output: Markdown summary on stdout, full JSON with --out. Results are leads to verify.

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) {
  console.error('Usage: node map-routes.mjs <project-dir> [--out routes.json] [--ignore a,b] [--max-kb 1500]');
  process.exit(1);
}
const opt = (n, d) => { const i = args.indexOf(n); return i > -1 && args[i + 1] ? args[i + 1] : d; };
const ROOT = path.resolve(args[0]);
const OUT = opt('--out', null);
const MAX_BYTES = Number(opt('--max-kb', 1500)) * 1024;
const DEFAULT_IGNORE = ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.svelte-kit', '.output', 'coverage', 'vendor', '.cache', 'target', 'out', '.turbo', '.vercel', '.netlify'];
const IGNORE = new Set([...DEFAULT_IGNORE, ...String(opt('--ignore', '')).split(',').map((s) => s.trim()).filter(Boolean)]);
const IGNORE_GLOBS = [...IGNORE].filter((s) => s.includes('*')).map((g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'));
const EXT = /\.(m?js|cjs|ts|tsx|jsx|vue|svelte|astro|php|html?)$/i;
const SKIP_FILE = /(\.min\.js|\.bundle\.js|\.test\.|\.spec\.|\.d\.ts$)/i;

const AUTH_RE = /\b(auth\w*|authenticate\w*|requireAuth\w*|requireLogin|requireUser|isAuthenticated|ensureAuth\w*|ensureLoggedIn|verifyToken|verifyJwt|jwtAuth|protect\w*|isAdmin|requireAdmin|adminOnly|onlyAdmin|requireRole|checkRole|hasRole|authorize|permit|passport\.authenticate|withAuth|getServerSession|currentUser|getToken|requireSession|checkSession|isLoggedIn|loggedIn|apiKey|requireApiKey|guard\w*)\b/i;
const METHODS = 'get|post|put|patch|delete|del|all|options|head';

const files = [];
function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (IGNORE.has(e.name) || IGNORE_GLOBS.some((g) => g.test(e.name))) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (EXT.test(e.name) && !SKIP_FILE.test(e.name)) {
      try { if (fs.statSync(p).size <= MAX_BYTES) files.push(p); } catch {}
    }
  }
}
walk(ROOT);

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;
const routes = [];
const calls = [];
const mounts = []; // { file, prefix, target }
const globalAuthFiles = new Set();
const skippedLarge = [];

function normPath(p) {
  if (!p) return p;
  let s = p.trim();
  s = s.replace(/^https?:\/\/[^/]+/i, (m) => (m.includes('localhost') || m.includes('127.0.0.1') ? '' : m));
  s = s.split('?')[0].split('#')[0];
  s = s.replace(/\$\{[^}]*\}/g, ':param').replace(/\[\.\.\.(\w+)\]/g, ':$1*').replace(/\[(\w+)\]/g, ':$1');
  s = s.replace(/\/\d+(?=\/|$)/g, '/:param');
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s || '/';
}

function addRoute(r) {
  r.path = normPath(r.path);
  routes.push(r);
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [base, base + '.js', base + '.mjs', base + '.cjs', base + '.ts', path.join(base, 'index.js'), path.join(base, 'index.ts')]) {
    try { if (fs.statSync(c).isFile()) return c; } catch {}
  }
  return null;
}

// Text of a route definition's middleware list: from the match to the handler start
// (first "=>" or "function"), following continuation lines that end with "," or "(".
function routeArgs(text, index, routePath) {
  const lines = text.slice(index, index + 600).split('\n');
  let acc = lines[0];
  for (let i = 1; i < lines.length && i < 5 && /[,(]\s*$/.test(acc); i++) acc += '\n' + lines[i];
  return acc.split(/=>|\bfunction\b/)[0].replace(routePath, '');
}

function scanBackend(file, text) {
  const r = rel(file);
  // imports: name -> file
  const imports = {};
  for (const m of text.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g)) imports[m[1]] = resolveImport(file, m[2]);
  for (const m of text.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g)) imports[m[1]] = resolveImport(file, m[2]);

  // router mounts: app.use('/api', router)
  for (const m of text.matchAll(/\b\w+\.use\(\s*['"`](\/[^'"`]*)['"`]\s*,\s*([\s\S]{0,200}?)\)/g)) {
    const prefix = m[1];
    const argsText = m[2];
    if (AUTH_RE.test(argsText)) globalAuthFiles.add(`${r} (prefix ${prefix})`);
    const names = argsText.split(',').map((s) => s.trim().replace(/\(.*$/, '')).filter(Boolean);
    const last = names[names.length - 1];
    const inline = argsText.match(/require\(\s*['"]([^'"]+)['"]\s*\)/);
    const target = inline ? resolveImport(file, inline[1]) : imports[last];
    if (target) mounts.push({ file: r, prefix, target: rel(target) });
  }
  // global middleware: app.use(auth) / router.use(requireAuth)
  for (const m of text.matchAll(/\b\w+\.use\(\s*([A-Za-z_$][\w.$]*)\s*[,)]/g)) if (AUTH_RE.test(m[1])) globalAuthFiles.add(r);

  // express-like: x.get('/path', ...)
  const re = new RegExp(`\\b([A-Za-z_$][\\w$]*)\\.(${METHODS})\\(\\s*(['"\`])(\\/[^'"\`]*)\\3([^\\n]*)`, 'gi');
  for (const m of text.matchAll(re)) {
    const obj = m[1];
    if (/^(axios|http|https|request|got|superagent|ky|fetch|\$|jQuery|client|api|map|params|searchParams|headers|cache|store|localStorage|sessionStorage|formData|url|res|response|req|request)$/i.test(obj)) continue;
    const method = m[2].toUpperCase() === 'DEL' ? 'DELETE' : m[2].toUpperCase();
    addRoute({ method, path: m[4], file: r, line: lineOf(text, m.index), kind: 'router', authHint: AUTH_RE.test(routeArgs(text, m.index, m[4])) });
  }
  // x.route('/path').get(...).post(...)
  for (const m of text.matchAll(/\.route\(\s*(['"`])(\/[^'"`]*)\1\s*\)([\s\S]{0,400}?)(;|\n\s*\n)/g)) {
    for (const mm of m[3].matchAll(new RegExp(`\\.(${METHODS})\\(`, 'gi'))) {
      addRoute({ method: mm[1].toUpperCase(), path: m[2], file: r, line: lineOf(text, m.index), kind: 'router', authHint: AUTH_RE.test(m[3]) });
    }
  }
  // fastify.route({ method, url })
  for (const m of text.matchAll(/method\s*:\s*\[?\s*['"](\w+)['"][\s\S]{0,200}?url\s*:\s*['"](\/[^'"]+)['"]/g)) {
    addRoute({ method: m[1].toUpperCase(), path: m[2], file: r, line: lineOf(text, m.index), kind: 'fastify', authHint: AUTH_RE.test(text.slice(m.index, m.index + 400)) });
  }
  // raw node http: pathname === '/x', req.url === '/x', startsWith('/api/')
  const rawRe = /(?:pathname|req\.url|request\.url|url\.pathname|urlPath|route|p)\s*===\s*(['"`])(\/[^'"`]*)\1|(?:pathname|req\.url|url\.pathname|urlPath|p)\.startsWith\(\s*(['"`])(\/[^'"`]*)\3\s*\)/g;
  for (const m of text.matchAll(rawRe)) {
    const p = m[2] || m[4];
    const lineStart = text.lastIndexOf('\n', m.index) + 1;
    const lineEnd = text.indexOf('\n', m.index);
    const lineText = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    const meth = lineText.match(/method\s*===\s*['"](\w+)['"]/i);
    const ahead = text.slice(m.index, m.index + 400).split('\n').slice(0, 3).join('\n').replace(p, '');
    addRoute({ method: meth ? meth[1].toUpperCase() : 'ANY', path: p, file: r, line: lineOf(text, m.index), kind: m[4] ? 'raw-prefix' : 'raw', prefix: Boolean(m[4]), authHint: AUTH_RE.test(ahead) });
  }
}

function scanFileRouting(file, text) {
  const r = rel(file);
  let m;
  // Next.js app router
  if ((m = r.match(/(?:^|\/)app\/(.*?)\/?route\.(m?js|ts)$/))) {
    const segs = m[1].split('/').filter((s) => s && !/^\(.*\)$/.test(s) && !s.startsWith('@'));
    const p = '/' + segs.join('/');
    const exps = [...text.matchAll(/export\s+(?:async\s+)?(?:function\s+|const\s+)(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)];
    if (!exps.length) addRoute({ method: 'ANY', path: p, file: r, line: 1, kind: 'next-app', authHint: AUTH_RE.test(text) });
    exps.forEach((x, i) => {
      const body = text.slice(x.index, exps[i + 1] ? exps[i + 1].index : undefined);
      addRoute({ method: x[1], path: p, file: r, line: lineOf(text, x.index), kind: 'next-app', authHint: AUTH_RE.test(body.replace(/^export\s+(?:async\s+)?(?:function\s+|const\s+)\w+/, '')) });
    });
  }
  // Next.js pages api
  if ((m = r.match(/(?:^|\/)pages\/api\/(.*)\.(m?js|ts)$/))) {
    const p = '/api/' + m[1].replace(/\/?index$/, '');
    const methods = [...new Set([...text.matchAll(/method\s*===\s*['"](\w+)['"]/g)].map((x) => x[1].toUpperCase()))];
    for (const meth of methods.length ? methods : ['ANY']) addRoute({ method: meth, path: p, file: r, line: 1, kind: 'next-pages', authHint: AUTH_RE.test(text) });
  }
  // Nuxt server/api
  if ((m = r.match(/(?:^|\/)server\/(api|routes)\/(.*?)(?:\.(get|post|put|patch|delete))?\.(m?js|ts)$/))) {
    const p = (m[1] === 'api' ? '/api/' : '/') + m[2].replace(/\/?index$/, '');
    addRoute({ method: m[3] ? m[3].toUpperCase() : 'ANY', path: p, file: r, line: 1, kind: 'nuxt', authHint: AUTH_RE.test(text) });
  }
  // SvelteKit
  if ((m = r.match(/(?:^|\/)src\/routes\/(.*?)\/?\+server\.(m?js|ts)$/))) {
    const segs = m[1].split('/').filter((s) => s && !/^\(.*\)$/.test(s));
    const methods = [...text.matchAll(/export\s+(?:async\s+)?(?:function\s+|const\s+)(GET|POST|PUT|PATCH|DELETE)\b/g)].map((x) => x[1]);
    for (const meth of methods.length ? methods : ['ANY']) addRoute({ method: meth, path: '/' + segs.join('/'), file: r, line: 1, kind: 'sveltekit', authHint: AUTH_RE.test(text) });
  }
  // PHP entry points reading input
  if (/\.php$/i.test(r) && /\$_(GET|POST|REQUEST|FILES)\b/.test(text)) {
    addRoute({ method: /\$_POST|\$_FILES/.test(text) ? 'POST' : 'GET', path: '/' + r, file: r, line: 1, kind: 'php', authHint: /\$_SESSION|is_user_logged_in|current_user_can|auth/i.test(text) });
  }
}

function addCall(c) {
  const raw = c.url;
  if (!raw || /^(data:|blob:|mailto:|tel:|#|javascript:)/i.test(raw)) return;
  const external = /^https?:\/\//i.test(raw) && !/localhost|127\.0\.0\.1/i.test(raw);
  const wsExternal = /^wss?:\/\//i.test(raw);
  calls.push({ ...c, raw, path: external || wsExternal ? raw.split('?')[0] : normPath(raw.replace(/^\$\{[^}]*\}/, '')), external: external || wsExternal });
}

function scanFrontend(file, text) {
  const r = rel(file);
  const L = (i) => lineOf(text, i);
  for (const m of text.matchAll(/\bfetch\(\s*(['"`])([^'"`]+)\1([\s\S]{0,200}?)\)/g)) {
    const meth = (m[3].match(/method\s*:\s*['"](\w+)['"]/i) || [])[1];
    addCall({ method: meth ? meth.toUpperCase() : 'GET', url: m[2], file: r, line: L(m.index), via: 'fetch' });
  }
  for (const m of text.matchAll(/\baxios(?:\.(get|post|put|patch|delete))?\(\s*(['"`])([^'"`]+)\2/g)) addCall({ method: (m[1] || 'GET').toUpperCase(), url: m[3], file: r, line: L(m.index), via: 'axios' });
  for (const m of text.matchAll(/\.open\(\s*['"](\w+)['"]\s*,\s*(['"`])([^'"`]+)\2/g)) addCall({ method: m[1].toUpperCase(), url: m[3], file: r, line: L(m.index), via: 'xhr' });
  for (const m of text.matchAll(/\$\.(get|post|getJSON|ajax)\(\s*(?:\{\s*url\s*:\s*)?(['"`])([^'"`]+)\2/g)) addCall({ method: m[1] === 'post' ? 'POST' : 'GET', url: m[3], file: r, line: L(m.index), via: 'jquery' });
  for (const m of text.matchAll(/new\s+(WebSocket|EventSource)\(\s*(['"`])([^'"`]+)\2/g)) addCall({ method: m[1] === 'WebSocket' ? 'WS' : 'SSE', url: m[3], file: r, line: L(m.index), via: m[1] });
  for (const m of text.matchAll(/sendBeacon\(\s*(['"`])([^'"`]+)\1/g)) addCall({ method: 'POST', url: m[2], file: r, line: L(m.index), via: 'beacon' });
  if (/\.(html?|php|vue|svelte|astro|jsx|tsx)$/i.test(r)) {
    for (const m of text.matchAll(/<form\b([^>]*)>/gi)) {
      const action = (m[1].match(/action=["']([^"']+)["']/i) || [])[1];
      const meth = ((m[1].match(/method=["'](\w+)["']/i) || [])[1] || 'GET').toUpperCase();
      if (action && !action.includes('{{')) addCall({ method: meth, url: action, file: r, line: L(m.index), via: 'form' });
    }
  }
}

for (const f of files) {
  let text;
  try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  if (text.length > 200000 && text.split('\n').length < 20) { skippedLarge.push(rel(f)); continue; } // minified
  scanBackend(f, text);
  scanFileRouting(f, text);
  scanFrontend(f, text);
}

// apply simple mount prefixes
for (const mt of mounts) {
  for (const rt of routes) {
    if (rt.file === mt.target && rt.kind === 'router' && !rt.mounted) {
      rt.path = normPath((mt.prefix === '/' ? '' : mt.prefix) + rt.path);
      rt.mounted = mt.prefix;
    }
  }
}

// dedupe
const key = (x) => `${x.method} ${x.path} ${x.file}:${x.line}`;
const uniq = (arr) => [...new Map(arr.map((x) => [key(x), x])).values()];
const R = uniq(routes);
const C = uniq(calls);

function segMatch(routePath, callPath, isPrefix) {
  if (isPrefix) return callPath.startsWith(routePath);
  const a = routePath.split('/');
  const b = callPath.split('/');
  if (a.some((s) => s.endsWith('*') || s === '*' || s === '(.*)')) {
    const fixed = a.findIndex((s) => s.endsWith('*') || s === '*' || s === '(.*)');
    return a.slice(0, fixed).every((s, i) => s === b[i] || s.startsWith(':') || (b[i] || '').startsWith(':'));
  }
  if (a.length !== b.length) return false;
  return a.every((s, i) => s === b[i] || s.startsWith(':') || b[i].startsWith(':') || s === '*');
}
const methodOk = (rm, cm) => rm === 'ANY' || rm === 'ALL' || cm === 'WS' || cm === 'SSE' || rm === cm || (rm === 'GET' && cm === 'HEAD');

const internalCalls = C.filter((c) => !c.external && c.path.startsWith('/'));
const callsWithoutRoute = internalCalls.filter((c) => !R.some((r) => segMatch(r.path, c.path, r.prefix) && methodOk(r.method, c.method)));
const routesWithoutCall = R.filter((r) => !internalCalls.some((c) => segMatch(r.path, c.path, r.prefix) && methodOk(r.method, c.method)));
const noAuthHint = R.filter((r) => !r.authHint);
const externalHosts = [...new Set(C.filter((c) => c.external).map((c) => { try { return new URL(c.raw.replace(/^wss?:/, 'https:')).host; } catch { return c.raw.slice(0, 60); } }))];

const result = { root: ROOT, filesScanned: files.length, routes: R, calls: C, mounts, globalAuthFiles: [...globalAuthFiles], callsWithoutRoute, routesWithoutCall, externalHosts, skippedLarge };

const md = [];
md.push(`# Route map: ${ROOT}`);
md.push(`Files scanned: ${files.length} · backend routes: ${R.length} · frontend calls: ${C.length} (${internalCalls.length} internal) · router mounts: ${mounts.length}`);
md.push('');
md.push('> Heuristic static analysis. "auth?" = an auth-like middleware/name appears near the route; absence is a lead, not proof. Global middleware files listed below may protect routes registered after them.');
md.push('');
if (globalAuthFiles.size) { md.push('## Files with global/prefix auth middleware'); for (const g of globalAuthFiles) md.push(`- ${g}`); md.push(''); }
md.push(`## Backend routes (${R.length})`);
md.push('| Method | Path | Where | Kind | auth? |');
md.push('|---|---|---|---|---|');
for (const r of [...R].sort((a, b) => a.path.localeCompare(b.path))) md.push(`| ${r.method} | \`${r.path}\`${r.prefix ? ' (prefix)' : ''} | ${r.file}:${r.line} | ${r.kind} | ${r.authHint ? 'yes' : '—'} |`);
md.push('');
md.push(`## Frontend calls without a matching backend route (${callsWithoutRoute.length})`);
for (const c of callsWithoutRoute) md.push(`- ${c.method} \`${c.path}\` ← ${c.file}:${c.line} (${c.via})`);
md.push('');
md.push(`## Backend routes no frontend call uses (${routesWithoutCall.length}) — check: admin, debug, legacy, webhooks, or called from elsewhere`);
for (const r of routesWithoutCall) md.push(`- ${r.method} \`${r.path}\` — ${r.file}:${r.line}${r.authHint ? '' : ' · no auth hint'}`);
md.push('');
md.push(`## Routes without auth hint (${noAuthHint.length})`);
md.push(noAuthHint.length > 60 ? `(${noAuthHint.length} routes — see JSON; review the ones touching data, money or admin)` : noAuthHint.map((r) => `- ${r.method} \`${r.path}\` — ${r.file}:${r.line}`).join('\n'));
md.push('');
md.push(`## External hosts called (${externalHosts.length})`);
for (const h of externalHosts) md.push(`- ${h}`);
if (skippedLarge.length) { md.push(''); md.push(`Skipped minified files: ${skippedLarge.length}`); }
console.log(md.join('\n'));
if (OUT) { fs.writeFileSync(OUT, JSON.stringify(result, null, 2)); console.log(`\nJSON saved to ${OUT}`); }
