# Secure defaults: build it so the audit finds little

Every rule here comes from a real finding. In a side-by-side test (the same brief built
with and without these skills, then audited with website-security-checker) the two
builds produced 51 findings between them; none were critical, but most would have been
avoided by the defaults below. Apply them while building options 2–4 — retrofitting is
always more expensive — and run the self-check (§10) before handing off.

They complement, not replace, the security audit before launch.

## 1. Configuration fails closed

- Validate configuration at startup. In production, refuse to start with a clear message
  when `BASE_URL`, `SESSION_SECRET`, webhook secrets or the admin password are missing
  or weak.
- A missing integration key **disables the feature**, never fakes it: no payment key →
  checkout off ("Płatności chwilowo niedostępne"), never a sandbox page that marks orders
  paid; no SMTP → e-mails queued or the feature off, never password-reset links written
  to logs; no AI key → demo clearly labelled, never paid actions.
- Sandbox/test modes only when explicitly enabled by an env flag that is off by default
  and refused when `NODE_ENV=production` unless a second explicit flag is set.
- No `localhost` in anything that leaves the server (e-mails, canonical, OG tags).

## 2. Repository and secrets

- `.gitignore` **before the first commit**: `.env*` (keep `.env.example`), `data/`,
  `*.sqlite*`, `*.db*`, `*-wal`, `*-shm`, `logs/`, `backups/`, `uploads/`, `outbox/`,
  `coverage/`, `node_modules/`, exported CSVs.
- First-run admin credentials: print once to the server console, or write them to a
  git-ignored file inside `data/`, and force a password change on first login. Never a
  credential file in a folder that gets committed or uploaded.
- Secrets only in env; `.env.example` with placeholders and comments. Frontend env
  prefixes (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`) never hold secrets.
- Before publishing a repo: `git ls-files | grep -Ei "env|sqlite|\.db|log|backup|data/"`
  must return nothing private.

## 3. Requests and input

- Every route validates input on the server (schema: type, length, format, enum). The
  frontend `required`/`maxlength` is UX only.
- Malformed input returns 4xx, never 500: catch `URIError` from `decodeURIComponent`,
  invalid JSON → 400, too-large body → 413 (set a limit, e.g. 100 kB for JSON).
- Booleans and consents: accept only real booleans (`=== true`); `"false"` is not
  consent. Consent checkboxes never pre-ticked.
- Forms with passwords have `method="post"` in the HTML, so a submit before JavaScript
  loads never puts the password into the URL.
- Escape by default in every template; Markdown rendered with HTML disabled or
  sanitised.
- SQL only parameterised; no string-built queries, also not in "admin-only" code.

## 4. Authentication and sessions

- Passwords: scrypt/argon2/bcrypt, minimum 12 characters for admins, no maximum below
  64, check against common/breached passwords where possible.
- Sessions: random tokens stored hashed; cookies `HttpOnly`, `Secure` in production,
  `SameSite=Lax` (customer) / `Strict` (admin); admin cookie with `__Host-` prefix;
  regenerate on login; invalidate on logout and password change.
- Login throttling per account **and** per IP with growing delays — not a hard lockout
  that lets anyone lock the admin out. Same generic message for wrong e-mail or password.
- 2FA for admin accounts (TOTP): each code usable once (remember the last time step),
  attempts limited per account.
- Password reset: random single-use token (≥ 128 bits), expires in ≤ 1 hour, link built
  from `BASE_URL` (never from the `Host` header), token never logged.
- Recovery: a documented console script that resets the owner's password/2FA, writes an
  audit entry, and works only on the server.

## 5. Authorisation and data

- Deny by default; check on the server for every request: ownership
  (`WHERE id = ? AND user_id = ?`) and role.
- Roles with least privilege: a read-only role sees masked personal data in **every**
  output (JSON, CSV, UI), not only where the UI hides it.
- Writable fields allowlisted (no mass assignment of `role`, `price`, `status`).
- Prices, totals, discounts, plan limits and stock are computed on the server; the
  client sends IDs and quantities only.
- Things tied to a deleted account (codes, links, rewards) are deleted or disabled with
  it, never released to the public.

## 6. Money and limited things

- Order is paid **only** after a verified webhook (signature, amount, currency, order
  ID, idempotency by event ID); the return URL only shows status.
- Single-use or limited codes, last items, booking slots, one-trial-per-person: reserve
  or decrement atomically (transaction / `UPDATE … WHERE uses < max`), release on
  expiry and on refund.
- Discount codes ≥ 6 characters; generated single-use codes random and ≥ 10 characters.
- Refunds and cancellations update access and code usage.

## 7. Abuse of legitimate features

- Rate limits on every public form and costly endpoint (login, signup, contact, quote,
  AI, search), per IP and per account/e-mail.
- E-mail goes only to addresses the person proved they own (double opt-in) — never a
  reminder or copy to any typed address without confirmation.
- Events that the server knows (signup confirmed, payment succeeded, A/B conversion) are
  recorded by the server; the browser may send only page-level analytics, validated and
  rate-limited.
- Anything anonymous that writes to storage (error reports, uploads, drafts) has a cap
  and cleanup.
- AI endpoints: login or strict limits, max input and output tokens, no tools beyond the
  user's own rights, model output escaped before rendering.

## 8. Behind a proxy and in the browser

- Trust proxy headers only when the app runs behind your own proxy, and take the client
  IP from the hop your proxy adds (configured hop count), never the first
  `X-Forwarded-For` value.
- HTTP → HTTPS redirect (308) and HSTS in production.
- Security headers: CSP without `unsafe-inline` scripts (nonces/hashes or external
  files), `frame-ancestors 'none'` (or self), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` for unused
  features. Pages with personal data `Cache-Control: no-store`.
- CORS closed by default; an explicit allowlist when needed, never a reflected origin
  with credentials.
- CSRF: token or strict `SameSite` + `Origin` check on every state-changing request;
  no state changes on GET (logout and unsubscribe confirm with POST).
- Service worker: version file names or stale-while-revalidate for JS/CSS; never cache
  API responses or pages with personal data.
- Fonts and scripts self-hosted where privacy law makes third-party loading risky
  (Google Fonts from Google servers transfers the visitor's IP; in 2022 a Munich court
  awarded a visitor damages for exactly that). Third-party scripts only after consent if they track.

## 9. Operations

- Error handler: generic message to the client, details to the server log, no stack
  traces in production; error logging capped per day.
- `/healthz` without internals; `/.well-known/security.txt` with a contact.
- Daily database backups outside the web root, retention defined, restore tested once.
- Minimal dependencies; lockfile committed; `npm audit --omit=dev` clean of high and
  critical before launch.
- Local test servers use their own data directory and port and are stopped after tests.

## 10. Self-check before handoff (options 2–4)

Run these yourself, record the results in `SITE-PLAN.md`, then recommend the full audit:

1. `node <website-security-checker>/scripts/map-routes.mjs . --out routes.json` →
   every non-public route has an auth hint; no frontend call without a route; no
   password form leads.
2. Start the app in production mode **without** payment/mail keys (isolated data dir):
   checkout and resets are disabled, not faked; startup fails on weak secrets.
3. As user B, open user A's object by ID → 403/404.
4. Send `"price": 1`, `"role": "admin"`, `"consent": "false"` → ignored or rejected.
5. `/x/%E0%A4%A`, invalid JSON, 2 MB body → 400/413, no stack trace.
6. 20 logins with different `X-Forwarded-For` values → still throttled.
7. Two parallel orders with a single-use code → only one succeeds.
8. `git ls-files` → no `.env`, `data/`, databases, logs or credential files.
9. `npm audit --omit=dev` → no high/critical.
10. Passive scan on the local server → no exposed files, headers in place.
