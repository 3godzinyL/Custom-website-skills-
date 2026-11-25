# Conditional requirements (if the site does X, it must have Y)

These rules are triggered by what a site *does*, regardless of niche. In audits, check
every triggered rule; in blueprints, include every triggered rule in the prompt. Legal
items are a presence checklist for Poland/EU, not legal advice — recommend the owner
confirms texts with a lawyer or a reputable generator, and check current rules.

| If the site… | It must have… | Why |
|---|---|---|
| collects any personal data (form, newsletter, account) | privacy policy, information clause at the form, consent checkboxes unticked, secure transport | RODO/GDPR; trust |
| uses analytics/marketing cookies or pixels | consent banner with equal accept/reject, tags only after consent, Consent Mode v2 for Google | ePrivacy/RODO, Google ads requirements |
| sells to consumers online | regulamin, 14-day withdrawal info + model form, complaint (reklamacja) procedure, total price with VAT and delivery before order, clear "order with obligation to pay" button, company data | Polish consumer law |
| shows discounts / promo prices | lowest price from 30 days before the discount next to it | Omnibus directive |
| shows customer reviews | information whether and how reviews are verified; no fake or bought reviews | Omnibus; trust |
| sells physical products in the EU | manufacturer/responsible person data, safety warnings and instructions where relevant on product pages | GPSR (since 13 Dec 2024) |
| sells to companies / issues invoices | NIP field, invoice generation, KSeF readiness for B2B invoices (mandatory for most companies since 2026) | Polish VAT rules |
| is an e-commerce or consumer service of a non-micro company | accessibility to WCAG-level standard and an accessibility statement | European Accessibility Act (since 28 Jun 2025) |
| takes bookings | real availability, confirmation + reminder, cancellation/no-show policy, calendar sync for staff | no-shows, trust |
| takes deposits or prepayments | clear refund rules, payment via provider, confirmation e-mail | consumer clarity |
| ships products | delivery methods with costs and times, InPost lockers for PL, tracking info, packaging/returns info | top cause of abandoned carts is surprise costs |
| sells clothes/shoes | size charts per product, fit info, model measurements | returns and conversion |
| sells food | allergens, composition, storage, expiry, delivery temperature conditions | EU food information rules |
| sells alcohol, tobacco, supplements, medicines, medical devices | sector-specific rules (age verification, advertising limits, notifications) — flag, don't guess | high regulatory risk |
| targets children or collects minors' data | parental consent flows, child-appropriate privacy | RODO special care |
| is a local business | consistent name/address/phone (NAP) across site and Google Business Profile, LocalBusiness schema, map, area served | local SEO |
| has multiple languages | hreflang, translated (not machine-garbled) content, language switcher, localised currency/units | SEO and trust |
| has a blog/content | author, publication and update dates, internal links to offer, Article schema | E-E-A-T, SEO |
| has user accounts | password reset, account deletion and data export, e-mail verification, session security | RODO rights, trust |
| has user-generated content (comments, reviews, uploads) | moderation, reporting, spam protection, terms of use | legal liability, quality |
| uses AI chatbot/assistant | disclosure that it's AI, limits, escalation to human, privacy info about conversation data | EU AI Act transparency, trust |
| sends newsletters/SMS | double opt-in, unsubscribe in every message, sender identity | ePrivacy/telecom rules |
| publishes job offers | application data clause, retention period for CVs | RODO |
| shows prices of flats (developer) | price lists per unit as required by current Polish rules | price transparency rules |
| runs promotions/contests | contest rules (regulamin konkursu), prize tax info where applicable | legal clarity |
| has a physical location customers visit | opening hours incl. holidays, directions, parking, accessibility of the place | conversion, inclusivity |
| is a subscription | clear billing cycle, cancel online as easily as signing up, reminder before renewal | consumer rules, churn trust |

Audit tip: list the triggered rules first, then mark each **Jest / Częściowo / Brak**.
Missing triggered rules go to the top of the "Brakuje" section of the report.
