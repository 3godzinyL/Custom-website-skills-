# Reconnaissance and inventory

The inventory decides the quality of the whole audit. Spend real effort here.

## Contents
1. Passive sources (no requests to the target)
2. Server and hosting
3. Frontend
4. Backend, API and network features
5. White-box: reading the code
6. Fingerprints of popular platforms
7. Inventory checklist

## 1. Passive sources

- **Certificate Transparency**: `https://crt.sh/?q=%25.example.com` lists subdomains that
  ever had a certificate (staging, admin, api, old shops). Old subdomains pointing to
  deleted services (Heroku, Netlify, GitHub Pages, S3, Azure) may allow subdomain takeover.
- **DNS**: A/AAAA/CNAME (hosting, CDN), MX (mail provider), TXT (SPF, DMARC at
  `_dmarc.example.com`, verification tokens that reveal used services).
  Windows: `Resolve-DnsName example.com -Type TXT`; Unix: `dig TXT example.com`.
- **Search engines**: `site:example.com` with `inurl:admin`, `ext:pdf`, `ext:sql`,
  `ext:log`, `ext:env`, `intitle:"index of"` — indexed files that should not be public.
- **Wayback Machine**: `https://web.archive.org/web/*/example.com/*` — old endpoints,
  removed pages that may still respond.
- **Public repos**: search GitHub for the domain or brand name — leaked `.env`, keys.

## 2. Server and hosting

- Response headers: `Server`, `X-Powered-By`, `Via`, `X-Cache`, `CF-Ray` (Cloudflare),
  `X-Vercel-Id`, `X-Nf-Request-Id` (Netlify), `X-Amz-Cf-Id` (CloudFront).
- HTTP → HTTPS redirect, `www` vs apex consistency, HSTS.
- TLS: certificate validity and expiry, protocol versions (TLS 1.2+ only), use
  `https://www.ssllabs.com/ssltest/` for a full public check (it is passive for the site).
- Error pages: request a non-existent path, `/%`, a very long URL — default error pages
  reveal server and framework versions.
- Exposed operational files: `/.env`, `/.git/HEAD`, `/.git/config`, `/.svn/entries`,
  `/.DS_Store`, `/backup.zip`, `/db.sql`, `/dump.sql`, `/.htpasswd`, `/phpinfo.php`,
  `/server-status`, `/package.json`, `/composer.json`, `/web.config`, `/config.json`,
  `/docker-compose.yml`, `/.vscode/`, `/logs/`, `/debug.log`, `/wp-content/debug.log`.
- Open ports beyond 80/443 (only if the user owns the server and agrees): database ports
  (3306, 5432, 27017, 6379) exposed to the internet are critical.

## 3. Frontend

- Framework: `__NEXT_DATA__`, `/_next/` (Next.js), `/_nuxt/` (Nuxt), `data-reactroot`,
  `ng-version` (Angular), `/assets/index-*.js` (Vite), `astro-island` (Astro),
  `wp-content` (WordPress), `cdn.shopify.com`, `/modules/` + `prestashop`, `Wix`, `Webflow`.
- Download every first-party JS bundle and search for:
  - API base URLs and paths (`fetch(`, `axios`, `/api/`, `graphql`, `wss://`)
  - keys and tokens (see secret patterns in `checks.md`)
  - feature flags, admin routes (`/admin`, `/dashboard`, `/panel`, `isAdmin`)
  - source map comments `//# sourceMappingURL=` → try fetching the `.map`
- Storage: what goes into `localStorage`, `sessionStorage`, cookies, IndexedDB
  (tokens, personal data, cart with prices).
- Third-party scripts: analytics, chat widgets, pixels, fonts, CDNs. Note which load
  before cookie consent.
- Client-side routes that render without data but call protected APIs.

## 4. Backend, API and network features

Use a browser with DevTools (or a browser automation tool) and click through every
feature while recording network traffic. For every request note: method, URL, auth
(cookie, bearer, API key, none), parameters, what it returns.

Look specifically for:
- REST/GraphQL endpoints (GraphQL: check whether introspection is enabled).
- Auth flows: register, login, logout, password reset, e-mail verification, OAuth,
  magic links, 2FA.
- Forms: contact, quote/estimate, booking, newsletter, review/comment, job application
  (file upload), complaint/return.
- Search, filters, sorting (often passed straight into queries).
- File upload and download, image resizing/proxy, PDF/invoice generation.
- URL-fetching features (link preview, import from URL, webhook tester) → SSRF.
- Payments: checkout, return URLs, webhooks/notifications from the gateway.
- Realtime: WebSocket, SSE, polling endpoints.
- Scheduled jobs, cron endpoints callable over HTTP (`/cron`, `/api/tasks/run`).
- Third-party integrations called from the backend (CRM, mailing, inventory, Allegro, ERP).
- Environments: `staging.`, `dev.`, `test.`, `api-dev.`, old versions `/v1/`.

## 5. White-box: reading the code

When source is available, the inventory comes from the code, not guesses:

- **Routes**: Express `app.get/post/use`, `router.*`; Next.js `app/**/route.ts`,
  `pages/api/**`; Fastify `fastify.route`; PHP files in the web root; Laravel
  `routes/*.php`; Django `urls.py`.
- **Middleware order**: is auth applied before every protected router? Are there routes
  registered before the auth middleware?
- **Database access**: raw SQL with string concatenation/template literals, ORM
  `raw`/`$queryRawUnsafe`, NoSQL queries built from `req.body`.
- **Dangerous sinks**: `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
  `document.write`, `dangerouslySetInnerHTML`, `v-html`, `{@html}`, `eval`,
  `new Function`, `setTimeout(string)`, `child_process.exec`, `fs` with user paths,
  `res.redirect(req.query.*)`, template engines with unescaped output (`<%-`, `{{{ }}}`,
  `|safe`, `|raw`).
- **Config/secrets**: `.env*` committed? `.gitignore` covers them? Secrets in client
  env prefixes? Default/weak JWT secret, session secret?
- **Dependencies**: `npm audit --omit=dev`, `composer audit`, lock file present,
  abandoned packages, postinstall scripts.
- **Error handling**: global handler that hides stack traces in production.
- **Logging**: are passwords/tokens/card data logged?

Useful searches (ripgrep):
```
rg -n "innerHTML|dangerouslySetInnerHTML|v-html|eval\(|new Function|exec\(" src
rg -n "SELECT .*\$\{|query\(.*\+|queryRawUnsafe" src
rg -n "(sk_live_|sk_test_|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9_-]{20,}|-----BEGIN)" .
rg -n "cors\(|Access-Control-Allow-Origin" src
rg -n "price|total|amount|discount" src --glob "*.{js,ts}"
```

## 6. Fingerprints of popular platforms

| Platform | Signs | First things to check |
|---|---|---|
| WordPress | `/wp-content/`, `/wp-json/`, `<meta name="generator" content="WordPress` | `/wp-json/wp/v2/users` (user enumeration), `/?author=1`, `/xmlrpc.php`, plugin versions in `readme.txt`, `/wp-content/debug.log`, `/wp-config.php.bak` |
| WooCommerce | `woocommerce` classes, `/wc/store/` API | Store API price handling, order IDOR, REST keys in front |
| PrestaShop | `/modules/`, `prestashop` cookies | `/admin*` folder name exposed, module CVEs, `/install` left |
| Shopify | `cdn.shopify.com`, `myshopify.com` | apps with excess permissions, Liquid XSS in custom sections, exposed draft products |
| Wix / Webflow / Squarespace | platform scripts | mostly platform-managed: focus on forms, custom code, 3rd-party embeds, exposed collections |
| Next.js | `/_next/`, `__NEXT_DATA__` | `NEXT_PUBLIC_*` secrets, `__NEXT_DATA__` with private props, API routes without auth, middleware-only auth |
| Supabase | `*.supabase.co`, anon key JWT in bundle | RLS on every table, storage bucket policies, `service_role` key never in front |
| Firebase | `firebaseio.com`, `firebaseConfig` | Firestore/RTDB rules, storage rules, `/.json` on RTDB |
| Strapi / Directus / Sanity / Contentful | `/api/`, `/admin`, `cdn.sanity.io` | public roles permissions, write/preview tokens in front, admin exposed |

## 7. Inventory checklist

Before moving on, make sure you can answer:
- [ ] Every domain/subdomain/environment in scope is listed.
- [ ] Hosting, server, CDN and TLS are known.
- [ ] Frontend framework and build are known; bundles were searched.
- [ ] Every API endpoint seen in traffic or code is listed with its auth type.
- [ ] Every form and what happens with its data (DB, e-mail, CRM) is known.
- [ ] Auth model: who are the roles, how sessions work, where tokens live.
- [ ] Where content comes from (static, CMS, API) and who can edit it.
- [ ] Shop flow: cart → checkout → payment → webhook → order status → e-mail/invoice.
- [ ] All third-party scripts and services and what data they get.
- [ ] Personal data stored: what, where, who can access it.
