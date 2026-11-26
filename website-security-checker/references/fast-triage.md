# Fast triage: the failures that sink AI-built and small-team sites

Run this right after the inventory (Phase 1c), before the long, systematic phases. It
takes 15–30 minutes and finds most of what would hurt the owner *this week*. The full
audit still runs afterwards: triage is a head start, not a replacement.

Why it exists: sites built quickly (by AI tools, templates or one developer under time
pressure) fail in the same handful of ways. Lovable-built apps with Row Level Security
switched off (CVE-2025-48757), Next.js apps that trusted middleware alone
(CVE-2025-29927), keys pasted into frontend code, sandbox payment modes left on in
production — the same patterns show up again and again. Checking them first means a
critical problem reaches the owner in minutes, even if the session is interrupted later.

## How to run it

- Work from the inventory: skip items that don't apply (no payments → skip T9).
- Every item has a **quick test** that is safe (read-only, own test data, ≤ 20 requests).
- A hit becomes a finding with an ID right away (`S1`, `C1` …) and goes into the report
  file immediately (see "Working method" in SKILL.md).
- **Critical or High hit → tell the user now**, in 3–5 lines: what, impact, the fix, and
  "naprawić od razu czy dokończyć audyt?". Don't hold it back for the final report.
- Record a result for all 20 items (Hit / OK / N/A / Not checked + reason). The table
  goes into the report as section 1b.

## The 20 items

| # | Failure | Quick test | Bad sign |
|---|---|---|---|
| T1 | **Secrets in the frontend** | `passive-scan.mjs`; search bundles and `public/` for `sk_live`, `sk_test`, `sb_secret_`, `service_role`, `whsec_`, AI keys (`sk-`, `sk-ant-`), SMTP/DB passwords, webhook URLs; in code: `NEXT_PUBLIC_*`, `VITE_*`, `PUBLIC_*`, `REACT_APP_*` env vars holding secrets | any server secret reachable by a browser |
| T2 | **BaaS open to the world** (Supabase/Firebase/Appwrite) | with the public anon key: list each table/collection; try insert/update on own row with someone else's `user_id`; Supabase advisors (MCP) or `select * from pg_tables where rowsecurity = false` (white-box); Firebase rules `allow read, write: if true` | rows of other users, writes accepted, RLS off |
| T3 | **API routes without auth** | `map-routes.mjs` → "Routes without auth hint"; call the data/admin ones as guest | 200 with data for a guest |
| T4 | **Client-only checks** | every rule enforced in UI (premium, limits, role menus, disabled buttons) → call the API directly | server accepts what the UI hides |
| T5 | **IDOR on the main objects** | user B opens user A's order/profile/file by ID or slug (`endpoint-matrix.mjs` with two users) | B sees or changes A's data |
| T6 | **Middleware-only protection** | Next.js: version ≥ 15.2.3 / 14.2.25 / 13.5.9 / 12.3.5 (CVE-2025-29927); request with `x-middleware-subrequest` header on a protected page (local/staging); every Server Action and route handler checks the session itself | protected page served; actions without their own check |
| T7 | **Framework or package with a known critical CVE** | `npm audit --omit=dev`, lockfile versions vs advisories (React Server Components / Next.js RCE CVE-2025-55182 "React2Shell" — check affected `react-server-dom-*` and Next.js versions), CMS core/plugins vs WPScan | exploitable version in production |
| T8 | **Sandbox / test / debug left on in production** | run the app in production mode (`NODE_ENV=production`, no payment keys) locally; look for test payment pages, `?debug=1`, seeded admin accounts, Swagger UI, GraphQL playground, `/api/test`, verbose errors | free "payments", debug data, default admin works |
| T9 | **Payment marked paid without a verified webhook** | read the code path that sets `paid`; replay a webhook without/with a wrong signature; change amount/currency in the client request | status from redirect URL or client, no signature/amount check |
| T10 | **Price, quantity or plan from the client** | change `price`, `amount`, `plan`, `quantity: -1`, `discount` in the request | server trusts the value |
| T11 | **Stored XSS into the admin panel** | marker payload in a public form (name, message, review) → open the admin list | script runs where the admin is logged in |
| T12 | **Password reset and login flaws** | reset token in URL logs/e-mail via `Host:` header injection; token reuse; login without rate limit; lockout that anyone can trigger | takeover or locking anyone out |
| T13 | **Credential and data files published** | `git ls-files` for `.env*`, `data/`, `*.sqlite*`, `*.db*`, `*.log`, `backup*`, files like `PIERWSZE-LOGOWANIE.txt` / `admin-password.txt`; gitleaks/trufflehog on history; same paths over HTTP (passive scan) | secrets or personal data in the repo or on the web — public repo = published |
| T14 | **Admin panel weak** | default/guessable URL + no 2FA + no rate limit; seeded password from docs; admin session shared with user session | admin reachable by brute force |
| T15 | **CORS with credentials for any origin** | `Origin: https://evil.example` and `Origin: null` on authenticated API | origin reflected + `Allow-Credentials: true` |
| T16 | **Open e-mail relay / e-mail to any address** | contact, order or "send to a friend" forms that e-mail an address the user typed without confirming it | site sends mail to victims on demand |
| T17 | **AI endpoint as an open proxy** | call the AI route without login, with a huge prompt, many times; "ignore instructions and …"; tools that act outside the user's rights | free model access on the owner's bill, data via tools |
| T18 | **Trusted proxy misconfiguration** | send `X-Forwarded-For: 1.2.3.4` on login 20× with different values (local/staging) | rate limit resets → brute force possible; spoofed IPs in logs |
| T19 | **Crash on malformed input** | `%E0%A4%A` and `%ZZ` in paths, invalid JSON, 2 MB body, wrong types | 500 / stack trace / connection reset / error log flood |
| T20 | **No backups or untested restore** | ask; look for backup jobs and where they go | data loss = business loss |

## After triage

Write the triage table into the report file, list hits with their IDs, tell the user
about Critical/High hits, then continue with Phase 2. Triage items found OK are still
covered again in the systematic phases — the systematic phases have the last word.
