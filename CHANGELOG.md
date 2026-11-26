# Changelog

## 2.0.0 — 2026-11-26

Everything in this release comes from the side-by-side test in `bez skilli/` and
`z skillami/` (same prompt, built without and with the skills, both audited).

### 🧭 website-strategist
- **Category radar** (`references/trend-radar.md`): decode the idea into a thesis and a
  category type, a keyword map in four rings (local language + English), leaders, fast
  risers and design benchmarks, a news pulse of the last 3–6 months with dated sources
  and ride / answer / avoid decisions, teardown cards of competitors' real pages, a
  feature matrix and 1–3★ reviews, then category standard, differentiators, gaps and
  audience questions.
- **Idea board and directions** (`references/idea-board.md`): ten lenses, idea cards
  typed Standard / Wave / Differentiator / Bold, 2–3 strategic directions plus product
  directions, an acceptance round where the user says TAK / NIE / MOŻE.
- **SITE-BRIEF v2**: thesis and keywords, radar, decisions (accepted / later /
  rejected), chosen direction, signature moment candidate, content plan from audience
  questions, dated sources; an explicit division of work between the four skills.

### 🏗️ website-maker
- **Build plan in vertical slices** (`references/build-plan.md`): the first slice is
  visible and usable, API contract and data model before code, definition of done per
  slice, `SITE-PLAN.md` with a "Następny krok" line. Reason: the build without skills
  finished the backend and ran out of usage before any UI existed.
- **Secure defaults** (`references/secure-defaults.md`) from the 51 findings of both
  audits: fail-closed configuration, repository hygiene, input and boolean parsing,
  sessions and 2FA, least privilege, atomic handling of limited things, abuse of
  legitimate features, proxies, service workers, self-hosted fonts, and a 10-step
  self-check before handoff.
- Decisions from the brief are binding; rejected ideas are never re-proposed.

### 🎨 website-design
- **Motion system** (`references/motion-system.md`): how top front-end engineers and
  studios work, motion personality, tokens and choreography, one signature moment per
  site, modern CSS with code (`@starting-style`, height to auto, scroll-driven
  animations, View Transitions, clip-path, `@property`, SVG drawing, respectful
  marquee), JS techniques (FLIP, accessible split text, magnetic CTA, product UI loop),
  an idea bank for 10 site types, library guidance, performance and accessibility gates.
- **Craft pass** (`references/craft-pass.md`): 40 checks before anything is shown.
- Each demo now has its own motion personality and signature moment; the migration
  adds a motion layer and a craft pass; motion extras added to the shared token
  contract.

### 🛡️ website-security-checker
- **Fast triage** (`references/fast-triage.md`): 20 failures that sink AI-built sites,
  run right after the inventory; Critical/High hits go to the user immediately.
- **Working method**: the report exists from minute one with a "Stan audytu" block, so
  an interrupted session resumes; evidence status per finding; reproducible scenario
  scripts; no silent sampling.
- **Phase 8b**: production configuration (complete / key missing / behind a proxy),
  a second pass with fresh eyes (it found 7 extra issues in the test), coverage gate.
- **Check catalogue** §19–21: production config, proxies and repo hygiene; framework
  pitfalls 2025–2026 (Next.js middleware bypass, React Server Components RCE, Supabase
  RLS in AI-generated apps, npm supply chain); robustness and abuse of legitimate
  features. More on 2FA replay, lockout DoS, owner recovery, least privilege.
- **Scripts**:
  - `map-routes.mjs` resolves router mounts and full prefix chains
    (`app.use('/api/admin', auth, adminRoutes(deps))`), named/namespace imports,
    several factories per file, nested routers, Hono and Fastify prefixes, Express 5
    wildcards and array paths, frontend wrappers (`api.post('/x')`, `api('POST', '/x')`,
    `postJson('/x')`), navigations, forms in JS templates, router-level auth middleware,
    Server Actions; flags password forms without `method="post"`. On the test project:
    6/6 routers resolved and 0 false "calls without route" (v1: 0 and 3).
  - `endpoint-matrix.mjs` never sends role credentials to another origin, skips GET
    routes that look state-changing, retries once on 429, also tests `Origin: null`.
  - `passive-scan.mjs` handles local targets without false HTTPS alarms, finds
    password forms sent by GET, new secret formats (Supabase `sb_secret_`, Stripe
    `whsec_`, Resend, npm, Hugging Face, Groq, Discord/Slack webhooks) and more exposed
    files (`.env` backups, `.npmrc`, `sftp.json`, SQLite files, directory listings).

### Repository
- New English `README.md` with the test results, 15 reasons, the workflow diagram and
  the security logic; full Polish `README.pl.md`; banner, social preview and
  comparison images in `assets/`; `LICENSE` (MIT); `.gitignore` for test data.

## 1.0.0 — 2026-11-24

First public version: four cooperating skills (strategist, maker, design, security
checker) with references, three security scripts, the demo gallery and the design
consistency audit.
