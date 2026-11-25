import fs from 'node:fs';
import path from 'node:path';
import { now, kvSet, kvGet } from './db.js';

const DAY = 86_400_000;

export function backupDb(db, config, keep = 14) {
  fs.mkdirSync(config.backupDir, { recursive: true });
  const file = path.join(config.backupDir, `ogarnij-${new Date().toISOString().slice(0, 10)}.sqlite`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const files = fs.readdirSync(config.backupDir).filter((f) => /^ogarnij-\d{4}-\d{2}-\d{2}\.sqlite$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) fs.unlinkSync(path.join(config.backupDir, f));
  kvSet(db, 'last_backup', new Date().toISOString());
  return file;
}

// Retention (RODO): unconfirmed sign-ups after 30 days, sent e-mails after 90 days, errors after 30 days.
export function cleanup(db) {
  const t = now();
  const r = {
    pending: db.prepare("DELETE FROM subscribers WHERE status = 'pending' AND confirmed_at IS NULL AND created_at < ?").run(t - 30 * DAY).changes,
    sessions: db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(t).changes,
    emails: db.prepare('DELETE FROM emails WHERE (sent_at IS NOT NULL OR cancelled_at IS NOT NULL) AND created_at < ?').run(t - 90 * DAY).changes,
    errors: db.prepare('DELETE FROM errors WHERE created_at < ?').run(t - 30 * DAY).changes,
    webhooks: db.prepare('DELETE FROM webhook_events WHERE received_at < ?').run(t - 90 * DAY).changes,
  };
  return r;
}

export function startJobs({ db, config, mailer, log }) {
  const timers = [];
  let busy = false;
  timers.push(setInterval(async () => {
    if (busy) return;
    busy = true;
    try { await mailer.processQueue(db); } catch (e) { log.error('jobs.mail', e); } finally { busy = false; }
  }, 5_000));
  const hourly = () => {
    try {
      cleanup(db);
      const last = kvGet(db, 'last_backup');
      if (!last || Date.now() - Date.parse(last) > DAY) backupDb(db, config);
    } catch (e) { log.error('jobs.hourly', e); }
  };
  timers.push(setInterval(hourly, 3600_000));
  setTimeout(hourly, 10_000).unref();
  for (const t of timers) t.unref();
  return () => timers.forEach(clearInterval);
}
