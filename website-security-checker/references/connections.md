# Connections: catalogue and test matrix

Goal: **every** connection the site makes or accepts is listed and tested. Count does
not matter: 8 or 800, each one gets a row and a result.

## Contents
1. Where connections hide
2. Building the catalogue
3. The per-endpoint test matrix
4. Scaling to hundreds of endpoints
5. Using endpoint-matrix.mjs
6. Recording results

## 1. Where connections hide

Collect from all sources and merge:
- **Live traffic**: browser network panel / Playwright or Chrome DevTools MCP while
  clicking every feature, logged out and logged in as each role. Include XHR/fetch,
  form posts, WebSocket and SSE, beacons, redirects, iframes.
- **JS bundles and source maps**: `fetch(`, `axios`, `XMLHttpRequest`, GraphQL operation
  names, `new WebSocket`, `EventSource`, base URLs in config objects, env-injected URLs.
- **Code** (white-box): `node scripts/map-routes.mjs <dir>`, plus framework conventions
  (Next.js `app/**/route.*`, `pages/api/**`, server actions; Nuxt `server/api/**`;
  SvelteKit `+server.*`; Laravel `routes/*.php`; Django `urls.py`; PHP files in web root).
- **Specs**: `/openapi.json`, `/swagger.json`, `/api-docs`, `/swagger-ui`, `/graphql`
  (introspection), Postman collections in the repo.
- **Platform APIs**: `/wp-json/` index, WooCommerce Store API, Shopify storefront
  endpoints, Supabase REST (`/rest/v1/<table>`), Firebase paths, Strapi `/api/*`.
- **Inbound**: payment webhooks, form-service callbacks, cron/scheduler URLs, OAuth
  callbacks, e-mail webhooks (bounces), CMS build hooks.
- **Outbound from the server**: payment, mailing, CRM, inventory, AI APIs, storage,
  image services — keys, timeouts, error handling, data sent.
- **Other environments**: `staging.`, `dev.`, `api-v1.`, old `/v1/` versions still live.

## 2. Building the catalogue

Normalize paths (`/orders/123` → `/orders/:id`), merge duplicates, then one row per
method + path:

```
| # | Metoda | Ścieżka | Źródło (ruch/JS/kod/spec) | Auth (brak/cookie/bearer/klucz) | Role wg UI | Dane (PII/płatności/wewn.) | Zmienia stan? | Ryzyko |
```

Risk ranking: money and permissions (checkout, orders, payments, roles, admin) >
personal data > content editing > public read-only.

## 3. The per-endpoint test matrix

Apply every relevant column to every row. Mark N/A when it truly does not apply.

| Test | How (safe) | Finding if |
|---|---|---|
| **AuthN** | call without cookie/token | protected data/action works anonymously |
| **AuthZ by role** | guest / user / admin sessions | user reaches admin function or data |
| **Object level (IDOR)** | user A requests B's ids; change ids in path, query, body, headers | foreign object returned or changed |
| **Function level** | non-admin calls admin route found in JS/code | works for non-admin |
| **Methods** | OPTIONS; try PUT/PATCH/DELETE/HEAD where GET exists (staging) | unexpected method allowed |
| **Input validation** | wrong types, empty, huge, negative, unicode, arrays instead of strings, extra fields | 500 errors, accepted garbage, mass assignment |
| **Injection** | contextual probes per `checks.md` §2–3 | reflected/stored payload, query errors |
| **Data exposure** | compare JSON with what the UI shows | hidden fields (hashes, e-mails, cost prices, internal notes, tokens) |
| **Pagination/limits** | `limit=10000`, `page=-1`, no limit | database dump, slow queries |
| **CORS** | `Origin: https://evil.example` | reflected with credentials |
| **CSRF** | cookie-auth state change without token / cross-site | succeeds |
| **Rate limit** | 10–20 quick requests | no limit on login/forms/codes/OTP/search |
| **Caching** | response headers, CDN `cf-cache-status`/`x-cache` | private data cacheable/public |
| **Errors** | malformed JSON, missing params | stack traces, SQL, paths, debug info |
| **Idempotency/replay** | same request twice (staging) | double order, double credit |
| **Business rules** | prices, totals, stock, status, roles in body | client value trusted |
| **Transport** | HTTPS only, HSTS | HTTP works, mixed content |

WebSocket/SSE extras: origin check at handshake, auth on connect, authorization per
channel/room/message, message validation, other users' events leaking.
GraphQL extras: introspection on production, field-level authorization, aliases and
batching for brute force, depth/complexity limits.
Webhooks (inbound): signature verified with raw body, timestamp tolerance, replay
protection, payload values re-checked against DB, endpoint not usable by outsiders.
Outbound calls: secrets server-side, timeouts and retries, failures don't fail open,
no user-controlled URLs (SSRF), minimal data sent.

## 4. Scaling to hundreds of endpoints

- Generate the catalogue by script, never by hand.
- Run the read-only matrix (`endpoint-matrix.mjs`) on **all** GET endpoints for all roles.
- Group by resource (`/orders/*`, `/users/*`) and by handler/middleware in code: if 40
  routes share one verified auth + ownership helper, test representatives of each
  pattern **and** grep that no route in the group bypasses the helper.
- Deep manual testing for every state-changing endpoint touching money, permissions or
  personal data; sample the rest by pattern and say so in the coverage table.
- Keep the catalogue as a file (`KATALOG-POLACZEN.md` / `.json`) and update it as you test.

## 5. Using endpoint-matrix.mjs

Input JSON (from `map-routes.mjs`, the passive scan, or written by you):

```json
{
  "base": "https://staging.example.com",
  "roles": {
    "guest": {},
    "userA": { "headers": { "Cookie": "session=…" } },
    "userB": { "headers": { "Authorization": "Bearer …" } },
    "admin": { "headers": { "Cookie": "session=…" } }
  },
  "endpoints": [
    { "path": "/api/orders/:id", "params": { "id": ["1042", "1043"] }, "owner": { "1042": "userA", "1043": "userB" } },
    { "path": "/api/admin/users", "expect": { "guest": "deny", "userA": "deny", "userB": "deny", "admin": "allow" } },
    { "path": "/api/products" }
  ]
}
```

Run: `node scripts/endpoint-matrix.mjs matrix.json --out matrix-results.json`
It sends only GET (plus two GETs with `Origin: https://evil.example` and `Origin: null`
for CORS), sequentially with a delay, and flags: role allowed where `expect` says deny,
objects readable by a non-owner, identical responses for different roles on protected
routes, sensitive field names in JSON, reflected CORS, personal data without
`Cache-Control: no-store`. Treat flags as leads and confirm each one manually.

Safety rails built in:
- role headers go only to the origin of `base`; paths resolving elsewhere are skipped,
- GET routes that look state-changing (`logout`, `unsubscribe`, `confirm`, `delete`,
  `cron`, `webhook`, `pay`…) are skipped and listed — read their code, test them by hand,
  or mark an endpoint `"safe": true` after checking it really is read-only
  (`--include-risky` runs all of them; use it only on disposable local data),
- HTTP 429 → waits for `Retry-After` (max 30 s), retries once and lists the URL; raise
  `--delay` or allowlist the audit IP on staging, otherwise "deny" may be a rate limit.

Quick start from code: `node scripts/map-routes.mjs . --out routes.json` →
`node scripts/endpoint-matrix.mjs --from-routes routes.json --base http://127.0.0.1:3710
--roles roles.json` (routes with parameters are listed for you to add to a matrix.json
with real IDs of test objects).

## 6. Recording results

For every row: `OK` / `PROBLEM #<id>` / `DO POTWIERDZENIA` / `NIE TESTOWANO (powód)`.
The final report includes the full catalogue with these statuses as an appendix, and the
coverage section states how many endpoints were tested fully, by pattern, or not at all.
