# The four build options

Each option includes everything from the previous one plus the foundation
(universal + type must-haves). Adapt names to the business ("Wizytówka premium",
"Strona z zapleczem", "Sklep z panelem", "Pełna platforma").

## Contents
1. Option 1 — Front
2. Option 2 — Front + backend
3. Option 3 — Admin panel + payments
4. Option 4 — Ultimate
5. Default stacks
6. Worked example: local service (mycie kostki brukowej)
7. Worked example: small online shop (kawa speciality)

## 1. Option 1 — Front

**Purpose:** a fast, beautiful site that explains the offer and gets contacts.
**Includes:**
- Header with navigation, mobile menu, primary CTA (call / quote / book).
- Hero with a concrete promise and real photo/video.
- Offer/services or product highlights with prices or price ranges.
- "Why us" with specifics, process steps, guarantee.
- Reviews/testimonials section (real or marked placeholders; Google reviews embed
  possible), ratings summary.
- Gallery / portfolio / before-after.
- FAQ, about/team, contact section with map, form, click-to-call.
- Footer with company data and legal links; privacy policy and cookie consent.
- Animations: entrance reveals, hover/focus states, smooth anchor scrolling, subtle
  hero motion; one consistent icon set.
- SEO pack: meta, Open Graph, sitemap, robots, schema.org, favicon set.
- Contact form via a minimal serverless/Node endpoint or a form service (Formspree,
  Web3Forms, Netlify Forms) with spam protection.
**Not included:** database, editing without code, logins, payments.
**User provides:** logo, photos, texts or bullet facts, contact data.

## 2. Option 2 — Front + backend

**Purpose:** content and leads managed by a real backend.
**Adds:**
- Node.js server (or the user's stack) with a database (SQLite for small sites,
  PostgreSQL for growth).
- Content served from the backend: services, prices, gallery, FAQ, reviews,
  opening hours editable without code (simple protected editor or headless CMS).
- Forms saved in the DB + e-mail notification to the owner + confirmation to the
  customer; optional photo upload (validated, stored safely).
- Quote/booking request flow stored with status (nowe / w kontakcie / umówione).
- Blog/guides with categories (local SEO, content marketing).
- Newsletter with double opt-in (own or via provider API).
- Analytics with conversion events; consent management.
- Security basics: server validation, rate limiting, captcha/honeypot, security
  headers, secrets in env, backups of DB.
**Not included:** payments, full admin dashboard with roles, customer accounts.

## 3. Option 3 — Admin panel + payments

**Purpose:** run the business through the site.
**Adds:**
- Admin panel (login with 2FA option, roles: owner/editor/staff): dashboard with
  leads/orders/bookings, CRUD for products/services/content/media, customer list,
  settings (hours, delivery, prices, texts).
- Payments: BLIK, Przelewy24/PayU/Tpay or Stripe (cards, Apple/Google Pay), sandbox
  tested; order paid only after verified webhook.
- Checkout or paid booking/deposit, order statuses, transactional e-mails
  (confirmation, payment, shipped, cancelled), invoices (PDF, NIP field), discount
  codes, stock/availability.
- Delivery: InPost Paczkomaty widget + courier, shipping rules, free-shipping threshold
  (for shops); calendar slots and deposits (for bookings).
- Customer accounts where useful (order history, saved addresses) or guest flow with
  order lookup.
- Legal pages for selling: regulamin, returns/withdrawal, complaints; Omnibus lowest
  price display; GPSR product fields.
- Logs of admin actions, export of orders/leads (CSV).

## 4. Option 4 — Ultimate

**Purpose:** the market-leader version for this niche.
**Adds (choose what fits the type):**
- Multi-language and multi-currency, localised SEO.
- Advanced search (typo-tolerant, filters, facets), recommendations, recently viewed,
  wishlist, comparison.
- Loyalty points, referral program, gift cards, subscriptions/memberships.
- AI assistant (product/service advisor, FAQ bot) with safe tool access and limits.
- Integrations: Allegro, Google Merchant Center, Meta catalogue, InPost/courier APIs,
  accounting/invoicing + KSeF, CRM, mailing automation (abandoned cart, review
  requests, win-back), Google Business Profile reviews.
- Interactive tools: price calculator, configurator, quiz, 3D/AR viewer, virtual tour —
  whatever leaders in the niche use.
- PWA (installable, offline basics), push/SMS notifications.
- Reviews system with photos, moderation and verified-purchase marking.
- Dashboards: sales, conversion funnel, top products/services, cohort retention.
- A/B testing, heatmaps (consent-gated).
- Performance and reliability: CDN, image pipeline, caching, monitoring, error tracking,
  uptime alerts, automated backups, staging environment, CI/CD, automated tests
  (unit + e2e), security hardening and audit.

## 5. Default stacks

Match the user's existing stack first. Otherwise:

| Option | Default | Alternatives |
|---|---|---|
| 1 | Static HTML + CSS (custom properties) + small vanilla JS; or Astro | Next.js static export, Eleventy |
| 2 | Node.js (Express or Fastify) + SQLite/PostgreSQL + server-rendered templates or Astro SSR; simple admin editor | Next.js + headless CMS (Strapi/Directus/Payload/Sanity), Supabase with RLS |
| 3 | Option 2 + admin app (same Node server, protected routes) + payment provider SDK + mailer (Nodemailer/SMTP or Resend/Postmark) + PDF invoices | Next.js + Payload/Medusa, WooCommerce/PrestaShop/Shopify when the user prefers a platform |
| 4 | Option 3 + search engine (Meilisearch/Typesense), queue/jobs, Redis cache, monitoring (Sentry), CI/CD | Medusa/Saleor for commerce-heavy builds, Shopify Plus for brands that want managed infra |

Animation libraries: CSS + IntersectionObserver by default; GSAP (free, incl. ScrollTrigger)
for complex sequences; Motion for React projects; Lenis only if smooth scroll is
really wanted and doesn't break accessibility. Icons: Lucide, Phosphor, Tabler or
Heroicons — one set per project.

## 6. Worked example: local service (mycie kostki brukowej, Trójmiasto)

- **Fundament:** obszar działania z mapą, cennik „od X zł/m²”, galeria przed/po,
  proces 1-2-3, gwarancja, opinie z Google, telefon w pasku na mobile, formularz wyceny
  ze zdjęciem, dane firmy, polityka prywatności, cookies.
- **Opcja 1 — Wizytówka premium:** wszystkie sekcje powyżej, suwak przed/po, animacje
  wejścia, ikony z jednego zestawu, SEO lokalne (strony usług: kostka, dachy, elewacje),
  formularz przez prosty endpoint.
- **Opcja 2 — Strona z zapleczem:** cennik, galeria i opinie edytowane z backendu,
  zapytania zapisywane w bazie z e-mailem do właściciela, kalkulator wyceny (m² × usługa ×
  impregnacja) z zapisem, blog porad, podstrony miast (Gdańsk, Gdynia, Sopot…).
- **Opcja 3 — Panel i płatności:** panel zleceń (statusy, terminy, zdjęcia z realizacji),
  rezerwacja terminu z zadatkiem BLIK/P24, kalendarz ekip, faktury, kody rabatowe
  sezonowe, automatyczna prośba o opinię Google po zleceniu.
- **Opcja 4 — Pełna platforma:** abonament serwisowy (mycie co rok + impregnacja),
  konto klienta z historią i zdjęciami, asystent AI wyceny ze zdjęcia, SMS-y
  przypominające, integracja z księgowością/KSeF, raporty sezonowe, PWA dla ekipy
  (lista zleceń, zdjęcia przed/po prosto do galerii), wiele języków (np. EN/UA).

## 7. Worked example: small online shop (kawa speciality)

- **Fundament:** kategorie (ziarno, mielona, akcesoria), karta produktu (pochodzenie,
  obróbka, profil smaku, stopień palenia, data palenia), koszty dostawy przed checkoutem,
  BLIK/P24, InPost, regulamin, zwroty, Omnibus, opinie, dane firmy.
- **Opcja 1:** sklep „katalogowy” — produkty w plikach, zamówienie przez formularz lub
  link do płatności; storytelling palarni, animacje, przewodnik parzenia.
- **Opcja 2:** produkty i stany z backendu, filtry (metoda parzenia, profil), newsletter,
  blog z przepisami, zapisywane zamówienia bez płatności online (przelew/pobranie).
- **Opcja 3:** pełny checkout z BLIK/P24/kartą, panel zamówień i produktów, faktury,
  kody rabatowe, konta klientów, e-maile transakcyjne, widget Paczkomatów.
- **Opcja 4:** subskrypcja kawy co 2/4 tygodnie, quiz „dobierz kawę”, program
  lojalnościowy, rekomendacje, porzucony koszyk, Allegro + Google Merchant, B2B dla
  kawiarni z cenami hurtowymi, wiele języków, PWA, analityka kohort.
