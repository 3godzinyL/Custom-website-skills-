import crypto from 'node:crypto';

// scrypt parameters: N=2^15, r=8, p=1 (~32 MB of memory per hash).
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;

/**
 * @param {string} password @param {Buffer} salt @param {number} len @param {crypto.ScryptOptions} opts
 * @returns {Promise<Buffer>}
 */
const scrypt = (password, salt, len, opts) =>
  new Promise((resolve, reject) => crypto.scrypt(password, salt, len, opts, (err, key) => (err ? reject(err) : resolve(key))));

/** @param {number} bytes */
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

/** @param {string} value */
export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

/** @param {string} secret @param {string} value */
export const hmac = (secret, value) => crypto.createHmac('sha256', secret).update(value).digest('hex');

/** @param {string} a @param {string} b */
export function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** @param {string} password */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, KEY_LEN, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/** @param {string} password @param {string} stored */
export async function verifyPassword(password, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return crypto.timingSafeEqual(key, expected);
}

// A fixed hash used to equalise response timing when an e-mail address is unknown.
let dummyHash = '';
export async function dummyVerify() {
  if (!dummyHash) dummyHash = await hashPassword(randomToken(12));
  await verifyPassword('not-the-password', dummyHash);
}

// Crockford base32 without ambiguous characters (no I, L, O, U).
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** 16 random symbols = 80 bits of entropy, formatted KDG-XXXX-XXXX-XXXX-XXXX. */
export function generateInviteCode() {
  const bytes = crypto.randomBytes(16);
  let out = '';
  for (const b of bytes) out += ALPHABET[b & 31];
  return `KDG-${(out.match(/.{4}/g) || []).join('-')}`;
}

/**
 * Normalises user input of an invite code (case, spaces, ambiguous glyphs).
 * @param {unknown} input
 */
export function normalizeInviteCode(input) {
  const cleaned = String(input || '')
    .toUpperCase()
    .replace(/[\s_]/g, '')
    .replace(/^KDG-?/, '')
    .replace(/-/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  if (!/^[0-9A-HJKMNP-TV-Z]{16}$/.test(cleaned)) return null;
  return `KDG-${(cleaned.match(/.{4}/g) || []).join('-')}`;
}

/**
 * Coarse IP prefix for audit purposes (full addresses are never stored).
 * @param {string | undefined} ip
 */
export function ipPrefix(ip) {
  const v = String(ip || '').replace(/^::ffff:/, '');
  if (v.includes('.')) return v.split('.').slice(0, 2).join('.') + '.x.x';
  if (v.includes(':')) return v.split(':').slice(0, 3).join(':') + '::/48';
  return '';
}
