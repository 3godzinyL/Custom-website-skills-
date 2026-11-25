// Ręczna kopia bazy: npm run backup (zapisuje do data/backups, trzyma 14 ostatnich).
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';
import { backupDb } from '../src/jobs.js';

const config = loadConfig();
const db = openDb(config.dbFile);
const file = backupDb(db, config);
db.close();
console.log(`Kopia zapisana: ${file}`);
