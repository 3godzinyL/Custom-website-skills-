import { safeEqual } from '../lib/crypto.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { zonedParts } from '../lib/time.js';
import { accessState, getCurrentAccess } from '../services/access.js';
import { findSession, destroySession } from '../services/sessions.js';
import { parseCookies } from './security.js';

/** @param {import('../config.js').AppConfig} config */
export const cookieNames = (config) =>
  config.cookieSecure ? { app: '__Host-kg_sid', admin: '__Host-kg_admin' } : { app: 'kg_sid', admin: 'kg_admin' };

/**
 * @param {import('../config.js').AppConfig} config
 * @param {import('express').Response} res
 * @param {'app' | 'admin'} scope
 * @param {string} token
 * @param {number} maxAgeMs
 */
export function setSessionCookie(config, res, scope, token, maxAgeMs) {
  res.cookie(cookieNames(config)[scope], token, {
    httpOnly: true,
    secure: config.cookieSecure,
    // Admin cookie is Strict: it is never needed on cross-site navigations.
    sameSite: scope === 'admin' ? 'strict' : 'lax',
    path: '/',
    maxAge: maxAgeMs,
  });
}

/** @param {import('../config.js').AppConfig} config @param {import('express').Response} res @param {'app' | 'admin'} scope */
export function clearSessionCookie(config, res, scope) {
  res.clearCookie(cookieNames(config)[scope], { httpOnly: true, secure: config.cookieSecure, sameSite: scope === 'admin' ? 'strict' : 'lax', path: '/' });
}

/**
 * Loads the session for a scope into req.auth (if any). Blocked accounts lose
 * their session immediately.
 * @param {{ db: import('../db/index.js').Db, config: import('../config.js').AppConfig }} deps
 * @param {'app' | 'admin'} scope
 * @returns {import('express').RequestHandler}
 */
export function loadSession({ db, config }, scope) {
  const name = cookieNames(config)[scope];
  return (req, _res, next) => {
    const token = parseCookies(req.headers.cookie)[name];
    const session = findSession(db, config, token, scope);
    if (session) {
      const user = db.get('SELECT * FROM users WHERE id = ?', session.user_id);
      if (!user || user.status === 'blocked' || (scope === 'admin' && user.role !== 'admin')) {
        destroySession(db, session.id);
      } else {
        req.auth = { session, user, scope };
        trackActivity(db, user);
      }
    }
    next();
  };
}

/** Records one activity row per user per (UTC) day for DAU statistics. */
function trackActivity(db, user) {
  const now = Date.now();
  if (user.last_active_at && now - user.last_active_at < 300000) return;
  db.run('UPDATE users SET last_active_at = ? WHERE id = ?', now, user.id);
  db.run('INSERT OR IGNORE INTO user_activity_days (user_id, day) VALUES (?, ?)', user.id, zonedParts(now, 'UTC').date);
}

/** @type {import('express').RequestHandler} */
export const requireUser = (req, _res, next) => {
  if (!req.auth) return next(unauthorized());
  next();
};

/** @type {import('express').RequestHandler} */
export const requireAdmin = (req, _res, next) => {
  if (!req.auth || req.auth.scope !== 'admin' || req.auth.user.role !== 'admin') return next(unauthorized('Administrator sign-in required.'));
  next();
};

/**
 * Double-submit protection for authenticated mutations: the X-CSRF-Token
 * header must equal the token bound to the server-side session.
 * @type {import('express').RequestHandler}
 */
export const requireCsrf = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const header = req.get('x-csrf-token') || '';
  if (!req.auth || !safeEqual(header, req.auth.session.csrf_token)) return next(forbidden('Security token missing or invalid. Reload the page.', 'csrf'));
  next();
};

/**
 * Server-side access check for every protected API call: the account must
 * hold a non-revoked grant covering "now". UI hiding is never relied upon.
 * @param {import('../db/index.js').Db} db
 * @returns {import('express').RequestHandler}
 */
export const requireAccess = (db) => (req, _res, next) => {
  if (!req.auth) return next(unauthorized());
  const access = getCurrentAccess(db, req.auth.user.id);
  if (!access) {
    const state = accessState(db, req.auth.user);
    return next(forbidden(state === 'expired' ? 'Your access has expired.' : 'Your account does not have active access yet.', 'access_required'));
  }
  req.access = access;
  next();
};
