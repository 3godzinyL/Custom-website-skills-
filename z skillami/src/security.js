import crypto from 'node:crypto';

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function hmacHex(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Deterministic private link key: can be re-created for any e-mail without storing it in plain text.
export function linkKey(secret, scope, id) {
  return crypto.createHmac('sha256', secret).update(`${scope}:${id}`).digest('base64url');
}

// --- passwords (scrypt, per-user salt) ---
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${salt.toString('base64')}$${key.toString('base64')}`;
}
export function verifyPassword(pw, stored) {
  const [alg, n, saltB, keyB] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const key = Buffer.from(keyB, 'base64');
  const test = crypto.scryptSync(pw, Buffer.from(saltB, 'base64'), key.length, { N: Number(n), r: SCRYPT.r, p: SCRYPT.p });
  return crypto.timingSafeEqual(key, test);
}
// Used when the user doesn't exist, so login timing doesn't reveal valid e-mails.
export const DUMMY_HASH = hashPassword(randomToken(12));

// --- TOTP (RFC 6238, SHA-1, 6 digits, 30 s) ---
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
export function base32Decode(str) {
  const clean = str.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error('bad base32');
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}
export const newTotpSecret = () => base32Encode(crypto.randomBytes(20));
export function totpCode(secret, time = Date.now(), step = 30) {
  const counter = Math.floor(time / 1000 / step);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 15;
  const code = ((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
  return code;
}
/** Returns the matched time step (to reject reuse) or null. */
export function totpMatch(secret, code, time = Date.now(), step = 30) {
  if (!secret || !/^\d{6}$/.test(String(code || ''))) return null;
  const base = Math.floor(time / 1000 / step);
  for (const drift of [-1, 0, 1]) if (safeEqual(totpCode(secret, time + drift * step * 1000), code)) return base + drift;
  return null;
}
export function verifyTotp(secret, code, time = Date.now()) {
  if (!/^\d{6}$/.test(String(code || ''))) return false;
  for (const drift of [-1, 0, 1]) if (safeEqual(totpCode(secret, time + drift * 30_000), code)) return true;
  return false;
}

// --- e-mail ---
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;
export function validEmail(e) {
  return typeof e === 'string' && e.length <= 254 && EMAIL_RE.test(e);
}
// Same person can't take many queue spots via "+tags" or Gmail dots.
export function emailKey(e) {
  const [local, domain] = e.trim().toLowerCase().split('@');
  let l = local.split('+')[0];
  const d = domain === 'googlemail.com' ? 'gmail.com' : domain;
  if (d === 'gmail.com') l = l.replace(/\./g, '');
  return `${l}@${d}`;
}

// --- rate limiting (fixed window, in memory) ---
export class RateLimiter {
  // scale > 1 only for automated tests (RATE_LIMIT_SCALE); production uses 1.
  constructor(scale = 1) { this.buckets = new Map(); this.scale = scale; }
  hit(key, limit, windowMs) {
    limit = Math.ceil(limit * this.scale);
    const t = Date.now();
    let b = this.buckets.get(key);
    if (!b || b.reset <= t) { b = { n: 0, reset: t + windowMs }; this.buckets.set(key, b); }
    b.n++;
    if (this.buckets.size > 50_000) this.sweep();
    return { ok: b.n <= limit, retryAfter: Math.ceil((b.reset - t) / 1000) };
  }
  sweep() { const t = Date.now(); for (const [k, b] of this.buckets) if (b.reset <= t) this.buckets.delete(k); }
}

// --- misc ---
export function validNip(nip) {
  const d = String(nip).replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(d)) return false;
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = w.reduce((s, x, i) => s + x * Number(d[i]), 0);
  return sum % 11 === Number(d[9]);
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// CSV cell that can't be interpreted as a formula by Excel/Sheets.
export function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
