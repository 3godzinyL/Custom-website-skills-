---
name: website-maker
description: Builds complete, professionally designed websites and online shops from a brief or from a SITE-BRIEF prepared by website-strategist. Analyses requirements (the user's wishes, what every site needs, what this type of site needs, what leading sites in the niche have), then proposes four options of growing scope (1 front, 2 backend, 3 admin panel and payments, 4 ultimate) with extras the user did not mention at the top. After the user picks, it plans the build in vertical slices that survive interruptions, runs a design phase (HTML demos, tokens shared with website-design), builds with secure defaults learned from real audits, and verifies every section in a browser with no AI slop. Suggests useful MCP servers. Use it whenever the user wants to make, build or create a website, landing page, shop, portfolio, booking site or business page — also in Polish ("zrób stronę", "zbuduj stronę", "stwórz sklep internetowy", "strona dla firmy", "landing page", "strona wizytówka", "potrzebuję strony dla…").
---

# Website Maker

You turn a brief into a finished website in two parts:

- **Part A — Requirements and proposal.** Understand the business, research what this
  type of site needs, and present four build options. Stop and let the user choose.
- **Part B — Plan, design and build.** Plan the build in slices, agree a design, then
  build the chosen option slice by slice with secure defaults, and verify it.

Users describe a site by the few things they are thinking about ("strona z cennikiem
i galerią"). A site that sells needs much more (trust, clear offer, contact path, legal
basics, speed, SEO, safe handling of data and money). Part A closes that gap before any
code is written; Part B makes sure what is built is complete, visible early and safe.

## Language

Understand Polish input fully (informal speech, dictation mistakes), talk to the user in
their language, and write all site copy in the audience's language (default Polish, with
fonts that support Polish characters). Use gender-neutral phrasing toward the user
("Propozycje spoza Twojej listy", not "o których nie wspomniałeś").

## Working with the other skills

This skill is one part of a set. Use the others when they are installed; when they are
not, the built-in references cover the same ground in lighter form.

- **website-strategist → maker.** If the user gives a `SITE-BRIEF.md` or a build prompt
  from website-strategist (or one exists in the project), treat it as the brief:
  - don't re-ask what it answers and don't redo its research — adopt its category
    standard, conditional rules, pulse (with sources), recommended option and direction;
  - **decisions are binding**: accepted ideas become requirements in the option where
    they belong; "Później" ideas may be offered as upgrades at the end; **rejected ideas
    are never proposed again**;
  - your "🔥 Propozycje" contain only *new* items the brief does not cover (e.g. from
    the universal foundation or technical opportunities), or are skipped;
  - say in one line what came from the brief.
  You still present the four options (pre-filled from the brief) and let the user
  choose. Without a brief, do the lighter research in A2 yourself and, for a
  competitive or unfamiliar niche, suggest starting with the strategist ("radar
  kategorii": leaders, current trends, competitor teardown, ideas to accept).
- **maker ↔ website-design.** Both follow `references/design-tokens-contract.md`
  (same files, same token names). If website-design is available, use its demo flow in
  B3 (3–4 HTML design demos with a signature motion moment each). If the project already
  has a `DESIGN-SYSTEM.md` from it, build with that system and don't invent a new one.
- **maker → website-security-checker.** Options 2–4 are built with
  `references/secure-defaults.md` and get a full audit before launch.

## Project memory: SITE-PLAN.md

Builds often span several sessions and get interrupted. Keep `SITE-PLAN.md` in the
project root and update it after every slice: chosen option and changes, decisions from
the brief, the slice plan with statuses, API contract and data model, sitemap with
section checklist, stack, decisions, placeholders list, content still needed from the
owner, MCPs in use, self-check results, open questions, and always a **`Następny krok`**
line. On a new session, read it first and continue from that line.

---

# Part A — Requirements and proposal

## A1. Read the brief

Extract briefly: business and offer (with prices if given); site type
(`references/site-types.md`) and business model (leads, sales, bookings, subscriptions,
content, portfolio); audience and market (city/region/country, B2C/B2B, price level);
the main action a visitor should take; assets (logo, photos, texts, colours, domain,
existing site); constraints (stack, hosting, budget, deadline, who edits content); and
features explicitly requested.

If something critical is missing (what is sold, or for whom), ask up to 5 short questions
in one message. Otherwise make reasonable assumptions and state them.

## A2. Requirements analysis

Build the requirement list from four sources and keep them separate:

1. **User's explicit wishes.**
2. **Universal foundation** (`references/requirements.md`), including legal basics for
   the market (Poland/EU: RODO, cookies, consumer law, Omnibus, accessibility) and, for
   options 2–4, the secure defaults (`references/secure-defaults.md`).
3. **Type-specific must-haves** (`references/site-types.md`).
4. **Market research — leaders and mainstream.** From the SITE-BRIEF when there is one.
   Otherwise, with web tools (or a research MCP), study 5–8 leading sites for this niche
   and market, build a quick feature matrix, separate table stakes from differentiators,
   keep only trends that help this audience. Without web access, use the references and
   say so.

From 3–4 pick the **extra proposals**: valuable features the user did not mention (and
the brief did not decide), each with a reason, a suggested option and effort.

## A3. The proposal

Present it in this order. Extra proposals go first because the user could not have
thought of them.

```markdown
## 🔥 Propozycje spoza Twojej listy
Rzeczy, które ma większość najlepszych stron tego typu, a których nie było w opisie:

| Propozycja | Dlaczego warto | Pasuje do opcji | Nakład |
|---|---|---|---|

Napisz, które dodać (np. „dodaj 1, 3 i 4 do wybranej opcji”).

## Jak rozumiem projekt
<3–6 punktów: biznes, odbiorca, cel strony, kierunek, założenia przyjęte bez pytania; źródło: opis / SITE-BRIEF>

## Fundament każdej opcji
<must-have: uniwersalne + dla tego typu strony + standard kategorii i zaakceptowane pomysły z briefu; każda opcja to zawiera>

## Opcja 1 — <nazwa>
**Dla kogo:** … **Co dostajesz:** … **Technologia:** … **Czego potrzebuję od Ciebie:** …
**Ograniczenia:** … **Skala pracy:** …

## Opcja 2 — <nazwa> (wszystko z opcji 1 +)
## Opcja 3 — <nazwa> (wszystko z opcji 2 +)
## Opcja 4 — <nazwa> (tryb ostateczny: wszystko z opcji 3 +)

## Jak wybrać
Wybierz numer 1–4. Do każdej opcji możesz dopisać lub usunąć elementy, np.:
„2 + płatności BLIK”, „3 bez kont klientów”, „1 + propozycje 2 i 5”.
```

What each option means (details, stacks and worked examples in `references/tiers.md`):
1. **Front**: polished front-end with header, hero, offer, reviews, gallery, FAQ,
   contact, animations, one icon set, SEO, responsive; no database or logins.
2. **Front + backend**: server and database, content and prices from the backend,
   stored and e-mailed forms, quotes or bookings, blog, newsletter, analytics, basic
   protection.
3. **Admin panel + payments**: admin with roles, payment gateway (PL: BLIK, Przelewy24,
   PayU, Tpay or Stripe), checkout, order statuses, transactional e-mails, invoices,
   discount codes, customer accounts where useful.
4. **Ultimate**: everything a niche leader has, e.g. multi-language, search and filters,
   recommendations, loyalty or subscriptions, AI assistant, integrations (Allegro,
   Google Merchant, InPost, KSeF, CRM), automations, A/B tests, PWA, monitoring, CI/CD.

Make every option concrete for this business and complete on its own. Then **stop and
wait for the user's choice.**

---

# Part B — Plan, design and build

## B1. Confirm scope and plan the build

Restate the chosen option with additions/removals as a checklist plus the sitemap
(pages → sections). Then plan per `references/build-plan.md`:
- **vertical slices** in the order for this option — the first slice is visible and
  usable in the browser (home page + the main flow end to end), never "all backend
  first";
- **data model and API contract** for the first slices, written before the code, so the
  front and back cannot drift apart;
- **definition of done** per slice.
Create `SITE-PLAN.md` with all of it and a `Następny krok` line. Suggest the MCP servers
this option needs, in one message (`references/mcp-toolkit.md`): typically Playwright
for visual QA, Context7 for framework docs, Stripe/Supabase in test mode for options
3–4. Never install them yourself; continue without them if declined.

## B2. Project skeleton, secure from the first commit

Before any feature: `.gitignore` (env files, `data/`, databases, logs, backups, uploads),
`.env.example`, startup configuration check that fails closed in production, error
handler without stack traces, security headers, body size limit, isolated data
directory for local tests. Details in `references/secure-defaults.md` §1–§3 and §8–§9.

## B3. Design phase

Read `references/design-playbook.md` and `references/inspiration.md`.
- **Existing `DESIGN-SYSTEM.md`** (from website-design): use it.
- **website-design available**: run its demo flow (3–4 short HTML demos with real
  content and a signature motion moment each; the user picks or mixes), then continue
  here with the chosen system, including its motion spec.
- **Otherwise**: write the concept (2–3 sentences from the business and the brief's
  direction), then build 2–3 compact HTML demos yourself (header, hero, one content
  section, review block, CTA, footer; real copy; mobile-ready) in `design-demos/`, open
  them for the user, and let them choose.

Then write `DESIGN-SYSTEM.md` and the token file per `references/design-tokens-contract.md`,
plus the component set (header/nav desktop+mobile, buttons with all states, cards, form
fields, review block, section header, footer), the section rhythm and the motion rules.

## B4. Content

- Real, specific copy in the audience's language; avoid the generic phrases listed in
  the playbook. Use the brief's keyword map and audience questions for headings, FAQ
  and guides.
- Never invent reviews, ratings, client logos, statistics, certificates or awards as
  real. Use clearly marked placeholders (`[PRZYKŁADOWA OPINIA — podmień na prawdziwą]`)
  or connect real Google reviews. Same for photos and phone numbers.
- Give the owner a **content kit**: list of texts and data you need, plus a **photo shot
  list** (what to photograph, orientation, how many; e.g. "3 zdjęcia przed/po z tego
  samego kąta, poziomo").
- Track every placeholder in `SITE-PLAN.md`.

## B5. Build slice by slice

- Existing stack first; otherwise the stack in `references/tiers.md` (default Node.js;
  plain HTML/CSS/JS or Astro for option 1).
- One vertical slice at a time, mobile-first, semantic HTML, tokens only; each slice
  meets its definition of done before the next starts. Show the user after slice ①.
- Animations follow the design system's motion rules: purposeful, fast,
  `transform`/`opacity`, `prefers-reduced-motion` respected.
- Backend (2–4): `references/secure-defaults.md` all the way — server-side validation
  and authorisation, prices and roles decided by the server, secrets in env, payment
  status only from verified webhooks, atomic handling of limited things, rate limits
  per IP and per account, e-mails only to confirmed addresses, features fail closed when
  a key is missing, isolated state for any local test server, stopped when done.
- Update `SITE-PLAN.md` (statuses, `Następny krok`) after each slice.

## B6. Verify

- Layout at 360, 768, 1280 and 1920 px; no horizontal scroll; tap targets ≥ 44 px.
- Look at every page in a browser (browser tool or Playwright MCP) and fix what looks
  off; a passing build is not proof it looks right.
- Accessibility (WCAG AA contrast, keyboard, visible focus, alt, labels, headings).
- Performance (optimized images and fonts; LCP < 2.5 s, INP < 200 ms, CLS < 0.1).
- SEO (titles, descriptions, Open Graph, sitemap, robots, schema.org for the type,
  clear factual answers that AI search can quote).
- Every form and flow end to end (submit, e-mail, saved record, sandbox payment).
- Options 2–4: the **security self-check** in `references/secure-defaults.md` §10,
  results written to `SITE-PLAN.md`.
- Anti-slop checklist from the playbook; if website-design is available, run its
  `scripts/consistency-audit.mjs` on the styles.

## B7. Launch and handoff

Go through `references/launch-checklist.md` with the user. Then tell them, in their
language: how to run, deploy and edit content; the placeholder list; what was verified
and what wasn't; "Później" ideas from the brief as possible next steps. For options 2–4
recommend the website-security-checker audit before going live, and the
website-strategist growth audit about a month after launch, when there is real traffic
data.

## Reference files

- `references/requirements.md` — discovery questions, universal must-haves, legal
  checklist (PL/EU), market research procedure.
- `references/site-types.md` — must-haves and trending extras for 20 site types.
- `references/tiers.md` — the four options in detail, stacks, worked examples.
- `references/build-plan.md` — vertical slices per option, contracts, definition of
  done, resumable SITE-PLAN.
- `references/secure-defaults.md` — secure defaults from real audits and the
  pre-audit self-check.
- `references/design-playbook.md` — design process, anti-AI-slop rules, typography,
  colour, layout, motion, tokens, QA.
- `references/inspiration.md` — designers, studios, galleries, best-designed shops.
- `references/design-tokens-contract.md` — shared token names and files (with website-design).
- `references/mcp-toolkit.md` — MCP servers useful while building, when and how.
- `references/launch-checklist.md` — domain, SSL, redirects, analytics, Search Console,
  Google Business Profile, backups, legal pages, monitoring, repository hygiene.
