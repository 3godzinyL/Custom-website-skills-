#!/usr/bin/env node
// Safe multi-role endpoint matrix — Node 18+, no dependencies.
// Sends ONLY GET (and one OPTIONS/GET with a foreign Origin per endpoint for CORS),
// sequentially, with a delay and a request cap. Use only on systems you may test,
// preferably staging, with TEST accounts.
//
// Usage:
//   node endpoint-matrix.mjs matrix.json [--out results.json] [--delay 200] [--max 2000]
//   node endpoint-matrix.mjs --from-routes routes.json --base https://staging.example.com [--roles roles.json] [--out results.json]
//
// matrix.json:
// { "base": "https://staging.example.com",
//   "roles": { "guest": {}, "userA": { "headers": { "Cookie": "sid=..." } }, "admin": { "headers": { "Authorization": "Bearer ..." } } },
//   "adminRoles": ["admin"],
//   "endpoints": [
//     { "path": "/api/orders/:id", "params": { "id": ["1042", "1043"] }, "owner": { "1042": "userA", "1043": "userB" } },
//     { "path": "/api/admin/users", "expect": { "guest": "deny", "userA": "deny", "admin": "allow" } },
//     { "path": "/api/products" } ] }

import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i > -1 && args[i + 1] ? args[i + 1] : d; };
const OUT = opt('--out', null);
const DELAY = Number(opt('--delay', 200));
const MAX = Number(opt('--max', 2000));
const TIMEOUT = 15000;
const UA = 'website-security-checker/endpoint-matrix (authorized audit)';
const SENSITIVE = /^(password|passwd|pass_hash|password_hash|hash|salt|token|access_token|refresh_token|api_?key|secret|client_secret|session|email|e_mail|phone|tel|mobile|address|street|zip|postcode|pesel|nip|iban|account_number|card|card_number|cvv|cvc|birth|dob|salary|cost|cost_price|purchase_price|margin|internal|internal_note|notes?|role|roles|is_?admin|permissions|ip|ip_address|stripe_customer|customer_id)$/i;

let cfg;
if (args.includes('--from-routes')) {
  const routes = JSON.parse(fs.readFileSync(opt('--from-routes'), 'utf8'));
  const base = opt('--base', null);
  if (!base) { console.error('--base is required with --from-routes'); process.exit(1); }
  const roles = args.includes('--roles') ? JSON.parse(fs.readFileSync(opt('--roles'), 'utf8')) : { guest: {} };
  const seen = new Set();
  const endpoints = [];
  const needParams = [];
  for (const r of routes.routes || []) {
    if (!['GET', 'ANY', 'ALL'].includes(r.method) || r.prefix) continue;
    if (seen.has(r.path)) continue;
    seen.add(r.path);
    if (/:/.test(r.path) || /\*/.test(r.path)) needParams.push(r.path);
    else endpoints.push({ path: r.path });
  }
  cfg = { base, roles, endpoints, adminRoles: Object.keys(roles).filter((k) => /admin/i.test(k)) };
  if (needParams.length) console.error(`Note: ${needParams.length} GET routes need parameter values — add them to a matrix.json:\n  ${needParams.slice(0, 30).join('\n  ')}${needParams.length > 30 ? '\n  …' : ''}`);
} else {
  if (!args[0] || args[0].startsWith('--')) {
    console.error('Usage: node endpoint-matrix.mjs matrix.json [--out results.json]  |  --from-routes routes.json --base URL [--roles roles.json]');
    process.exit(1);
  }
  cfg = JSON.parse(fs.readFileSync(args[0], 'utf8'));
}

const BASE = new URL(cfg.base);
const ROLES = cfg.roles && Object.keys(cfg.roles).length ? cfg.roles : { guest: {} };
const ADMIN = new Set(cfg.adminRoles || Object.keys(ROLES).filter((k) => /admin/i.test(k)));
let count = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, headers = {}, method = 'GET') {
  if (count >= MAX) return { error: 'request cap reached' };
  count++;
  await sleep(DELAY);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { method, headers: { 'User-Agent': UA, Accept: 'application/json, text/html;q=0.8, */*;q=0.5', ...headers }, redirect: 'manual', signal: ctrl.signal });
    const text = method === 'GET' ? (await res.text()).slice(0, 2_000_000) : '';
    return { status: res.status, headers: res.headers, text };
  } catch (e) {
    return { error: e.name === 'AbortError' ? 'timeout' : String(e.message || e) };
  } finally { clearTimeout(t); }
}

function sensitiveKeys(text) {
  let data;
  try { data = JSON.parse(text); } catch { return []; }
  const found = new Set();
  const walk = (v, depth) => {
    if (depth > 6 || v === null) return;
    if (Array.isArray(v)) { v.slice(0, 50).forEach((x) => walk(x, depth + 1)); return; }
    if (typeof v === 'object') for (const [k, val] of Object.entries(v)) { if (SENSITIVE.test(k)) found.add(k); walk(val, depth + 1); }
  };
  walk(data, 0);
  return [...found];
}
const fingerprint = (t) => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return `${t.length}:${h}`; };
const ok = (s) => s >= 200 && s < 300;
const denied = (s) => [401, 403, 404].includes(s) || (s >= 300 && s < 400);

function expand(ep) {
  const names = Object.keys(ep.params || {});
  if (!names.length) return [{ path: ep.path, values: {} }];
  let combos = [{}];
  for (const n of names) combos = combos.flatMap((c) => (ep.params[n] || []).map((v) => ({ ...c, [n]: v })));
  return combos.slice(0, 50).map((values) => ({ path: ep.path.replace(/:(\w+)\*?/g, (m, n) => encodeURIComponent(values[n] ?? m)), values }));
}

const results = [];
const flags = [];
const flag = (level, endpoint, text) => flags.push({ level, endpoint, text });

(async () => {
  for (const ep of cfg.endpoints || []) {
    for (const { path, values } of expand(ep)) {
      const url = new URL(path, BASE).href;
      const row = { endpoint: ep.path, url, values, byRole: {} };
      for (const [role, rc] of Object.entries(ROLES)) {
        const r = await get(url, rc.headers || {});
        if (r.error) { row.byRole[role] = { error: r.error }; continue; }
        const keys = ok(r.status) ? sensitiveKeys(r.text) : [];
        row.byRole[role] = { status: r.status, size: r.text.length, fp: fingerprint(r.text), sensitive: keys, cache: r.headers.get('cache-control') || '' };
        if (r.status >= 500) flag('medium', path, `${role}: HTTP ${r.status}${/(stack|traceback|\bat [\w.$<>]+ \(|exception|node_modules\/)/i.test(r.text) ? ' with stack trace' : ''}`);
      }
      const br = row.byRole;
      // expectations
      for (const [role, want] of Object.entries(ep.expect || {})) {
        const s = br[role]?.status;
        if (s === undefined) continue;
        if (want === 'deny' && ok(s)) flag('high', path, `${role} got ${s} but expected deny`);
        if (want === 'allow' && !ok(s)) flag('info', path, `${role} got ${s} but expected allow (check test setup)`);
      }
      // ownership / IDOR
      const ownerByValue = ep.owner || {};
      for (const v of Object.values(values)) {
        const owner = ownerByValue[v];
        if (!owner || !br[owner] || !ok(br[owner].status)) continue;
        for (const [role, x] of Object.entries(br)) {
          if (role === owner || ADMIN.has(role) || !x.status) continue;
          if (ok(x.status)) {
            const same = x.fp === br[owner].fp || Math.abs(x.size - br[owner].size) <= Math.max(20, br[owner].size * 0.05);
            flag(same ? 'high' : 'medium', path, `${role} can read object "${v}" owned by ${owner} (HTTP ${x.status}${same ? ', same content as owner' : ', different content — verify'})`);
          }
        }
      }
      // guest with sensitive data
      const guest = br.guest;
      if (guest && ok(guest.status) && guest.sensitive?.length) flag('high', path, `guest receives sensitive-looking fields: ${guest.sensitive.join(', ')}`);
      // protected route: non-admins identical to admin on admin-looking paths
      const adminRole = [...ADMIN].find((a) => br[a] && ok(br[a].status));
      if (adminRole && /admin|panel|dashboard|manage|staff|backoffice|export|users/i.test(path)) {
        for (const [role, x] of Object.entries(br)) {
          if (ADMIN.has(role) || !ok(x.status || 0)) continue;
          if (x.fp === br[adminRole].fp) flag('high', path, `${role} gets the same response as ${adminRole} on an admin-looking route`);
        }
      }
      // cacheable personal data
      for (const [role, x] of Object.entries(br)) {
        if (role === 'guest' || !ok(x.status || 0) || !x.sensitive?.length) continue;
        if (!/no-store|private/i.test(x.cache)) flag('low', path, `${role}: response with ${x.sensitive.slice(0, 3).join(', ')} lacks Cache-Control: no-store/private`);
      }
      // excessive data exposure hint
      for (const [role, x] of Object.entries(br)) if (ok(x.status || 0) && x.sensitive?.some((k) => /password|hash|salt|secret|token|api_?key|cvv|cvc|card_number/i.test(k))) flag('high', path, `${role}: response contains ${x.sensitive.filter((k) => /password|hash|salt|secret|token|api_?key|cvv|cvc|card_number/i.test(k)).join(', ')}`);
      results.push(row);
    }
    // CORS once per endpoint (first expanded URL), with the most privileged role
    const first = expand(ep)[0];
    const corsRole = [...ADMIN][0] || Object.keys(ROLES).find((k) => k !== 'guest') || 'guest';
    const c = await get(new URL(first.path, BASE).href, { ...(ROLES[corsRole]?.headers || {}), Origin: 'https://evil.example' });
    if (!c.error) {
      const acao = c.headers.get('access-control-allow-origin');
      const acac = c.headers.get('access-control-allow-credentials');
      if (acao === 'https://evil.example' && acac === 'true') flag('high', ep.path, 'CORS reflects arbitrary Origin with credentials');
      else if (acao === 'https://evil.example') flag('medium', ep.path, 'CORS reflects arbitrary Origin');
    }
  }

  const roles = Object.keys(ROLES);
  const order = { high: 0, medium: 1, low: 2, info: 3 };
  const md = [];
  md.push(`# Endpoint matrix: ${BASE.origin}`);
  md.push(`Endpoints: ${(cfg.endpoints || []).length} · URLs tested: ${results.length} · roles: ${roles.join(', ')} · requests: ${count}`);
  md.push('');
  md.push('> GET-only. Flags are leads to confirm manually.');
  md.push('');
  md.push('## Flags');
  if (!flags.length) md.push('- none');
  // group identical findings that differ only by the role at the start of the text
  const grouped = new Map();
  for (const f of flags) {
    const role = roles.find((r) => f.text.startsWith(r + ':') || f.text.startsWith(r + ' '));
    const rest = role ? f.text.slice(role.length).replace(/^:\s*/, ': ') : f.text;
    const k = `${f.level}|${f.endpoint}|${rest}`;
    if (!grouped.has(k)) grouped.set(k, { ...f, rest, roles: [] });
    if (role) grouped.get(k).roles.push(role);
  }
  for (const g of [...grouped.values()].sort((a, b) => order[a.level] - order[b.level])) {
    const who = g.roles.length ? `${g.roles.join(', ')}${g.rest.startsWith(':') ? '' : ' '}${g.rest.trimStart()}` : g.text;
    md.push(`- **${g.level.toUpperCase()}** \`${g.endpoint}\` — ${who}`);
  }
  md.push('');
  md.push('## Status by role');
  md.push(`| URL | ${roles.join(' | ')} |`);
  md.push(`|---|${roles.map(() => '---').join('|')}|`);
  for (const r of results) md.push(`| \`${new URL(r.url).pathname}\` | ${roles.map((x) => (r.byRole[x]?.error ? 'ERR' : `${r.byRole[x]?.status ?? '-'}${r.byRole[x]?.sensitive?.length ? '*' : ''}`)).join(' | ')} |`);
  md.push('');
  md.push('`*` = JSON contains sensitive-looking field names.');
  console.log(md.join('\n'));
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify({ base: BASE.origin, roles, results, flags, requests: count }, null, 2)); console.log(`\nJSON saved to ${OUT}`); }
})();
