---
name: website-maker
description: Builds complete, professionally designed websites and online shops from a user's brief. First analyses requirements in depth — what the user asked for, what every website needs, what this specific type of site needs, and what the best-selling, mainstream sites in this niche currently have — then proposes four build options of growing scope (1 front-only with reviews and animations, 2 connected backend, 3 admin panel and payment gateway, 4 ultimate everything), with extra trending features the user did not mention shown at the top. After the user picks 1–4 (and adds or removes items), it creates a coherent, non-generic design system and builds the site section by section with no AI slop. Use this skill whenever the user wants to make, build, create or design a website, landing page, online shop, portfolio, booking site or business page — also in Polish ("zrób stronę", "zbuduj stronę", "stwórz sklep internetowy", "strona dla firmy", "landing page", "strona wizytówka", "potrzebuję strony dla…").
---

# Website Maker

You turn a brief into a finished website in two parts:

- **Part A — Requirements and proposal.** Understand the business, research what this
  type of site needs, and present four build options. Stop and let the user choose.
- **Part B — Design and build.** Create a coherent design system and build the chosen
  option section by section, then verify it.

The reason for this split: users describe a site by the few things they are thinking
about ("strona z cennikiem i galerią"). A site that sells needs much more (trust,
clear offer, contact path, legal basics, speed, SEO). Part A closes that gap before any
code is written, so the build is done once and done right.

## Language

The user usually writes in Polish. Understand Polish input fully (including informal
speech and dictation mistakes), talk to the user in their language, and write all site
copy in the target audience's language (default Polish, with Polish diacritics working
everywhere — choose fonts that support Polish characters). Keep these instructions'
English terms out of the user-facing text unless they are standard (SEO, CMS, checkout).

Use gender-neutral phrasing toward the user in Polish when you don't know their gender
(e.g. "Propozycje spoza Twojej listy" rather than "o których nie wspomniałeś").

---

# Part A — Requirements and proposal

## A1. Read the brief

Extract and write down (briefly) what you know:
- business / topic, offer (products, services, prices if given)
- type of site (see `references/site-types.md`), business model: leads, sales,
  bookings, subscriptions, content, portfolio
- audience and market (city/region/country, B2C/B2B, price level)
- goal: what action a visitor should take (call, form, buy, book, sign up)
- assets: logo, photos, texts, brand colours, domain, existing site
- constraints: tech stack, hosting, budget, deadline, who will edit content later
- features explicitly requested

If something critical is missing (what the business sells, or who the site is for),
ask up to 5 short questions in one message. For everything else, make reasonable
assumptions and state them — don't block the user with a questionnaire.

## A2. Requirements analysis

Build the requirement list from four sources, and keep them separate because they serve
different purposes in the proposal:

1. **User's explicit wishes** — everything they asked for.
2. **Universal must-haves** — what every professional website needs
   (`references/requirements.md` → Universal must-haves). Includes legal basics for
   the target market (for Poland/EU: RODO/GDPR, cookies, consumer law, Omnibus,
   accessibility).
3. **Type-specific must-haves** — what this type of site cannot work without
   (`references/site-types.md`). A restaurant without a menu and opening hours, or a
   shop without delivery costs and returns info, loses customers regardless of design.
4. **Market research — bestsellers and mainstream.** What successful sites in this
   niche have right now. If web search/fetch tools are available, do real research:
   - find 5–10 leading sites for this niche and market (local leaders for local
     businesses, category leaders for shops, plus 1–2 international benchmarks),
   - note features they all share (table stakes) and features the best ones use to
     stand out (differentiators), and current trends that actually convert,
   - prefer evidence (what you saw on the sites, research like Baymard/NN/g) over
     trend-blog hype.
   If no web access, use `references/site-types.md` (trending features per type) and
   say the list is based on built-in knowledge, not today's research.

From sources 3–4, pick the **extra proposals**: valuable features the user did not
mention. Each needs a reason ("8 z 10 liderów w Trójmieście ma kalkulator wyceny";
"skraca drogę do zamówienia"), a suggested option (1–4) and effort.

## A3. The proposal

Present it in this exact order. The extra proposals go first, because they are what
the user could not have thought of; the options follow.

```markdown
## 🔥 Propozycje spoza Twojej listy
Rzeczy, które ma większość najlepszych stron tego typu, a których nie było w opisie:

| Propozycja | Dlaczego warto | Pasuje do opcji | Nakład |
|---|---|---|---|
| ... | ... | od 1 / od 2 ... | mały / średni / duży |

Napisz, które dodać (np. „dodaj 1, 3 i 4 do wybranej opcji”).

## Jak rozumiem projekt
<3–6 punktów: biznes, odbiorca, cel strony, założenia przyjęte bez pytania>

## Fundament każdej opcji
<lista must-have: uniwersalne + dla tego typu strony; każda z 4 opcji to zawiera>

## Opcja 1 — <nazwa, np. „Wizytówka premium”>
**Dla kogo:** ...
**Co dostajesz:** strony/sekcje i funkcje (konkretnie dla tego biznesu, nie ogólnie)
**Technologia:** ...
**Czego potrzebuję od Ciebie:** ...
**Ograniczenia:** czego ta opcja nie robi
**Skala pracy:** ...

## Opcja 2 — <nazwa> (wszystko z opcji 1 +)
...
## Opcja 3 — <nazwa> (wszystko z opcji 2 +)
...
## Opcja 4 — <nazwa> (tryb ostateczny: wszystko z opcji 3 +)
...

## Jak wybrać
Wybierz numer 1–4. Do każdej opcji możesz dopisać lub usunąć elementy, np.:
„2 + płatności BLIK”, „3 bez kont klientów”, „1 + propozycje 2 i 5”.
```

What each option means (details, stacks and per-type examples in `references/tiers.md`):

1. **Front** — a polished, fast front-end: header, hero, offer, reviews/testimonials,
   gallery, FAQ, contact, animations, consistent icons, SEO, responsive. Content in
   files; contact form via a simple endpoint or form service. No database, no logins.
2. **Front + backend** — a real server and database: content, offer and prices served
   from the backend (editable without touching code, e.g. JSON/DB + simple CMS),
   forms stored and e-mailed, booking/quote requests saved, blog, newsletter, analytics,
   basic protection (validation, rate limits, spam filtering).
3. **Admin panel + payments** — an admin panel with roles (content, products/services,
   orders, leads, bookings), payment gateway (for PL: BLIK, Przelewy24, PayU, Tpay or
   Stripe), checkout, order statuses, transactional e-mails, invoices, discount codes,
   customer accounts where they make sense.
4. **Ultimate** — everything a market leader in this niche would have: multi-language,
   advanced search and filters, recommendations, loyalty/subscriptions, AI assistant,
   integrations (Allegro, Google Merchant, InPost, accounting/KSeF, CRM), automation
   (abandoned cart, review requests), A/B tests, dashboards, PWA, performance and
   security hardening, monitoring, backups, tests, CI/CD.

Make every option concrete for this business (name the actual sections and features
for a paving-cleaning company, a bakery, a clothing shop…), not a generic feature list.
Each option must be a complete, sensible product on its own.

Then **stop and wait for the user's choice.** Do not start building before it.

---

# Part B — Design and build

## B1. Confirm scope

Restate the chosen option with additions/removals as a short checklist and the
sitemap (pages and their sections). Proceed unless the user objects.

## B2. Design system first

Read `references/design-playbook.md` (process, anti-AI-slop rules, typography, colour,
layout, motion, icons, imagery) and `references/inspiration.md` (designers, galleries
and best-designed shops to learn from). If the `website-design` skill is installed,
you may use it for a deeper design pass.

Produce, before building pages:
1. **Design concept** in 2–3 sentences derived from the business itself (its material,
   place, craft, audience), not from a generic "modern & clean" template.
2. **Design tokens** as CSS custom properties: colours (with contrast-checked text
   pairs), font families and type scale, spacing scale, radii, shadows, motion
   durations and easings, breakpoints.
3. **Component set**: header/nav (desktop + mobile), buttons (primary/secondary/
   ghost, all states), cards, form fields with validation states, review/testimonial,
   section heading pattern, footer. One icon library, one stroke style.
4. **Section rhythm**: plan which sections are wide/narrow, light/dark, image-led/
   text-led, so the page does not repeat the same block shape top to bottom.

Show the concept, palette and type pairing to the user in a few lines; continue unless
they want changes.

## B3. Content

- Write real, specific copy in the audience's language: concrete offer, prices or
  price ranges, area, time, guarantees, process steps. Avoid the generic AI phrases
  listed in the playbook.
- Never invent reviews, ratings, client logos, statistics, certificates or awards and
  present them as real — that misleads customers and, in the EU, fake reviews are
  illegal (Omnibus). If the user has none, build the review component and fill it with
  clearly marked placeholders (`[PRZYKŁADOWA OPINIA — podmień na prawdziwą]`) or connect
  real Google reviews. The same for photos and phone numbers: mark placeholders.
- Keep a list of every placeholder for the handoff.

## B4. Build

- Use the user's existing stack if there is one; otherwise follow the stack in
  `references/tiers.md` for the chosen option (default: Node.js; plain HTML/CSS/JS or
  Astro for option 1).
- Build section by section, mobile-first, semantic HTML, design tokens only (no
  random hex values or one-off spacing in components).
- Animations: purposeful, fast, `prefers-reduced-motion` respected; see the motion
  section of the playbook.
- Backend (options 2–4): validate everything on the server; prices, totals and roles
  are decided by the server; secrets only in environment variables; payment status
  only from verified provider webhooks; rate-limit forms and logins.

## B5. Verify

Before calling it done, check:
- Layout at 360, 768, 1280 and 1920 px; no horizontal scroll; tap targets ≥ 44 px.
- With a browser/screenshot tool available, actually look at every page and fix what
  looks off — a passing build is not proof that it looks right.
- Accessibility: contrast (WCAG AA), keyboard navigation, focus visible, alt texts,
  labels on form fields, heading order.
- Performance: optimized images (AVIF/WebP, sizes), fonts subset + `font-display`,
  no render-blocking junk; aim for LCP < 2.5 s, INP < 200 ms, CLS < 0.1.
- SEO: unique titles/descriptions, Open Graph, sitemap, robots, schema.org for the
  type (LocalBusiness, Product, Restaurant, FAQPage…).
- Forms and flows actually work end to end (submit, e-mail, saved record, payment in
  sandbox).
- Anti-slop review: go through the checklist in the playbook and fix every hit.

## B6. Handoff

Tell the user, in their language: how to run and deploy it, how to edit content,
the list of placeholders to replace, what was verified and what wasn't, and next
steps. For options 2–4 recommend a security pass with the `website-security-checker`
skill before going live.

## Reference files

- `references/requirements.md` — discovery questions, universal must-haves, legal
  checklist for Poland/EU.
- `references/site-types.md` — must-haves and trending extras per site type.
- `references/tiers.md` — the four options in detail, stacks, per-type examples.
- `references/design-playbook.md` — design process, anti-AI-slop rules, tokens,
  typography, colour, layout, motion, icons, QA checklist.
- `references/inspiration.md` — designers, studios, galleries and best-designed shops
  with what to learn from each.
