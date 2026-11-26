#!/usr/bin/env node
// Map backend routes and frontend calls from source code, and diff them.
// Node 18+, no dependencies, read-only (never executes project code).
//
// Usage:
//   node map-routes.mjs <project-dir> [--out routes.json] [--ignore dir1,dir2] [--max-kb 1500]
//
// Detects: Express/Koa/Hono/Fastify-style routes, router mounts with full prefix chains
// (app.use('/api/admin', authMw, adminRoutes(deps)), named/namespace imports, factory
// functions, several factories per file, nested routers, Hono app.route(), Fastify
// register({ prefix })), raw Node http routing (pathname === '/x', startsWith('/api/')),
// Next.js app/pages API routes, Nuxt server/api, SvelteKit +server files, PHP entry points.
// Frontend calls: fetch, axios, API wrappers (api.post('/x'), client.get(...), $fetch,
// useFetch), XMLHttpRequest, jQuery, WebSocket, EventSource, sendBeacon and HTML forms.
// Extra leads: forms with a password field that are not method="post".
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

const AUTH_RE = /\b(auth\w*|authenticate\w*|requireAuth\w*|requireLogin|requireUser|requireAccess|requireOwner|requirePermission\w*|requireStaff|isAuthenticated|ensureAuth\w*|ensureLoggedIn|ensureSession|loadSession|sessionGuard|\w+Session|verifyToken|verifyJwt|jwtAuth|protect\w*|isAdmin|requireAdmin|adminOnly|onlyAdmin|requireRole|checkRole|hasRole|authorize|permit|passport\.authenticate|withAuth|getServerSession|currentUser|getToken|requireSession|checkSession|isLoggedIn|loggedIn|apiKey|requireApiKey|guard\w*)\b/i;
const METHODS = 'get|post|put|patch|delete|del|all|options|head';
// HTTP *clients*: in backend files these are outbound calls, never routes.
const CLIENT_LIBS = /^(axios|got|superagent|ky|fetch|request|needle|undici|ofetch|\$fetch|http|https)$/i;
// Names that hold data structures, not routers (avoid map.get('/x') false positives).
const NOT_ROUTER = /^(map|params|searchParams|headers|cache|store|localStorage|sessionStorage|formData|url|res|response|req|ctx|c|data|config|settings|cookies|query|body|env|process|object|obj|result|state)$/i;
// Typical names of frontend API wrappers.
const CLIENT_WRAPPER = /^(api|apiClient|client|http|httpClient|request|requests|fetcher|service|backend|server|rest|\$http|\$api|ky|axiosInstance|instance|ofetch)$/i;
const BACKEND_HINT = /from\s+['"](express|koa|@koa\/router|koa-router|hono|fastify|restify|@hapi\/hapi|polka|h3|elysia|itty-router)['"]|require\(\s*['"](express|koa|@koa\/router|koa-router|hono|fastify|restify|@hapi\/hapi|polka|h3)['"]\s*\)|\bexpress\.Router\(|\bnew\s+Router\(|\bRouter\(\s*\)|createServer\(|['"]node:http['"]/;
const SERVER_PATH = /(^|\/)(server|backend|services|functions|workers?|lib\/server|src\/server)\//i;
const FRONTEND_PATH = /(^|\/)(public|web|static|www|assets|client|frontend|src\/client|src\/components|src\/pages|resources\/js)\//i;

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
const mounts = []; // { file, line, prefix, caller, fn, target: { file, exportName?, varName? }, auth }
const globalAuthFiles = new Set();
const routerAuth = []; // { file, fn, routerVar, index } — r.use(requireUser) protects later routes on r
const skippedLarge = [];
const formLeads = [];

function normPath(p) {
  if (!p) return p;
  let s = p.trim();
  s = s.replace(/^https?:\/\/[^/]+/i, (m) => (m.includes('localhost') || m.includes('127.0.0.1') ? '' : m));
  s = s.split('?')[0].split('#')[0];
  s = s.replace(/\{\*(\w+)\}/g, ':$1*').replace(/\/\*(\w+)/g, '/:$1*'); // Express 5 wildcards: /{*rest}, /*splat
  s = s.replace(/\$\{[^}]*\}/g, ':param').replace(/\[\.\.\.(\w+)\]/g, ':$1*').replace(/\[(\w+)\]/g, ':$1');
  s = s.replace(/\/\d+(?=\/|$)/g, '/:param');
  s = s.replace(/\/{2,}/g, '/');
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s || '/';
}
const joinPath = (a, b) => normPath(`${a === '/' ? '' : a}/${b === '/' ? '' : b}`.replace(/\/{2,}/g, '/'));

function resolveImport(fromFile, spec) {
  if (!spec || !spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const noExt = base.replace(/\.(m?js|cjs|ts)$/, '');
  for (const c of [base, base + '.js', base + '.mjs', base + '.cjs', base + '.ts', noExt + '.ts', path.join(base, 'index.js'), path.join(base, 'index.ts'), path.join(base, 'index.mjs')]) {
    try { if (fs.statSync(c).isFile()) return c; } catch {}
  }
  return null;
}

// Index of the bracket that closes the one at `open` (skips strings and template literals).
function matchBracket(text, open, limit = 20000) {
  let depth = 0; let str = null; let esc = false;
  for (let i = open; i < text.length && i < open + limit; i++) {
    const ch = text[i];
    if (str) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === str) str = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { str = ch; continue; }
    if (ch === '/' && text[i + 1] === '/') { const nl = text.indexOf('\n', i); if (nl === -1) return -1; i = nl; continue; }
    if (ch === '/' && text[i + 1] === '*') { const end = text.indexOf('*/', i + 2); if (end === -1) return -1; i = end + 1; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}
// Split an argument list at top-level commas.
function splitArgs(s) {
  const out = []; let depth = 0; let str = null; let esc = false; let cur = '';
  for (const ch of s) {
    if (str) { cur += ch; if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === str) str = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { str = ch; cur += ch; continue; }
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// Top-level function ranges: export function x(…){…}, const x = (…) => {…}, exports.x = function…
function functionRanges(text) {
  const out = [];
  const re = /(?:^|\n)[ \t]*(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)?\s*\(|(?:^|\n)[ \t]*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b[^(]*\(|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)|(?:^|\n)[ \t]*(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b[^(]*\(|\([^)]*\)\s*=>)/g;
  for (const m of text.matchAll(re)) {
    const name = m[1] || m[2] || m[3] || 'default';
    const brace = text.indexOf('{', m.index + m[0].length - 1);
    if (brace === -1 || brace - (m.index + m[0].length) > 400) continue;
    const end = matchBracket(text, brace);
    if (end > brace) out.push({ name, start: m.index, end });
  }
  return out;
}
const enclosingFn = (ranges, idx) => {
  let best = null;
  for (const r of ranges) if (r.start <= idx && idx <= r.end && (!best || r.start >= best.start)) best = r;
  return best ? best.name : null;
};

function parseImports(file, text) {
  const imports = {}; // localName -> { file, exportName? , ns? }
  for (const m of text.matchAll(/import\s+([\s\S]{1,300}?)\s+from\s+['"]([^'"]+)['"]/g)) {
    const target = resolveImport(file, m[2]);
    if (!target) continue;
    const clause = m[1].trim();
    const named = clause.match(/\{([\s\S]*?)\}/);
    if (named) for (const part of named[1].split(',')) {
      const [orig, alias] = part.trim().split(/\s+as\s+/);
      if (orig) imports[(alias || orig).trim()] = { file: target, exportName: orig.trim() };
    }
    const ns = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
    if (ns) imports[ns[1]] = { file: target, ns: true };
    const def = clause.replace(/\{[\s\S]*?\}/, '').replace(/\*\s+as\s+[A-Za-z_$][\w$]*/, '').split(',')[0].trim();
    if (def && /^[A-Za-z_$][\w$]*$/.test(def)) imports[def] = { file: target };
  }
  for (const m of text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)(\.\w+)?/g)) {
    const target = resolveImport(file, m[2]);
    if (target) imports[m[1]] = m[3] && m[3] !== '.default' ? { file: target, exportName: m[3].slice(1) } : { file: target };
  }
  for (const m of text.matchAll(/(?:const|let|var)\s+\{([^}]+)\}\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const target = resolveImport(file, m[2]);
    if (!target) continue;
    for (const part of m[1].split(',')) {
      const [orig, alias] = part.trim().split(/\s*:\s*/);
      if (orig) imports[(alias || orig).trim()] = { file: target, exportName: orig.trim() };
    }
  }
  return imports;
}

// Resolve the router argument of a mount call to { file, exportName?, varName? }.
function resolveTarget(file, argText, imports) {
  const a = argText.trim();
  let m;
  if ((m = a.match(/^require\(\s*['"]([^'"]+)['"]\s*\)(?:\.(\w+))?/))) {
    const f = resolveImport(file, m[1]);
    return f ? { file: rel(f), exportName: m[2] && m[2] !== 'default' ? m[2] : undefined } : null;
  }
  if ((m = a.match(/^(?:await\s+)?import\(\s*['"]([^'"]+)['"]\s*\)/))) {
    const f = resolveImport(file, m[1]);
    return f ? { file: rel(f) } : null;
  }
  // ns.factory(deps) / ns.router
  if ((m = a.match(/^([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)/)) && imports[m[1]]?.ns) return { file: rel(imports[m[1]].file), exportName: m[2] };
  // name(deps) / name / name.routes() (koa-router) / name.default
  if ((m = a.match(/^(?:new\s+)?([A-Za-z_$][\w$]*)/))) {
    const name = m[1];
    const imp = imports[name];
    if (imp) return { file: rel(imp.file), exportName: imp.exportName };
    return { file: rel(file), varName: name }; // local router variable or local factory
  }
  return null;
}

function routeArgs(text, index, routePath) {
  const lines = text.slice(index, index + 600).split('\n');
  let acc = lines[0];
  for (let i = 1; i < lines.length && i < 5 && /[,(]\s*$/.test(acc); i++) acc += '\n' + lines[i];
  return acc.split(/=>|\bfunction\b/)[0].replace(routePath, '');
}

function scanBackend(file, text, kind) {
  const r = rel(file);
  const imports = parseImports(file, text);
  const ranges = functionRanges(text);

  // mounts: x.use('/prefix', mw…, router) · x.route('/prefix', subApp) (Hono) · x.register(plugin, { prefix })
  for (const m of text.matchAll(/\b([A-Za-z_$][\w$]*)\.(use|route|mount)\(\s*(['"`])(\/[^'"`]*)\3\s*,/g)) {
    const open = text.indexOf('(', m.index + m[1].length);
    const close = matchBracket(text, open);
    if (close === -1) continue;
    const parts = splitArgs(text.slice(open + 1, close));
    if (parts.length < 2) continue;
    if (m[2] === 'route' && /^\s*\)\s*\./.test(text.slice(close, close + 5))) continue; // express app.route('/x').get(...)
    const mw = parts.slice(1, -1);
    const last = parts[parts.length - 1];
    if (/^(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>|^(?:async\s+)?function\b/.test(last)) {
      // inline handler: app.use('/healthz', (req, res) => …) — a route, not a mount
      addRoute({ method: 'ANY', path: m[4], file: r, line: lineOf(text, m.index), kind: 'mount-handler', prefix: true, fn: enclosingFn(ranges, m.index), routerVar: m[1], authHint: mw.some((x) => AUTH_RE.test(x)) });
      continue;
    }
    if (/express\.static|serveStatic|sirv\(|static\(/.test(last)) continue;
    const target = resolveTarget(file, last, imports);
    const auth = mw.some((x) => AUTH_RE.test(x));
    if (auth) globalAuthFiles.add(`${r} (prefix ${m[4]})`);
    if (target) mounts.push({ file: r, line: lineOf(text, m.index), prefix: m[4], caller: m[1], fn: enclosingFn(ranges, m.index), target, auth });
  }
  for (const m of text.matchAll(/\b([A-Za-z_$][\w$]*)\.register\(\s*([^,()]+(?:\([^)]*\))?)\s*,\s*\{[^}]*prefix\s*:\s*['"`](\/[^'"`]*)['"`]/g)) {
    const target = resolveTarget(file, m[2], imports);
    if (target) mounts.push({ file: r, line: lineOf(text, m.index), prefix: m[3], caller: m[1], fn: enclosingFn(ranges, m.index), target, auth: false });
  }
  // router-level middleware without prefix: app.use(auth) / r.use(requireUser, requireCsrf)
  for (const m of text.matchAll(/\b([A-Za-z_$][\w$]*)\.use\(\s*(?!['"`])/g)) {
    const open = text.indexOf('(', m.index + m[1].length);
    const close = matchBracket(text, open);
    if (close === -1) continue;
    const parts = splitArgs(text.slice(open + 1, close));
    if (parts.some((x) => AUTH_RE.test(x.replace(/\(.*$/s, '')))) {
      globalAuthFiles.add(r);
      routerAuth.push({ file: r, fn: enclosingFn(ranges, m.index), routerVar: m[1], index: m.index });
    }
  }

  // express-like: x.get('/path', ...)
  const re = new RegExp(`\\b([A-Za-z_$][\\w$]*)\\.(${METHODS})\\(\\s*(['"\`])(\\/[^'"\`]*)\\3([^\\n]*)`, 'gi');
  for (const m of text.matchAll(re)) {
    const obj = m[1];
    if (CLIENT_LIBS.test(obj) || NOT_ROUTER.test(obj)) continue;
    if (kind !== 'backend' && CLIENT_WRAPPER.test(obj)) continue; // frontend wrapper call, handled in scanFrontend
    if (kind === 'frontend') continue;
    const method = m[2].toUpperCase() === 'DEL' ? 'DELETE' : m[2].toUpperCase();
    const fn = enclosingFn(ranges, m.index);
    const viaRouterMw = routerAuth.some((a) => a.file === r && a.fn === fn && a.routerVar === obj && a.index < m.index);
    addRoute({ method, path: m[4], file: r, line: lineOf(text, m.index), kind: 'router', fn, routerVar: obj, authHint: viaRouterMw || AUTH_RE.test(routeArgs(text, m.index, m[4])), authVia: viaRouterMw ? 'router middleware' : undefined });
  }
  // array of paths: app.get(['/app', '/app/{*rest}'], …)
  const reArr = new RegExp(`\\b([A-Za-z_$][\\w$]*)\\.(${METHODS})\\(\\s*\\[([^\\]]{1,300})\\]`, 'gi');
  for (const m of text.matchAll(reArr)) {
    if (CLIENT_LIBS.test(m[1]) || NOT_ROUTER.test(m[1]) || kind === 'frontend') continue;
    const method = m[2].toUpperCase() === 'DEL' ? 'DELETE' : m[2].toUpperCase();
    for (const p of m[3].matchAll(/(['"`])(\/[^'"`]*)\1/g)) addRoute({ method, path: p[2], file: r, line: lineOf(text, m.index), kind: 'router', fn: enclosingFn(ranges, m.index), routerVar: m[1], authHint: AUTH_RE.test(routeArgs(text, m.index, m[3])) });
  }
  // x.route('/path').get(...).post(...)
  for (const m of text.matchAll(/\b([A-Za-z_$][\w$]*)\.route\(\s*(['"`])(\/[^'"`]*)\2\s*\)([\s\S]{0,400}?)(;|\n\s*\n)/g)) {
    for (const mm of m[4].matchAll(new RegExp(`\\.(${METHODS})\\(`, 'gi'))) {
      addRoute({ method: mm[1].toUpperCase(), path: m[3], file: r, line: lineOf(text, m.index), kind: 'router', fn: enclosingFn(ranges, m.index), routerVar: m[1], authHint: AUTH_RE.test(m[4]) });
    }
  }
  // fastify.route({ method, url })
  for (const m of text.matchAll(/method\s*:\s*\[?\s*['"](\w+)['"][\s\S]{0,200}?url\s*:\s*['"](\/[^'"]+)['"]/g)) {
    addRoute({ method: m[1].toUpperCase(), path: m[2], file: r, line: lineOf(text, m.index), kind: 'fastify', fn: enclosingFn(ranges, m.index), authHint: AUTH_RE.test(text.slice(m.index, m.index + 400)) });
  }
  // raw node http: pathname === '/x', req.url === '/x', startsWith('/api/')
  if (kind === 'frontend') return;
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

function addRoute(rt) {
  rt.path = normPath(rt.path);
  routes.push(rt);
}

function scanFileRouting(file, text) {
  const r = rel(file);
  let m;
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
  // Next.js server actions are public POST endpoints too
  if (/^\s*['"]use server['"]/m.test(text)) {
    for (const x of text.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) {
      addRoute({ method: 'POST', path: `(server action) ${x[1]}`, file: r, line: lineOf(text, x.index), kind: 'server-action', authHint: AUTH_RE.test(text.slice(x.index, x.index + 1500)) });
    }
  }
  if ((m = r.match(/(?:^|\/)pages\/api\/(.*)\.(m?js|ts)$/))) {
    const p = '/api/' + m[1].replace(/\/?index$/, '');
    const methods = [...new Set([...text.matchAll(/method\s*===\s*['"](\w+)['"]/g)].map((x) => x[1].toUpperCase()))];
    for (const meth of methods.length ? methods : ['ANY']) addRoute({ method: meth, path: p, file: r, line: 1, kind: 'next-pages', authHint: AUTH_RE.test(text) });
  }
  if ((m = r.match(/(?:^|\/)server\/(api|routes)\/(.*?)(?:\.(get|post|put|patch|delete))?\.(m?js|ts)$/)) && /\b(defineEventHandler|eventHandler|defineCachedEventHandler)\(/.test(text)) {
    const p = (m[1] === 'api' ? '/api/' : '/') + m[2].replace(/\/?index$/, '');
    addRoute({ method: m[3] ? m[3].toUpperCase() : 'ANY', path: p, file: r, line: 1, kind: 'nuxt', authHint: AUTH_RE.test(text) });
  }
  if ((m = r.match(/(?:^|\/)src\/routes\/(.*?)\/?\+server\.(m?js|ts)$/))) {
    const segs = m[1].split('/').filter((s) => s && !/^\(.*\)$/.test(s));
    const methods = [...text.matchAll(/export\s+(?:async\s+)?(?:function\s+|const\s+)(GET|POST|PUT|PATCH|DELETE)\b/g)].map((x) => x[1]);
    for (const meth of methods.length ? methods : ['ANY']) addRoute({ method: meth, path: '/' + segs.join('/'), file: r, line: 1, kind: 'sveltekit', authHint: AUTH_RE.test(text) });
  }
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

function scanFrontend(file, text, kind) {
  const r = rel(file);
  const L = (i) => lineOf(text, i);
  for (const m of text.matchAll(/\bfetch\(\s*(['"`])([^'"`]+)\1([\s\S]{0,200}?)\)/g)) {
    const meth = (m[3].match(/method\s*:\s*['"](\w+)['"]/i) || [])[1];
    addCall({ method: meth ? meth.toUpperCase() : 'GET', url: m[2], file: r, line: L(m.index), via: 'fetch' });
  }
  for (const m of text.matchAll(/(?:\$fetch|useFetch|useLazyFetch|ofetch)\(\s*(['"`])([^'"`]+)\1([\s\S]{0,200}?)\)/g)) {
    const meth = (m[3].match(/method\s*:\s*['"](\w+)['"]/i) || [])[1];
    addCall({ method: meth ? meth.toUpperCase() : 'GET', url: m[2], file: r, line: L(m.index), via: 'fetch-helper' });
  }
  for (const m of text.matchAll(/\baxios(?:\.(get|post|put|patch|delete))?\(\s*(['"`])([^'"`]+)\2/g)) addCall({ method: (m[1] || 'GET').toUpperCase(), url: m[3], file: r, line: L(m.index), via: 'axios' });
  // API wrappers: api.post('/x'), client.get(`/x/${id}`), http.del('/x') — only in browser-side code
  if (kind === 'frontend' || kind === 'unknown') {
    for (const m of text.matchAll(/\b([A-Za-z_$][\w$]*)\.(get|post|put|patch|delete|del)\(\s*(['"`])((?:\$\{[^}]*\})?\/[^'"`]*)\3/g)) {
      if (!CLIENT_WRAPPER.test(m[1]) && !(kind === 'frontend' && !NOT_ROUTER.test(m[1]) && /api|client|http|service/i.test(m[1]))) continue;
      const meth = m[2].toUpperCase() === 'DEL' ? 'DELETE' : m[2].toUpperCase();
      addCall({ method: meth, url: m[4], file: r, line: L(m.index), via: `wrapper ${m[1]}` });
    }
    // any wrapper taking the method first: api('POST', '/x'), request('GET', `/x/${id}`)
    for (const m of text.matchAll(/\b([A-Za-z_$][\w$]*)\(\s*['"](GET|POST|PUT|PATCH|DELETE)['"]\s*,\s*(['"`])((?:\$\{[^}]*\})?\/[^'"`]*)\3/gi)) addCall({ method: m[2].toUpperCase(), url: m[4], file: r, line: L(m.index), via: `wrapper ${m[1]}()` });
    // helpers named after the verb: postJson('/api/x', d), getJSON(`/api/x/${id}`), apiDelete('/x')
    for (const m of text.matchAll(/\b([A-Za-z_$][\w$]*)\(\s*(['"`])((?:\$\{[^}]*\})?\/[^'"`]*)\2/g)) {
      const n = m[1];
      if (/^(fetch|require|import|axios|\$fetch|useFetch|useLazyFetch|ofetch|sendBeacon|matchAll|match|replace|split|startsWith|endsWith|includes|indexOf|test|join|resolve|URL|open|assign|push|redirect|render|t|e|h)$/.test(n)) continue;
      if (!/(post|put|patch|del|get|fetch|load|request|send|submit|call|json|api|http)/i.test(n)) continue;
      const meth = /post|send|submit|create/i.test(n) ? 'POST' : /put/i.test(n) ? 'PUT' : /patch/i.test(n) ? 'PATCH' : /del|remove/i.test(n) ? 'DELETE' : 'GET';
      addCall({ method: meth, url: m[3], file: r, line: L(m.index), via: `helper ${n}()` });
    }
    // navigations that hit backend routes: location.href = '/api/export.csv', window.open(`/x`)
    for (const m of text.matchAll(/(?:location(?:\.href)?\s*=|location\.(?:assign|replace)\(|window\.open\()\s*(['"`])(\/[^'"`]*)\1/g)) addCall({ method: 'GET', url: m[2], file: r, line: L(m.index), via: 'navigation' });
  }
  for (const m of text.matchAll(/\.open\(\s*['"](\w+)['"]\s*,\s*(['"`])([^'"`]+)\2/g)) addCall({ method: m[1].toUpperCase(), url: m[3], file: r, line: L(m.index), via: 'xhr' });
  for (const m of text.matchAll(/\$\.(get|post|getJSON|ajax)\(\s*(?:\{\s*url\s*:\s*)?(['"`])([^'"`]+)\2/g)) addCall({ method: m[1] === 'post' ? 'POST' : 'GET', url: m[3], file: r, line: L(m.index), via: 'jquery' });
  for (const m of text.matchAll(/new\s+(WebSocket|EventSource)\(\s*(['"`])([^'"`]+)\2/g)) addCall({ method: m[1] === 'WebSocket' ? 'WS' : 'SSE', url: m[3], file: r, line: L(m.index), via: m[1] });
  for (const m of text.matchAll(/sendBeacon\(\s*(['"`])([^'"`]+)\1/g)) addCall({ method: 'POST', url: m[2], file: r, line: L(m.index), via: 'beacon' });
  if (/<form\b/i.test(text)) { // HTML files and server-side templates in JS
    for (const m of text.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
      const action = (m[1].match(/action=["']([^"']+)["']/i) || [])[1];
      const meth = ((m[1].match(/method=["'](\w+)["']/i) || [])[1] || 'GET').toUpperCase();
      if (action && !action.includes('{{')) addCall({ method: meth, url: action, file: r, line: L(m.index), via: 'form' });
      if (meth !== 'POST' && /type=["']?password/i.test(m[2])) formLeads.push({ file: r, line: L(m.index), text: `form with a password field is ${meth} (no method="post") — if it submits before JS loads, the password lands in the URL, history and proxy logs` });
    }
  }
}

function fileKind(r, text) {
  if (BACKEND_HINT.test(text)) return 'backend';
  if (/\.(html?|vue|svelte|astro|jsx|tsx)$/i.test(r) || FRONTEND_PATH.test(r) || /\b(document|window)\.\w+/.test(text)) return 'frontend';
  if (SERVER_PATH.test(r)) return 'server'; // server-side code without a router import (services, API clients)
  return 'unknown';
}

for (const f of files) {
  let text;
  try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  if (text.length > 200000 && text.split('\n').length < 20) { skippedLarge.push(rel(f)); continue; } // minified
  const kind = fileKind(rel(f), text);
  scanBackend(f, text, kind);
  scanFileRouting(f, text);
  scanFrontend(f, text, kind);
}

// ---------- apply mount prefixes (full chains, several mounts per router) ----------
const sameFileMatches = (target, loc) => {
  if (loc.file !== target.file) return false;
  if (target.exportName) {
    if (loc.fn === target.exportName || loc.routerVar === target.exportName) return true;
    // exported router variable used at top level, or default export resolved by name
    const anyNamed = routes.some((x) => x.file === target.file && (x.fn === target.exportName || x.routerVar === target.exportName))
      || mounts.some((x) => x.file === target.file && (x.fn === target.exportName || x.caller === target.exportName));
    return !anyNamed;
  }
  if (target.varName) return loc.routerVar === target.varName || loc.fn === target.varName;
  return true;
};
function prefixesOf(loc, depth = 0, seen = new Set()) {
  if (depth > 8) return [{ prefix: '', auth: false }];
  const parents = mounts.filter((m) => !seen.has(m) && sameFileMatches(m.target, loc) && !(m.file === loc.file && m.line === loc.line));
  if (!parents.length) return [{ prefix: '', auth: false }];
  const out = [];
  for (const m of parents) {
    const s2 = new Set(seen); s2.add(m);
    for (const up of prefixesOf({ file: m.file, fn: m.fn, routerVar: m.caller, line: m.line }, depth + 1, s2)) {
      out.push({ prefix: joinPath(up.prefix || '/', m.prefix), auth: up.auth || m.auth, via: m });
    }
  }
  return out;
}
const expanded = [];
for (const rt of routes) {
  if (!['router', 'mount-handler', 'fastify'].includes(rt.kind)) { expanded.push(rt); continue; }
  const pre = prefixesOf({ file: rt.file, fn: rt.fn, routerVar: rt.routerVar, line: rt.line });
  for (const p of pre) {
    if (!p.prefix || p.prefix === '/') { expanded.push(rt); continue; }
    expanded.push({ ...rt, path: joinPath(p.prefix, rt.path), mounted: p.prefix, authHint: rt.authHint || p.auth, authVia: !rt.authHint && p.auth ? 'mount' : undefined });
  }
}

const key = (x) => `${x.method} ${x.path} ${x.file}:${x.line}`;
const uniq = (arr) => [...new Map(arr.map((x) => [key(x), x])).values()];
const R = uniq(expanded);
const C = uniq(calls);

function segMatch(routePath, callPath, isPrefix) {
  if (isPrefix) return callPath === routePath || callPath.startsWith(routePath.endsWith('/') ? routePath : routePath + '/') || routePath === '/';
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
const httpRoutes = R.filter((r) => r.path.startsWith('/'));
const callsWithoutRoute = internalCalls.filter((c) => !httpRoutes.some((r) => segMatch(r.path, c.path, r.prefix) && methodOk(r.method, c.method)));
const routesWithoutCall = R.filter((r) => r.kind !== 'mount-handler' && !internalCalls.some((c) => r.path.startsWith('/') && segMatch(r.path, c.path, r.prefix) && methodOk(r.method, c.method)));
const noAuthHint = R.filter((r) => !r.authHint);
const externalHosts = [...new Set(C.filter((c) => c.external).map((c) => { try { return new URL(c.raw.replace(/^wss?:/, 'https:')).host; } catch { return c.raw.slice(0, 60); } }))];
const notMatched = mounts.filter((m) => !routes.some((x) => sameFileMatches(m.target, { file: x.file, fn: x.fn, routerVar: x.routerVar })) && !mounts.some((x) => x !== m && sameFileMatches(m.target, { file: x.file, fn: x.fn, routerVar: x.caller })));
// A "mount" whose target file defines no routes at all is prefix middleware (noStore, loadSession…).
const fileHasRoutes = (f) => routes.some((x) => x.file === f && ['router', 'fastify'].includes(x.kind));
const middlewareMounts = notMatched.filter((m) => m.target.varName ? !routes.some((x) => x.file === m.target.file && x.routerVar === m.target.varName) && !/router|routes|api$/i.test(m.target.varName) : !fileHasRoutes(m.target.file));
const unresolvedMounts = notMatched.filter((m) => !middlewareMounts.includes(m));
for (const m of middlewareMounts) if (AUTH_RE.test(m.target.exportName || m.target.varName || '')) globalAuthFiles.add(`${m.file} (prefix ${m.prefix}: ${m.target.exportName || m.target.varName} — session/auth middleware, check what it enforces)`);

const result = { root: ROOT, filesScanned: files.length, routes: R, calls: C, mounts: mounts.filter((m) => !middlewareMounts.includes(m)), middlewareMounts, unresolvedMounts, globalAuthFiles: [...globalAuthFiles], callsWithoutRoute, routesWithoutCall, externalHosts, formLeads, skippedLarge };

const md = [];
md.push(`# Route map: ${ROOT}`);
md.push(`Files scanned: ${files.length} · backend routes: ${R.length} · frontend calls: ${C.length} (${internalCalls.length} internal) · router mounts: ${result.mounts.length} · prefix middleware: ${middlewareMounts.length}${unresolvedMounts.length ? ` · ${unresolvedMounts.length} unresolved mounts (see below)` : ''}`);
md.push('');
md.push('> Heuristic static analysis. "auth?" = an auth-like middleware/name appears near the route or on its mount; absence is a lead, not proof. Confirm every row against the running app.');
md.push('');
if (globalAuthFiles.size) { md.push('## Files with global/prefix auth middleware'); for (const g of globalAuthFiles) md.push(`- ${g}`); md.push(''); }
if (result.mounts.length) {
  md.push(`## Router mounts (${result.mounts.length})`);
  for (const m of result.mounts) md.push(`- \`${m.prefix}\` → ${m.target.file}${m.target.exportName ? `#${m.target.exportName}` : m.target.varName ? `#${m.target.varName}` : ''} (${m.file}:${m.line}${m.auth ? ', auth middleware on mount' : ''})`);
  md.push('');
}
md.push(`## Backend routes (${R.length})`);
md.push('| Method | Path | Where | Kind | auth? |');
md.push('|---|---|---|---|---|');
for (const r of [...R].sort((a, b) => a.path.localeCompare(b.path))) md.push(`| ${r.method} | \`${r.path}\`${r.prefix ? ' (prefix)' : ''} | ${r.file}:${r.line} | ${r.kind} | ${r.authHint ? (r.authVia === 'mount' ? 'yes (mount)' : 'yes') : '—'} |`);
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
if (formLeads.length) { md.push(`## Form leads (${formLeads.length})`); for (const f of formLeads) md.push(`- ${f.file}:${f.line} — ${f.text}`); md.push(''); }
if (unresolvedMounts.length) { md.push(`## Mounts whose router was not found (${unresolvedMounts.length}) — add these routes to the catalogue by hand`); for (const m of unresolvedMounts) md.push(`- \`${m.prefix}\` ← ${m.file}:${m.line}`); md.push(''); }
md.push(`## External hosts called (${externalHosts.length})`);
for (const h of externalHosts) md.push(`- ${h}`);
if (skippedLarge.length) { md.push(''); md.push(`Skipped minified files: ${skippedLarge.length}`); }
console.log(md.join('\n'));
if (OUT) { fs.writeFileSync(OUT, JSON.stringify(result, null, 2)); console.log(`\nJSON saved to ${OUT}`); }
