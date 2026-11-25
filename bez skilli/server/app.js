import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { ROOT_DIR } from './config.js';
import { HttpError } from './lib/errors.js';
import { loadSession } from './middleware/auth.js';
import { originCheck, securityHeaders } from './middleware/security.js';
import { accessRoutes, accountRoutes } from './routes/account.js';
import { adminRoutes } from './routes/admin.js';
import { appRoutes } from './routes/app.js';
import { authRoutes } from './routes/auth.js';
import { publicRoutes } from './routes/public.js';

/**
 * @typedef {{ db: import('./db/index.js').Db, config: import('./config.js').AppConfig, logger: import('./lib/logger.js').Logger,
 *   mailer: import('./services/mailer.js').Mailer, ai: import('./services/ai/index.js').AiService }} Deps
 */

const FONT_DIR = path.join(ROOT_DIR, 'node_modules', '@fontsource-variable', 'inter', 'files');

/** @param {Deps} deps */
export function createApp(deps) {
  const { config, logger } = deps;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', parseTrustProxy(config.trustProxy));
  app.set('etag', 'strong');

  app.use(securityHeaders(config));
  app.use(express.json({ limit: '100kb' }));
  app.use(originCheck(config));

  // ---------- API ----------
  const noStore = (/** @type {any} */ _req, /** @type {any} */ res, /** @type {any} */ next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  };
  app.use('/api', noStore);
  app.use('/api/admin', loadSession(deps, 'admin'), adminRoutes(deps));
  app.use('/api', loadSession(deps, 'app'));
  app.use('/api/auth', authRoutes(deps));
  app.use('/api/account', accountRoutes(deps));
  app.use('/api/access', accessRoutes(deps));
  app.use('/api/app', appRoutes(deps));
  app.use('/api', publicRoutes(deps));
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'not_found', 'Unknown API endpoint.')));

  // ---------- Static assets ----------
  const assetOpts = {
    index: false,
    fallthrough: true,
    /** @param {import('express').Response} res @param {string} file */
    setHeaders: (res, file) => {
      const versioned = /[?&]v=/.test(res.req.originalUrl);
      res.setHeader('Cache-Control', config.isProd && versioned ? 'public, max-age=31536000, immutable' : config.isProd ? 'public, max-age=3600' : 'no-cache');
      if (file.endsWith('.woff2')) res.setHeader('Access-Control-Allow-Origin', config.baseUrl);
    },
  };
  app.use('/assets/fonts', express.static(FONT_DIR, assetOpts));
  app.use('/assets', express.static(path.join(config.staticDir, 'assets'), assetOpts));
  app.get('/favicon.ico', (_req, res) => res.redirect(301, '/assets/img/favicon.svg'));

  // ---------- Pages ----------
  /** @param {string} file */
  const page = (file) => (/** @type {import('express').Request} */ _req, /** @type {import('express').Response} */ res) => sendPage(res, file);
  /** @param {import('express').Response} res @param {string} file @param {number} [status] */
  const sendPage = (res, file, status = 200) => {
    res.status(status);
    res.setHeader('Cache-Control', file.startsWith('app/') || file.startsWith('admin/') ? 'no-store' : config.isProd ? 'public, max-age=300' : 'no-cache');
    res.sendFile(path.join(config.staticDir, file));
  };

  app.get('/', page('index.html'));
  app.get('/privacy', page('privacy.html'));
  app.get('/terms', page('terms.html'));
  app.get('/waitlist/confirm', page('waitlist-confirm.html'));
  app.get('/forgot-password', page('forgot-password.html'));
  app.get('/reset-password', page('reset-password.html'));

  const appSession = loadSession(deps, 'app');
  const adminSession = loadSession(deps, 'admin');
  app.get(['/login', '/signup'], appSession, (req, res) => {
    if (req.auth) return res.redirect(302, '/app');
    sendPage(res, req.path === '/login' ? 'login.html' : 'signup.html');
  });
  // The application shell is only served to signed-in users.
  app.get(['/app', '/app/{*rest}'], appSession, (req, res) => {
    if (!req.auth) return res.redirect(302, `/login?next=${encodeURIComponent(req.originalUrl)}`);
    sendPage(res, 'app/index.html');
  });
  app.get('/admin/login', adminSession, (req, res) => {
    if (req.auth) return res.redirect(302, '/admin');
    sendPage(res, 'admin/login.html');
  });
  // The admin shell is only served to an authenticated administrator session.
  app.get(['/admin', '/admin/{*rest}'], adminSession, (req, res) => {
    if (!req.auth || req.auth.user.role !== 'admin') return res.redirect(302, '/admin/login');
    sendPage(res, 'admin/index.html');
  });

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /admin\nDisallow: /api\n\nSitemap: ${config.baseUrl}/sitemap.xml\n`);
  });
  app.get('/sitemap.xml', (_req, res) => {
    const urls = ['/', '/signup', '/login', '/privacy', '/terms'];
    const lastmod = config.termsVersion;
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((u) => `  <url><loc>${config.baseUrl}${u}</loc><lastmod>${lastmod}</lastmod><priority>${u === '/' ? '1.0' : '0.5'}</priority></url>`)
        .join('\n')}\n</urlset>\n`,
    );
  });

  app.use((_req, res) => sendPage(res, '404.html', 404));

  // ---------- Errors ----------
  /** @type {import('express').ErrorRequestHandler} */
  const onError = (err, req, res, _next) => {
    let e = err;
    if (err?.type === 'entity.parse.failed') e = new HttpError(400, 'bad_json', 'The request body is not valid JSON.');
    else if (err?.type === 'entity.too.large') e = new HttpError(413, 'too_large', 'The request is too large.');
    if (!(e instanceof HttpError)) {
      logger.error('unhandled error', { path: req.path, method: req.method, error: String(err?.stack || err) });
      e = new HttpError(500, 'server_error', 'Something went wrong on our side. Please try again.');
    }
    if (res.headersSent) return;
    if (req.path.startsWith('/api/')) {
      res.status(e.status).json({ error: { code: e.code, message: e.message, details: e.details ?? undefined } });
    } else {
      res.status(e.status).type('text/plain').send(e.message);
    }
  };
  app.use(onError);

  return app;
}

/** @param {string} v */
function parseTrustProxy(v) {
  if (v === 'true') return true;
  if (v === 'false' || v === '') return false;
  const n = Number(v);
  return Number.isInteger(n) ? n : v;
}

/** Ensures the static directory has the expected pages (helps catch a missing build). */
export function assertStaticDir(dir) {
  if (!fs.existsSync(path.join(dir, 'index.html'))) throw new Error(`Static directory ${dir} has no index.html. Run "npm run build" or set STATIC_DIR.`);
}
