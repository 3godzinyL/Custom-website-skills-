---
name: website-maker
description: Builds complete, professionally designed websites and online shops from a brief or from a SITE-BRIEF/prompt prepared by the website-strategist skill. First analyses requirements — what the user asked for, what every site needs, what this type of site needs, what best-selling sites in the niche have — then proposes four options of growing scope (1 front with reviews and animations, 2 backend, 3 admin panel and payments, 4 ultimate), with trending extras the user did not mention shown at the top. After the user picks 1–4 (with own changes), it runs a design phase (HTML design demos, shared design tokens with website-design), suggests useful MCP servers, and builds and verifies the site section by section with no AI slop. Use it whenever the user wants to make, build or create a website, landing page, shop, portfolio, booking site or business page — also in Polish ("zrób stronę", "zbuduj stronę", "stwórz sklep internetowy", "strona dla firmy", "landing page", "strona wizytówka", "potrzebuję strony dla…").
---

# Website Maker

You turn a brief into a finished website in two parts:

- **Part A — Requirements and proposal.** Understand the business, research what this
  type of site needs, and present four build options. Stop and let the user choose.
- **Part B — Design and build.** Agree a design, then build the chosen option section by
  section and verify it.

Users describe a site by the few things they are thinking about ("strona z cennikiem
i galerią"). A site that sells needs much more (trust, clear offer, contact path, legal
basics, speed, SEO). Part A closes that gap before any code is written.

## Language

Understand Polish input fully (informal speech, dictation mistakes), talk to the user in
their language, and write all site copy in the audience's language (default Polish, with
fonts that support Polish characters). Use gender-neutral phrasing toward the user
("Propozycje spoza Twojej listy", not "o których nie wspomniałeś").

## Working with the other skills

This skill is one part of a set. Use the others when they are installed; when they are
not, the built-in references cover the same ground in lighter form.

- **website-strategist → maker.** If the user gives a `SITE-BRIEF.md` or a build prompt
  from website-strategist (or one exists in the project), treat it as the brief: don't
  re-ask what it answers, adopt its requirements, conditional rules, trends (with their
  evidence), recommended option and proposals, and say in one line what came from it.
  You still present the four options (pre-filled from the brief) and let the user choose.
  If there is no brief but the strategist skill is available, use it for the research
  step (A2) when the niche is unfamiliar or competitive, or suggest the user starts with
  it for a deeper analysis.
- **maker ↔ website-design.** Both follow `references/design-tokens-contract.md`
  (same files, same token names). If website-design is available, use its demo flow in
  B2 (3–4 HTML design demos to choose from). If the project already has a
  `DESIGN-SYSTEM.md` from it, build with that system and don't invent a new one.
- **maker → website-security-checker.** Options 2–4 get a security pass before launch.

## Project memory: SITE-PLAN.md

Builds often span several sessions. Keep `SITE-PLAN.md` in the project root and update it
after every milestone: chosen option and changes, sitemap with section checklist and
status, stack, decisions, placeholders list, content still needed from the owner, MCPs in
use, open questions. On a new session, read it first and continue from it.

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
2. **Universal must-haves** (`references/requirements.md`), including legal basics for
   the market (Poland/EU: RODO, cookies, consumer law, Omnibus, accessibility).
3. **Type-specific must-haves** (`references/site-types.md`).
4. **Market research — bestsellers and mainstream.** With web tools (or the strategist
   skill, or a research MCP), study 5–10 leading sites for this niche and market, build a
   feature matrix, separate table stakes from differentiators, keep only trends that
   help this audience. Without web access, use the references and say so.

From 3–4 pick the **extra proposals**: valuable features the user did not mention, each
with a reason, a suggested option and effort.

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
<3–6 punktów: biznes, odbiorca, cel strony, założenia przyjęte bez pytania; źródło: opis / SITE-BRIEF>

## Fundament każdej opcji
<must-have: uniwersalne + dla tego typu strony; każda opcja to zawiera>

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

# Part B — Design and build

## B1. Confirm scope and set up

Restate the chosen option with additions/removals as a checklist plus the sitemap
(pages → sections). Create `SITE-PLAN.md`. Suggest the MCP servers this option needs,
in one message (`references/mcp-toolkit.md`): typically Playwright for visual QA,
Context7 for framework docs, Stripe/Supabase in test mode for options 3–4. Never install
them yourself; continue without them if declined.

## B2. Design phase

Read `references/design-playbook.md` and `references/inspiration.md`.
- **Existing `DESIGN-SYSTEM.md`** (from website-design): use it.
- **website-design available**: run its demo flow (3–4 short HTML demos with real
  content, the user picks or mixes), then continue here with the chosen system.
- **Otherwise**: write the concept (2–3 sentences from the business), then build 2–3
  compact HTML demos yourself (header, hero, one content section, review block, CTA,
  footer; real copy; mobile-ready) in `design-demos/`, open them for the user, and let
  them choose.

Then write `DESIGN-SYSTEM.md` and the token file per `references/design-tokens-contract.md`,
plus the component set (header/nav desktop+mobile, buttons with all states, cards, form
fields, review block, section header, footer) and the section rhythm.

## B3. Content

- Real, specific copy in the audience's language; avoid the generic phrases listed in
  the playbook.
- Never invent reviews, ratings, client logos, statistics, certificates or awards as
  real. Use clearly marked placeholders (`[PRZYKŁADOWA OPINIA — podmień na prawdziwą]`)
  or connect real Google reviews. Same for photos and phone numbers.
- Give the owner a **content kit**: list of texts and data you need, plus a **photo shot
  list** (what to photograph, orientation, how many; e.g. "3 zdjęcia przed/po z tego
  samego kąta, poziomo").
- Track every placeholder in `SITE-PLAN.md`.

## B4. Build

- Existing stack first; otherwise the stack in `references/tiers.md` (default Node.js;
  plain HTML/CSS/JS or Astro for option 1).
- Section by section, mobile-first, semantic HTML, tokens only.
- Animations purposeful and fast, `prefers-reduced-motion` respected.
- Backend (2–4): server-side validation; prices, totals and roles decided by the server;
  secrets in env; payment status only from verified webhooks; rate-limited forms and
  logins; isolated state for any local test server, stopped when done.
- Update `SITE-PLAN.md` after each page.

## B5. Verify

- Layout at 360, 768, 1280 and 1920 px; no horizontal scroll; tap targets ≥ 44 px.
- Look at every page in a browser (browser tool or Playwright MCP) and fix what looks
  off; a passing build is not proof it looks right.
- Accessibility (WCAG AA contrast, keyboard, visible focus, alt, labels, headings).
- Performance (optimized images and fonts; LCP < 2.5 s, INP < 200 ms, CLS < 0.1).
- SEO (titles, descriptions, Open Graph, sitemap, robots, schema.org for the type).
- Every form and flow end to end (submit, e-mail, saved record, sandbox payment).
- Anti-slop checklist from the playbook; if website-design is available, run its
  `scripts/consistency-audit.mjs` on the styles.

## B6. Launch and handoff

Go through `references/launch-checklist.md` with the user. Then tell them, in their
language: how to run, deploy and edit content; the placeholder list; what was verified
and what wasn't; next steps. For options 2–4 recommend the website-security-checker
skill before going live, and the website-strategist audit about a month after launch,
when there is real traffic data.

## Reference files

- `references/requirements.md` — discovery questions, universal must-haves, legal
  checklist (PL/EU), market research procedure.
- `references/site-types.md` — must-haves and trending extras for 20 site types.
- `references/tiers.md` — the four options in detail, stacks, worked examples.
- `references/design-playbook.md` — design process, anti-AI-slop rules, typography,
  colour, layout, motion, tokens, QA.
- `references/inspiration.md` — designers, studios, galleries, best-designed shops.
- `references/design-tokens-contract.md` — shared token names and files (with website-design).
- `references/mcp-toolkit.md` — MCP servers useful while building, when and how.
- `references/launch-checklist.md` — domain, SSL, redirects, analytics, Search Console,
  Google Business Profile, backups, legal pages, monitoring.
