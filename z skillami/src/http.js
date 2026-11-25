import fs from 'node:fs';
import path from 'node:path';

export class HttpError extends Error {
  constructor(status, code, message, extra) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export class Router {
  constructor() { this.routes = []; }
  add(method, pattern, ...handlers) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/\/:([a-zA-Z_]+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$');
    this.routes.push({ method, re, keys, handlers });
  }
  get(p, ...h) { this.add('GET', p, ...h); }
  post(p, ...h) { this.add('POST', p, ...h); }
  put(p, ...h) { this.add('PUT', p, ...h); }
  delete(p, ...h) { this.add('DELETE', p, ...h); }
  match(method, pathname) {
    let pathMatched = false;
    for (const r of this.routes) {
      const m = pathname.match(r.re);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== method && !(method === 'HEAD' && r.method === 'GET')) continue;
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { handlers: r.handlers, params };
    }
    return pathMatched ? { methodNotAllowed: true } : null;
  }
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function serializeCookie(name, value, opts = {}) {
  let c = `${name}=${encodeURIComponent(value)}; Path=${opts.path || '/'}`;
  if (opts.maxAge != null) c += `; Max-Age=${Math.floor(opts.maxAge)}`;
  if (opts.httpOnly !== false) c += '; HttpOnly';
  c += `; SameSite=${opts.sameSite || 'Lax'}`;
  if (opts.secure) c += '; Secure';
  return c;
}

export function readBody(req, limit = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let over = false;
    const chunks = [];
    if (Number(req.headers['content-length']) > limit) { req.resume(); reject(new HttpError(413, 'too_large')); return; }
    req.on('data', (c) => {
      if (over) return; // keep draining so the 413 answer reaches the client
      size += c.length;
      if (size > limit) { over = true; chunks.length = 0; reject(new HttpError(413, 'too_large')); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export async function readJson(req, limit) {
  const type = String(req.headers['content-type'] || '');
  // Requiring JSON blocks classic cross-site form posts (they can't send this content type without CORS preflight).
  if (!type.startsWith('application/json')) throw new HttpError(415, 'json_required');
  const raw = await readBody(req, limit);
  if (!raw.length) return {};
  try {
    const v = JSON.parse(raw.toString('utf8'));
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error();
    return v;
  } catch { throw new HttpError(400, 'bad_json'); }
}

export function securityHeaders(res, { production }) {
  res.setHeader('Content-Security-Policy', [
    // Google Fonts are the only third party; self-host them in production to drop these two hosts.
    "default-src 'self'", "script-src 'self'", "style-src 'self' https://fonts.googleapis.com", "img-src 'self' data:",
    "font-src 'self' https://fonts.gstatic.com", "connect-src 'self'", "manifest-src 'self'", "worker-src 'self'",
    "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
  ].join('; '));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(), microphone=(self)');
  if (production) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

export function send(res, status, body, type = 'text/html; charset=utf-8', headers = {}) {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': type, ...headers });
  res.end(res.req?.method === 'HEAD' ? undefined : body);
}
export function json(res, status, obj, headers = {}) {
  send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8', { 'Cache-Control': 'no-store', ...headers });
}
export function redirect(res, location, status = 303) {
  res.writeHead(status, { Location: location, 'Cache-Control': 'no-store' });
  res.end();
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg',
};

// Serves files from publicDir only; rejects traversal and dotfiles.
export function serveStatic(publicDir, req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return false; }
  if (rel.includes('\0') || rel.split('/').some((seg) => seg.startsWith('.'))) return false;
  const file = path.resolve(publicDir, '.' + rel);
  if (!file.startsWith(publicDir + path.sep)) return false;
  let st;
  try { st = fs.statSync(file); } catch { return false; }
  if (!st.isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  const type = TYPES[ext];
  if (!type) return false;
  const immutable = ext === '.woff2' || rel.startsWith('/icons/');
  const cache = rel === '/sw.js' ? 'no-cache' : immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
  const headers = { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': cache };
  if (rel === '/sw.js') headers['Service-Worker-Allowed'] = '/';
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end(), true;
  fs.createReadStream(file).pipe(res);
  return true;
}

export function clientIp(req, trustProxy) {
  if (trustProxy) {
    // The last hop is the one our own proxy appended; earlier entries are client-controlled.
    const hops = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
    const xf = hops[hops.length - 1];
    if (xf) return xf;
  }
  return req.socket.remoteAddress || 'unknown';
}

// Same-origin check for state-changing public requests (defense in depth with JSON-only bodies).
export function assertSameOrigin(req, baseUrl) {
  const origin = req.headers.origin;
  if (!origin) return; // non-browser clients / same-origin navigations in some browsers
  const host = req.headers.host;
  let ok = false;
  try {
    const o = new URL(origin);
    ok = o.host === host || origin === new URL(baseUrl).origin;
  } catch { ok = false; }
  if (!ok) throw new HttpError(403, 'bad_origin');
}
