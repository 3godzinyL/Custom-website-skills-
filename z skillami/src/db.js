import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Each entry runs once, in order; the index is stored in PRAGMA user_version.
const MIGRATIONS = [
  `
  CREATE TABLE subscribers (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL,
    email_key TEXT NOT NULL UNIQUE,          -- normalized (lowercase, no +tag, gmail dots) to stop duplicate/alias signups
    lang TEXT NOT NULL DEFAULT 'pl',
    status TEXT NOT NULL DEFAULT 'pending',   -- pending | confirmed | unsubscribed
    consent_marketing INTEGER NOT NULL DEFAULT 0,
    confirm_token_hash TEXT,
    confirm_expires_at INTEGER,
    private_key_hash TEXT,                    -- for /kolejka and /wypisz links
    ref_code TEXT UNIQUE,
    referred_by INTEGER REFERENCES subscribers(id) ON DELETE SET NULL,
    variant TEXT,
    source TEXT,
    survey_answer TEXT,
    created_at INTEGER NOT NULL,
    confirmed_at INTEGER,
    unsubscribed_at INTEGER
  );
  CREATE INDEX idx_sub_status ON subscribers(status, confirmed_at);
  CREATE INDEX idx_sub_ref ON subscribers(referred_by);

  CREATE TABLE emails (
    id INTEGER PRIMARY KEY,
    subscriber_id INTEGER REFERENCES subscribers(id) ON DELETE CASCADE,
    to_addr TEXT NOT NULL,
    kind TEXT NOT NULL,
    subject TEXT NOT NULL,
    html TEXT NOT NULL,
    text TEXT NOT NULL,
    send_after INTEGER NOT NULL,
    sent_at INTEGER,
    cancelled_at INTEGER,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_emails_due ON emails(sent_at, cancelled_at, send_after);

  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,                       -- owner | editor | viewer
    pass_hash TEXT NOT NULL,
    totp_secret TEXT,
    totp_enabled INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    failed_logins INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER
  );

  CREATE TABLE sessions (
    id_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf TEXT NOT NULL,
    pending_2fa INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    ip TEXT,
    ua TEXT
  );

  CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    user_email TEXT,
    action TEXT NOT NULL,
    target TEXT,
    details TEXT,
    ip TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL,
    lang TEXT NOT NULL DEFAULT 'pl',
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    body_md TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Zespół Ogarnij',
    published INTEGER NOT NULL DEFAULT 0,
    published_at INTEGER,
    updated_at INTEGER NOT NULL,
    UNIQUE(slug, lang)
  );

  CREATE TABLE discount_codes (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    percent INTEGER NOT NULL CHECK (percent BETWEEN 1 AND 90),
    max_uses INTEGER,
    used INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    public_id TEXT NOT NULL UNIQUE,
    key_hash TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    nip TEXT,
    lang TEXT NOT NULL DEFAULT 'pl',
    product TEXT NOT NULL,
    base_amount INTEGER NOT NULL,             -- grosze
    discount_code TEXT,
    discount_amount INTEGER NOT NULL DEFAULT 0,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',   -- pending | paid | failed | refunded | cancelled
    provider TEXT NOT NULL,
    provider_ref TEXT,
    terms_accepted_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    paid_at INTEGER,
    refunded_at INTEGER
  );
  CREATE INDEX idx_orders_status ON orders(status, created_at);

  CREATE TABLE webhook_events (
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    received_at INTEGER NOT NULL,
    PRIMARY KEY (provider, event_id)
  );

  CREATE TABLE events_daily (
    day TEXT NOT NULL,
    name TEXT NOT NULL,
    variant TEXT NOT NULL DEFAULT '',
    lang TEXT NOT NULL DEFAULT '',
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, name, variant, lang)
  );

  CREATE TABLE errors (
    id INTEGER PRIMARY KEY,
    source TEXT NOT NULL,                     -- server | client
    message TEXT NOT NULL,
    detail TEXT,
    path TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_errors_time ON errors(created_at);

  CREATE TABLE kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
  `,
  // 2: one-time use of TOTP codes (replay protection)
  `ALTER TABLE users ADD COLUMN totp_last_step INTEGER NOT NULL DEFAULT 0;`,
];

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  const version = db.prepare('PRAGMA user_version').get().user_version;
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return db;
}

export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export const now = () => Date.now();

export function kvGet(db, k) {
  return db.prepare('SELECT v FROM kv WHERE k = ?').get(k)?.v ?? null;
}
export function kvSet(db, k, v) {
  db.prepare('INSERT INTO kv(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run(k, String(v));
}
