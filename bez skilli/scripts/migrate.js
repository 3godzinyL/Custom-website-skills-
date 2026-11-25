#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, ROOT_DIR } from '../server/config.js';
import { openDb } from '../server/db/index.js';
import { migrate } from '../server/db/migrate.js';

const envFile = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const config = loadConfig({ ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' });
const db = openDb(config.dbPath);
const applied = migrate(db);
const all = db.all('SELECT version, name, applied_at FROM schema_migrations ORDER BY version');
db.close();
console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date.');
for (const m of all) console.log(`  ${String(m.version).padStart(3, '0')}  ${m.name}  ${new Date(m.applied_at).toISOString()}`);
console.log(`Database: ${path.relative(ROOT_DIR, config.dbPath)}`);
