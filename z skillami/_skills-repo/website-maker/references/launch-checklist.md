# Launch checklist

Go through it with the owner before and right after going live. Mark each item
Zrobione / Nie dotyczy / Do zrobienia.

## Domain, hosting, security
- [ ] Domain points to hosting (A/AAAA/CNAME), `www` and apex both work, one canonical
      (301 from the other).
- [ ] HTTPS with auto-renewing certificate; HTTP → HTTPS redirect; HSTS.
- [ ] Security headers set (CSP, frame-ancestors, nosniff, Referrer-Policy).
- [ ] Secrets in environment variables on the server; `.env` not in the web root or repo.
- [ ] 2FA on registrar, DNS, hosting, Git, CMS admin, payment panel, e-mail.
- [ ] SPF, DKIM and DMARC for the domain's e-mail (transactional mail lands in inbox).
- [ ] Backups automatic, off-site, restore tested once.
- [ ] Options 2–4: security pass done (website-security-checker), payments switched from
      test to live keys deliberately, webhooks registered for production.

## Content and legal
- [ ] All placeholders replaced (list in SITE-PLAN.md) — or consciously hidden.
- [ ] Company data in footer/contact (name, address, NIP).
- [ ] Privacy policy, cookie consent working (tags only after consent).
- [ ] Shops: regulamin, returns/withdrawal form, complaints, delivery and payment info,
      Omnibus lowest-price display, GPSR product data.
- [ ] Accessibility statement where required (shops under the EAA).
- [ ] 404 page, favicon set, Open Graph image.

## SEO and measurement
- [ ] Old site's URLs redirected 301 to new equivalents (no lost rankings).
- [ ] `sitemap.xml` and `robots.txt` correct; no `noindex` left from staging.
- [ ] Google Search Console verified, sitemap submitted.
- [ ] Bing Webmaster Tools (optional, imports from GSC).
- [ ] Analytics with consent mode; conversion events firing (form, call click, purchase,
      booking).
- [ ] Google Business Profile (local businesses): same name/address/phone as on the
      site, link to site, categories, photos, review link ready.
- [ ] Structured data validated (Rich Results Test).

## Quality
- [ ] Every page checked on a real phone and on desktop.
- [ ] Forms send to the right inbox; autoresponders correct; spam protection on.
- [ ] Payment test in production with a small real transaction, then refund (shops).
- [ ] Lighthouse mobile: performance ≥ 90, accessibility ≥ 95, SEO ≥ 95 (or reasons).
- [ ] Uptime monitoring and error alerts (options 3–4: error tracking, e.g. Sentry).

## After launch
- [ ] Week 1: watch forms, orders, errors, Search Console coverage.
- [ ] Month 1: growth audit with website-strategist on real data; ask first customers
      for reviews.
