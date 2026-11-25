import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, ROOT_DIR } from './config.js';
import { openDb } from './db/index.js';
import { migrate } from './db/migrate.js';
import { createLogger } from './lib/logger.js';
import { createApp, assertStaticDir } from './app.js';
import { createMailer } from './services/mailer.js';
import { createAiService } from './services/ai/index.js';
import { sweepExpired } from './services/access.js';
import { purgeExpiredSessions } from './services/sessions.js';
import { purgeWaitlist } from './services/waitlist.js';
import { getSettings } from './services/settings.js';

/**
 * Wires dependencies together. Used by the server entry point and tests.
 * @param {Record<string, string | undefined>} env
 */
export function createServer(env = process.env) {
  const config = loadConfig(env);
  const logger = createLogger(config.logLevel);
  const db = openDb(config.dbPath);
  const applied = migrate(db);
  if (applied.length) logger.info('migrations applied', { applied });
  const mailer = createMailer({ config, db, logger });
  const ai = createAiService({ db, config, logger });
  const app = createApp({ db, config, logger, mailer, ai });

  // Housekeeping. Access correctness never depends on these jobs.
  const jobs = () => {
    try {
      const expired = sweepExpired(db);
      const sessions = purgeExpiredSessions(db);
      db.run(`DELETE FROM password_resets WHERE expires_at < ?`, Date.now() - 86400000);
      db.run(`UPDATE ai_proposals SET status = 'expired', resolved_at = ? WHERE status = 'pending' AND created_at < ?`, Date.now(), Date.now() - 3600000);
      if (expired || sessions) logger.debug('housekeeping', { expired, sessions });
    } catch (err) {
      logger.error('housekeeping failed', { error: String(err) });
    }
  };
  const daily = () => {
    try {
      const purged = purgeWaitlist(db, getSettings(db).waitlistRetentionDays);
      db.run('DELETE FROM email_outbox WHERE created_at < ?', Date.now() - 30 * 86400000);
      db.run('DELETE FROM user_activity_days WHERE day < ?', new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10));
      if (purged.old || purged.unconfirmed) logger.info('retention purge', purged);
    } catch (err) {
      logger.error('retention purge failed', { error: String(err) });
    }
  };
  /** @type {NodeJS.Timeout[]} */
  const timers = [];
  const startJobs = () => {
    jobs();
    daily();
    timers.push(setInterval(jobs, 60000), setInterval(daily, 6 * 3600000));
    for (const t of timers) t.unref();
  };
  const stop = () => {
    for (const t of timers) clearInterval(t);
    db.close();
  };
  return { app, config, logger, db, mailer, ai, startJobs, stop };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(ROOT_DIR, 'server', 'index.js');
if (isMain) {
  const envFile = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const server = createServer();
  const { app, config, logger } = server;
  assertStaticDir(config.staticDir);
  if (config.ephemeralSecret) logger.warn('APP_SECRET is not set: using a temporary secret. Sessions and invite codes will not survive a restart.');
  if (config.ai.provider !== 'anthropic' || !config.ai.apiKey) logger.info('AI assistant running in DEMO mode (no ANTHROPIC_API_KEY).');
  if (config.mail.transport === 'log') logger.info('E-mail transport: log (messages are printed here and stored in the admin outbox).');
  server.startJobs();
  const http = app.listen(config.port, config.host, () => {
    logger.info(`Kedgely listening on ${config.baseUrl}`, { host: config.host, port: config.port, env: config.nodeEnv, static: path.relative(ROOT_DIR, config.staticDir) });
  });
  const shutdown = () => {
    logger.info('shutting down');
    http.close(() => {
      server.stop();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
