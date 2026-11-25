import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const bool = (v, fallback = false) => {
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};
const int = (v, fallback) => {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Builds the runtime configuration from environment variables.
 * Production refuses to start with missing or weak secrets.
 * @param {Record<string, string | undefined>} env
 */
export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';
  const port = int(env.PORT, 3500);
  const host = env.HOST || '127.0.0.1';
  const baseUrl = (env.BASE_URL || `http://localhost:${port}`).replace(/\/+$/, '');

  let secret = env.APP_SECRET || '';
  let ephemeralSecret = false;
  if (secret.length < 32) {
    if (isProd) {
      throw new Error('APP_SECRET must be set to at least 32 random characters in production.');
    }
    secret = crypto.randomBytes(48).toString('base64url');
    ephemeralSecret = true;
  }

  const distDir = path.join(ROOT_DIR, 'dist');
  const staticDir = env.STATIC_DIR
    ? path.resolve(ROOT_DIR, env.STATIC_DIR)
    : isProd && fs.existsSync(distDir) ? distDir : path.join(ROOT_DIR, 'web');

  const aiProvider = (env.AI_PROVIDER || (env.ANTHROPIC_API_KEY ? 'anthropic' : 'demo')).toLowerCase();

  const config = {
    nodeEnv,
    isProd,
    isTest,
    port,
    host,
    baseUrl,
    secret,
    ephemeralSecret,
    dbPath:
      env.DATABASE_PATH === ':memory:'
        ? ':memory:'
        : env.DATABASE_PATH
          ? path.resolve(ROOT_DIR, env.DATABASE_PATH)
          : path.join(ROOT_DIR, 'data', 'kedgely.db'),
    staticDir,
    cookieSecure: bool(env.COOKIE_SECURE, baseUrl.startsWith('https://')),
    trustProxy: env.TRUST_PROXY ?? (isProd ? '1' : 'false'),
    logLevel: env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
    termsVersion: '2026-11-24',
    ai: {
      provider: aiProvider,
      apiKey: env.ANTHROPIC_API_KEY || '',
      model: env.AI_MODEL || 'claude-sonnet-5-5',
      baseUrl: (env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, ''),
      timeoutMs: int(env.AI_TIMEOUT_MS, 30000),
      maxOutputTokens: int(env.AI_MAX_OUTPUT_TOKENS, 1500),
      globalDailyLimit: int(env.AI_GLOBAL_DAILY_LIMIT, 2000),
      maxInputChars: 2000,
    },
    mail: {
      transport: env.SMTP_HOST ? 'smtp' : 'log',
      from: env.MAIL_FROM || 'Kedgely <hello@kedgely.app>',
      smtp: {
        host: env.SMTP_HOST || '',
        port: int(env.SMTP_PORT, 587),
        secure: bool(env.SMTP_SECURE, false),
        user: env.SMTP_USER || '',
        pass: env.SMTP_PASS || '',
      },
    },
    sessions: {
      appIdleMs: int(env.SESSION_IDLE_DAYS, 14) * 86400000,
      appAbsoluteMs: int(env.SESSION_ABSOLUTE_DAYS, 30) * 86400000,
      adminIdleMs: int(env.ADMIN_SESSION_IDLE_MINUTES, 60) * 60000,
      adminAbsoluteMs: int(env.ADMIN_SESSION_ABSOLUTE_HOURS, 12) * 3600000,
    },
    rateLimits: {
      disabled: bool(env.RATE_LIMIT_DISABLED, false) && !isProd,
    },
  };
  return config;
}

/** @typedef {ReturnType<typeof loadConfig>} AppConfig */
