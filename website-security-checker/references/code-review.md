# Code review

Part A finds security flaws. Part B finds logic errors and plain bugs. Both produce
findings with file:line, reasoning or reproduction, impact and a fix that matches the
project's style.

## Contents
- Method (both parts)
- Part A — Security review
- Part B — Logic and general bugs
- Tooling
- Finding format

## Method (both parts)

1. **Orient**: README, package manifests, entry points (`server.js`, `app.*`, `index.*`,
   framework configs), folder structure, env/config loading, build scripts.
2. **Map**: `node scripts/map-routes.mjs <dir>` → routes, middleware hints, frontend
   calls. Read the middleware chain in order of registration.
3. **Follow the money and the permissions first**: auth, roles, checkout, payments,
   webhooks, admin, exports. Then personal data. Then everything else.
4. **Trace flows end to end**: UI event → request → route → validation → service →
   DB/external → response → UI rendering. Bugs live at the seams.
5. **Run what exists**: tests, type check, linter, audit. A failing or missing test
   suite is information for the report.
6. Large codebases: review every route handler and every file that touches money,
   auth or personal data in full; sample the rest by pattern and state coverage.

## Part A — Security review

Sources → sinks:
- **Sources**: `req.body/query/params/headers/cookies`, uploaded files, webhook payloads,
  third-party API responses, CMS content, environment, URL fragments, `postMessage`,
  LLM output.
- **Sinks**: SQL/NoSQL queries, ORM raw calls, HTML rendering, templates, `eval`/
  `Function`, `child_process`, `fs` paths, redirects, HTTP clients (SSRF), deserializers,
  regexes (ReDoS), headers (CRLF), e-mail headers, LLM tool calls, logs.

Checklist:
- Every route: authentication present? authorization by role and by **ownership**?
  routes registered before the auth middleware? `router.use(auth)` scoped correctly?
- Validation with schemas (zod/joi/ajv/class-validator) on every input, including types;
  allowlists for writable fields (mass assignment).
- Queries parameterized; no string concatenation or template literals in SQL.
- Output encoding by template engine; no unescaped output with user data
  (`<%-`, `{{{ }}}`, `|safe`, `dangerouslySetInnerHTML`, `v-html`).
- Secrets only from env/secret store; not committed (check git history:
  `git log -p -S "sk_live_"` for key patterns); `.gitignore` covers `.env*`.
- Sessions/JWT: secure cookie flags, expiry, rotation on login, invalidation on logout/
  password change, strong secret, signature verified, algorithm pinned.
- Passwords hashed with bcrypt/argon2/scrypt; reset tokens random, single-use, expiring.
- File handling: path normalization + prefix check; uploads validated by content,
  stored outside web root, random names.
- Outbound HTTP: no user-controlled hosts without allowlist; timeouts.
- Crypto: no homemade crypto, no `Math.random()` for tokens (`crypto.randomBytes`/
  `randomUUID`), constant-time comparison for signatures (`timingSafeEqual`).
- Webhooks: raw body signature verification, idempotency.
- Error handling: production hides stack traces; errors don't fail open.
- Dependencies: `npm audit --omit=dev`, lockfile present, no abandoned security-critical
  packages; CMS plugins up to date.
- Logging: no passwords/tokens/card data in logs; security events logged.
- Config: CORS allowlist, security headers (helmet or equivalent), `trust proxy` set
  correctly behind proxies (affects rate limiting and IPs), debug off in production.

## Part B — Logic and general bugs

Look for these classes, they cause real outages and money loss:

**Conditions and state**
- Inverted or incomplete conditions (`if (!user || user.role = 'admin')`, `&&` vs `||`,
  `==` coercion, missing `else`, fallthrough in `switch`).
- State machines with missing transitions or impossible states (order paid but
  cancelled, subscription active after refund, booking confirmed twice).
- Default values that grant access or mark success when data is missing.

**Concurrency**
- Check-then-act without locking/transactions (stock, coupons, seats, unique usernames).
- Double submit (no idempotency key, no disabled button + server guard).
- Shared mutable state in a Node module used across requests.
- Async code without `await` (unhandled promise, work not finished before response),
  `forEach` with async callbacks, missing `try/catch` around `await`.

**Money and numbers**
- Floats for money (use integer grosze/cents or decimal library); rounding per line vs
  per order; VAT calculated differently in cart, order and invoice; currency mixing;
  percentage discounts over 100%; negative totals.
- Integer parsing without radix/validation (`parseInt('08')`, `Number('')` = 0).

**Dates and time**
- Time zones (server UTC vs `Europe/Warsaw`, DST changes in March/October), date-only
  values shifted by a day, trial/booking end computed in local time on one side and UTC
  on the other, `new Date('2026-03-29')` parsing differences, expiry comparisons using
  client time, host clock skew vs provider clock.

**Data handling**
- `null`/`undefined` paths crashing handlers; optional chaining hiding real errors.
- Off-by-one in pagination, slicing, loops; empty list handling; sorting stability.
- N+1 queries, missing indexes on hot lookups, unbounded queries.
- Caches not invalidated after updates (prices, stock, permissions).
- Encoding: Polish characters broken in DB/CSV/PDF/e-mail (charset, BOM, collation),
  slugs and filenames with diacritics.
- File writes without atomic rename (corrupted JSON on crash), large JSON rewritten on
  every request.
- Resource leaks: unclosed streams/handles, timers and intervals never cleared,
  listeners added per request, growing in-memory maps.

**Error handling and UX**
- Errors swallowed (`catch {}`) so failures look like success.
- Wrong HTTP status (200 with error body; 500 for validation errors).
- Retries without backoff; infinite retry loops; timeouts missing on external calls.

**Dead and duplicated code**
- Two implementations of the same rule (price calculation in two places drifting apart).
- Dead routes still mounted; feature flags permanently on/off with live code paths.

## Tooling

Use what is available; MCP options in `mcp-toolkit.md`.
- `npm test`, `npx tsc --noEmit`, `npx eslint .` (project config), `npm audit --omit=dev`.
- Semgrep (`semgrep --config auto` or `p/owasp-top-ten`, `p/javascript`, `p/nodejs`,
  `p/react`, `p/secrets`) — via CLI or Semgrep MCP.
- Trivy (`trivy fs .`) for dependencies, secrets and IaC; Snyk if the user has an account.
- `git log -p` searches for secrets in history; `gitleaks` if installed.
- ripgrep patterns from `recon.md` §5.

## Finding format

```
### [B7] Rabat procentowy liczony na kwocie z dostawą — Średnie
- Gdzie: src/cart/totals.js:88 (applyDiscount)
- Rodzaj: błąd logiczny (pieniądze)
- Opis: rabat 10% jest liczony od sumy z kosztem dostawy, a front pokazuje rabat od samych produktów.
- Odtworzenie: koszyk 100 zł + dostawa 15 zł, kod LATO10 → front pokazuje 105,00 zł (rabat od produktów), serwer pobiera 103,50 zł (rabat od całości).
- Skutek: klient płaci inną kwotę niż widział; niezgodność z regulaminem i fakturą.
- Poprawka: (fragment kodu)
- Test: (test jednostkowy / kroki)
```
