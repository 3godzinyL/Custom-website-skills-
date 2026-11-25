import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Minimal .env loader (no dependency). Real environment variables win.
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || m[1] in process.env) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export function loadConfig(overrides = {}) {
  loadDotEnv(path.join(ROOT, '.env'));
  const env = { ...process.env, ...overrides };
  const dataDir = path.resolve(ROOT, env.DATA_DIR || 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  // Secrets: from env in production; generated once and kept in data/ for local runs.
  const secretFile = path.join(dataDir, '.secrets.json');
  let local = {};
  if (fs.existsSync(secretFile)) local = JSON.parse(fs.readFileSync(secretFile, 'utf8'));
  const need = ['APP_SECRET', 'SANDBOX_WEBHOOK_SECRET'];
  let changed = false;
  for (const k of need) if (!env[k] && !local[k]) { local[k] = crypto.randomBytes(32).toString('hex'); changed = true; }
  if (changed) fs.writeFileSync(secretFile, JSON.stringify(local, null, 2), { mode: 0o600 });

  const production = env.NODE_ENV === 'production';
  const port = Number(env.PORT ?? 3700);
  // Links in e-mails are built from BASE_URL, never from the Host header; a localhost link in production would break every e-mail.
  if (production && !env.BASE_URL) throw new Error('BASE_URL is required when NODE_ENV=production');
  if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must have at least 12 characters');
  return {
    root: ROOT,
    production,
    host: env.HOST || '127.0.0.1',
    port,
    baseUrl: (env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, ''),
    dataDir,
    dbFile: env.DB_FILE ? path.resolve(ROOT, env.DB_FILE) : path.join(dataDir, 'ogarnij.sqlite'),
    trustProxy: env.TRUST_PROXY === '1',
    appSecret: env.APP_SECRET || local.APP_SECRET,
    mail: {
      transport: env.MAIL_TRANSPORT || 'outbox', // outbox | resend | none
      from: env.MAIL_FROM || 'Ogarnij <beta@ogarnij.example>',
      resendKey: env.RESEND_API_KEY || '',
      outboxDir: path.join(dataDir, 'outbox'),
    },
    payments: {
      provider: env.STRIPE_SECRET_KEY ? 'stripe' : 'sandbox',
      // In production the sandbox would mark orders "paid" with no money: off unless explicitly allowed.
      enabled: !!env.STRIPE_SECRET_KEY || !production || env.ALLOW_SANDBOX_PAYMENTS === '1',
      stripeKey: env.STRIPE_SECRET_KEY || '',
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
      sandboxSecret: env.SANDBOX_WEBHOOK_SECRET || local.SANDBOX_WEBHOOK_SECRET,
      currency: 'pln',
    },
    admin: {
      email: env.ADMIN_EMAIL || '',
      password: env.ADMIN_PASSWORD || '',
    },
    jobs: env.JOBS !== '0',
    rateScale: Math.max(1, Number(env.RATE_LIMIT_SCALE) || 1),
    backupDir: path.join(dataDir, 'backups'),
    logDir: path.join(dataDir, 'logs'),
    publicDir: path.join(ROOT, 'public'),
    // Count shown publicly only above this threshold (honest social proof).
    publicCountThreshold: Number(env.PUBLIC_COUNT_THRESHOLD ?? 100),
  };
}
