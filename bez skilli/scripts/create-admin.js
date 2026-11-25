#!/usr/bin/env node
/**
 * One-time administrator bootstrap. There is no default admin account.
 *
 *   npm run admin:create -- --email you@company.com --name "Your Name"
 *
 * The password is taken from the ADMIN_PASSWORD environment variable, or a
 * strong random password is generated and printed once. Use --promote to turn
 * an existing account into an administrator.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig, ROOT_DIR } from '../server/config.js';
import { openDb } from '../server/db/index.js';
import { migrate } from '../server/db/migrate.js';
import { hashPassword, randomToken } from '../server/lib/crypto.js';
import { v } from '../server/lib/validate.js';
import { grantAccess } from '../server/services/access.js';
import { audit } from '../server/services/audit.js';
import { createUser, findByEmail } from '../server/services/users.js';

const envFile = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string', default: 'Administrator' },
    promote: { type: 'boolean', default: false },
    timezone: { type: 'string', default: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' },
  },
});

const fail = (/** @type {string} */ msg) => {
  console.error(`\n  ✖ ${msg}\n`);
  process.exit(1);
};

const email = v.email().safeParse(values.email ?? process.env.ADMIN_EMAIL ?? '');
if (!email.success) fail('Provide a valid --email (or ADMIN_EMAIL).');

const config = loadConfig({ ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' });
const db = openDb(config.dbPath);
migrate(db);

const existing = findByEmail(db, email.data);
if (existing) {
  if (!values.promote) fail(`An account with ${email.data} already exists. Re-run with --promote to make it an administrator.`);
  db.run(`UPDATE users SET role = 'admin', status = 'active', updated_at = ? WHERE id = ?`, Date.now(), existing.id);
  db.run('DELETE FROM sessions WHERE user_id = ?', existing.id);
  audit(db, { actor: null, action: 'admin.bootstrap_promoted', targetType: 'user', targetId: existing.id, targetLabel: existing.email });
  console.log(`\n  ✔ ${existing.email} is now an administrator. Sign in at ${config.baseUrl}/admin/login\n`);
  process.exit(0);
}

let password = process.env.ADMIN_PASSWORD || '';
let generated = false;
if (password) {
  const ok = v.password().safeParse(password);
  if (!ok.success) fail(`ADMIN_PASSWORD rejected: ${ok.error.issues[0].message}`);
} else {
  password = randomToken(18);
  generated = true;
}

const user = createUser(db, {
  email: email.data,
  name: String(values.name).slice(0, 80),
  passwordHash: await hashPassword(password),
  termsVersion: config.termsVersion,
  marketing: false,
  timezone: values.timezone || 'UTC',
  role: 'admin',
});
// Administrators also get unlimited Team access to the product itself.
grantAccess(db, { userId: user.id, planId: 'team', startsAt: Date.now(), endsAt: null, source: 'system', note: 'Administrator bootstrap' });
audit(db, { actor: null, action: 'admin.bootstrap_created', targetType: 'user', targetId: user.id, targetLabel: user.email });
db.close();

console.log(`\n  ✔ Administrator created: ${user.email}`);
if (generated) {
  console.log(`\n  Generated password (shown once — store it in a password manager):\n\n      ${password}\n`);
}
console.log(`  Admin panel: ${config.baseUrl}/admin/login\n`);
