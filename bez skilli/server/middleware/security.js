import { forbidden } from '../lib/errors.js';

/**
 * Security headers (helmet-equivalent, no dependency). The CSP allows only
 * same-origin scripts, styles, fonts and images — no inline scripts or styles.
 * @param {import('../config.js').AppConfig} config
 * @returns {import('express').RequestHandler}
 */
export function securityHeaders(config) {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    ...(config.isProd ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  return (_req, res, next) => {
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (config.cookieSecure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  };
}

/**
 * Rejects state-changing requests whose Origin (or Referer) is another site.
 * Combined with SameSite cookies and per-session CSRF tokens this blocks CSRF,
 * including login CSRF on unauthenticated endpoints.
 * @param {import('../config.js').AppConfig} config
 * @returns {import('express').RequestHandler}
 */
export function originCheck(config) {
  const allowed = new Set([new URL(config.baseUrl).origin]);
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin') || (req.get('referer') ? safeOrigin(req.get('referer')) : null);
    const site = req.get('sec-fetch-site');
    if (site === 'cross-site') return next(forbidden('Cross-site request blocked.', 'bad_origin'));
    if (!origin) return next();
    const self = `${req.protocol}://${req.get('host')}`;
    if (allowed.has(origin) || origin === self) return next();
    next(forbidden('Cross-site request blocked.', 'bad_origin'));
  };
}

/** @param {string | undefined} url */
function safeOrigin(url) {
  try {
    return new URL(String(url)).origin;
  } catch {
    return 'invalid';
  }
}

/** Minimal cookie parser (no dependency). @param {string | undefined} header */
export function parseCookies(header) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k || k in out) continue;
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      /* ignore malformed cookie */
    }
  }
  return out;
}
