---
name: website-security-checker
description: Full security audit of a website or web app the user owns or is authorized to test — first a complete reconnaissance and inventory (server, hosting, frontend, backend/API connections, shop, CMS, payments, forms, auth, third-party scripts, every network feature), then targeted checks of everything that was found — XSS, injection, data leaks, exposed secrets and files, access control/IDOR, shop price and order tampering, CMS/admin exposure, CORS/CSRF, headers, cookies, TLS, rate limiting, webhooks, uploads, AI chatbots. Ends with a prioritized report with fixes. Use this skill whenever the user asks to check, audit, test, scan or harden the security of a site, shop, landing page, API or panel — also in Polish ("sprawdź bezpieczeństwo strony", "audyt bezpieczeństwa", "czy moja strona jest bezpieczna", "przetestuj sklep na XSS", "wycieki danych", "zabezpieczenia strony", "pentest mojej strony") — and before publishing a site that was built quickly or with AI.
---

# Website Security Checker

You perform a defensive security audit of a website. The method is always the same:
**map everything first, then test what exists, then report**. A checklist run blindly
against a site misses the features that actually carry risk (a custom quote calculator,
a hidden admin route, a Supabase table, a webhook) and wastes time on features the site
does not have. The inventory is what makes the audit complete.

## Language

The user usually writes in Polish. Understand Polish input, ask questions and write the
final report in the user's language (default: Polish). Keep technical terms (XSS, CSRF,
IDOR, CSP) in their standard English form, with a short Polish explanation the first time.

## Phase 0 — Scope and rules of engagement

Before sending any request, establish:

1. **Target**: URL(s), subdomains, API base URLs, admin panel URL, and/or a local repo path.
2. **Authorization**: the user owns the site or has written permission to test it. If the
   target clearly belongs to someone else and no permission is stated, ask. Do not test
   third-party services the site merely uses (payment provider, CDN, Google) — only how the
   site integrates with them.
3. **Mode** — pick what is available, more is better:
   - **White-box**: source code is available (repo, local folder). Most accurate.
   - **Black-box**: only the live URL. Use passive observation + safe requests.
   - **Grey-box**: URL + test account(s) (ideally two regular users + one admin, so access
     control between users can be tested).
4. **Environment**: prefer a local or staging copy for anything beyond passive checks.

Safety rules (explain them briefly to the user, they protect the business):

- Non-destructive by default. No DoS or load testing, no mass brute force, no
  vulnerability scanners in aggressive mode, no deleting or modifying real data.
- Rate-limit tests use a handful of requests (e.g. 10–20), not thousands.
- Never place real orders or real payments. Use the payment provider's sandbox/test mode.
- If you find exposed personal data or secrets: confirm the exposure with the minimum
  needed (status code, field names, one redacted sample), stop, and report. Do not download
  dumps, do not use leaked credentials to log in anywhere.
- Proof-of-concept payloads must be harmless (e.g. `alert(document.domain)` style markers
  or a unique string), never anything that steals cookies or affects other users.
- Do not paste secrets into the report in full — redact to the first/last 4 characters.

## Phase 1 — Reconnaissance and inventory

Goal: a complete map of what the site is and what it does. Read
`references/recon.md` for the full procedure. In short:

1. **Quick passive scan** (if Node 18+ is available):
   `node scripts/passive-scan.mjs https://example.com --out scan.json`
   It checks HTTPS/redirects, security headers, cookies, CORS reflection, common exposed
   files (`.env`, `.git`, backups, source maps), tech fingerprints, secrets in JS bundles,
   API endpoints referenced in JS, and forms. Treat its output as leads to verify, not as
   findings — confirm each one manually.
2. **Crawl the site**: all pages, navigation, footer, sitemap, robots, every form and
   button that sends something. With a browser tool, also watch the network tab: every
   XHR/fetch/WebSocket call is an attack surface.
3. **In white-box mode**: list routes/endpoints from the server code, middleware chain,
   auth checks per route, database access, env/config handling, dependencies.
4. **Write the inventory** (show it to the user before testing — it often reveals features
   they forgot about):

```
## Mapa strony (inwentaryzacja)
| Obszar | Co znaleziono | Gdzie (URL / plik) | Dane / ryzyko |
|---|---|---|---|
| Hosting / serwer | ... | | |
| Frontend (framework, build) | ... | | |
| Backend / API | ... | | |
| Baza danych / BaaS | ... | | |
| CMS / sklep | ... | | |
| Logowanie / konta / role | ... | | |
| Formularze | ... | | |
| Płatności / webhooki | ... | | |
| Upload plików | ... | | |
| Skrypty zewnętrzne / analityka | ... | | |
| E-mail (wysyłka, SPF/DKIM/DMARC) | ... | | |
| Subdomeny / inne środowiska | ... | | |
| Funkcje AI / chatbot | ... | | |
| Inne funkcje sieciowe (WebSocket, SSE, cron, proxy) | ... | | |
```

## Phase 2 — Test plan from the inventory

Map every inventory row to the checks that apply (catalogue in `references/checks.md`;
shop/CMS/payment specifics in `references/ecommerce-cms.md`). Rule of thumb:

- Every **input** (form field, URL param, header, JSON body, file name, review text) →
  XSS, injection, validation, length limits.
- Every **endpoint returning data** → access control (can user A read user B's object?
  can a guest read it?), excessive data exposure (does the JSON contain more than the UI
  shows?), caching of private responses.
- Every **state-changing action** → authentication, authorization, CSRF, rate limiting,
  server-side validation, idempotency.
- Every **price, total, discount, stock, role or status** → must be decided by the server.
  If the client sends it and the server trusts it, that is a finding.
- Every **secret or key** seen by the browser → is it meant to be public? (Publishable
  Stripe key, Supabase anon key with RLS on = OK. Secret key, service role key, OpenAI
  key, SMTP password = critical.)
- Every **third-party script** → necessity, integrity (SRI), what data it receives.

Tell the user which checks you will run and which you cannot run in this mode (e.g. no
test account → IDOR between users not verified).

## Phase 3 — Execute the checks

Work area by area. For each check record: what you did, the evidence (request/response
excerpt, file:line, screenshot), the result. Prefer evidence from the real system over
assumptions; "the code looks like it might" is a lead, not a finding.

High-value checks that are frequently broken on quickly-built or AI-built sites — always
cover them when the feature exists:

1. Secrets in the frontend bundle or public repo (`VITE_*`, `NEXT_PUBLIC_*`, hardcoded
   keys, `.env` served as a static file, source maps exposing server code).
2. BaaS without row-level security (Supabase RLS off, Firebase rules `allow read, write:
   if true`, open storage buckets).
3. Prices/totals/discounts calculated in the browser and accepted by the server.
4. Admin/API routes protected only by hiding the link or by a frontend check.
5. IDOR on orders, invoices, uploads, user profiles (`/api/orders/1043` → try 1042).
6. Stored XSS through reviews, comments, contact forms rendered in the admin panel,
   product descriptions, file names, `innerHTML` / `dangerouslySetInnerHTML` / `v-html`.
7. Payment webhooks without signature verification or without checking amount/currency/
   order id against the database.
8. Contact/newsletter forms without rate limit or captcha (spam relay, mail bombing),
   or with header injection into e-mails.
9. CORS reflecting any Origin with credentials allowed.
10. Missing security headers (CSP, HSTS, frame-ancestors), cookies without
    `HttpOnly`/`Secure`/`SameSite`, sessions or JWT in `localStorage`.
11. Verbose errors and stack traces, debug endpoints, directory listing, default
    admin credentials, exposed `/phpinfo.php`, `/server-status`, backups.
12. Outdated dependencies / CMS plugins with known CVEs (`npm audit`, plugin versions).
13. Missing SPF/DKIM/DMARC — anyone can send e-mails "from" the shop.
14. AI chatbot: system prompt or keys leakage, prompt injection leading to actions or
    data access, no cost limits.

## Phase 4 — Report

Use the template in `references/report-template.md`. Requirements:

- Start with a short summary for a non-technical owner: overall risk level, the 3–5 most
  important things to fix, what is already done well.
- Each finding: severity (Krytyczne / Wysokie / Średnie / Niskie / Informacyjne),
  location, evidence, impact in plain language ("ktoś może kupić produkt za 1 zł"),
  how to reproduce safely, **concrete fix** (code/config snippet for their stack),
  and how to verify the fix.
- Severity reflects real exploitability × impact on this business, not the generic label.
  A missing header on a static brochure site is Low; the same on a shop with a login is
  higher.
- A **coverage table**: every inventory area → tested / partially / not tested + why.
  Never imply full coverage when something was not tested.
- A prioritized fix plan: "dziś" (critical, quick), "w tym tygodniu", "później".

Save the report as `RAPORT-BEZPIECZENSTWA-<domena>-<data>.md` if a filesystem is
available, and also give the summary and top findings directly in the chat.

## Phase 5 — Fix and retest (if the user wants)

If the user asks to fix: apply fixes in the code (white-box), smallest safe change first,
then re-run the exact check that found the issue and update the report status
(Naprawione / Częściowo / Otwarte). Do not mark something fixed without retesting.

## Reference files

- `references/recon.md` — reconnaissance procedure, fingerprints, where endpoints hide.
- `references/checks.md` — full check catalogue by category with test methods and fixes.
- `references/ecommerce-cms.md` — shops, carts, payments, webhooks, WordPress/WooCommerce,
  PrestaShop, Shopify, headless CMS, Supabase/Firebase, Polish payment gateways.
- `references/report-template.md` — report structure and severity guide.
- `scripts/passive-scan.mjs` — dependency-free Node 18+ passive scanner (GET/HEAD/OPTIONS
  only, low request count).
