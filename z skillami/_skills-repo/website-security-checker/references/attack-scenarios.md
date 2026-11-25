# Attack scenarios: threat model and scenario library

Build a short threat model for *this* site, then turn it into concrete scenarios to
test. A scenario = attacker + goal + path through features that actually exist.

## 1. Threat model in 10 minutes

1. **Assets**: money (orders, payments, credits, coupons), customer data, admin access,
   content/reputation, availability, e-mail domain reputation, API/AI budget.
2. **Entry points**: from the inventory and connection catalogue.
3. **Attackers** (pick those that fit):
   | Persona | Typical goal |
   |---|---|
   | Bot / scraper | prices, content, e-mails, stock levels |
   | Spammer | forms, comments, reviews, newsletter as spam channel |
   | Bargain hunter | cheaper price, free shipping, coupon abuse, endless trials |
   | Fraudster | stolen cards, refunds without return, account takeover |
   | Curious customer | other customers' orders/invoices, admin panel |
   | Malicious customer | stored XSS against staff, uploads, chargeback abuse |
   | Competitor | scraping, fake reviews, DoS-like abuse of expensive features |
   | Compromised editor / staff | escalate to admin, exfiltrate data |
   | Compromised third-party script | skim checkout/login data |
   | Insider with repo access | secrets in git history, backdoors |
4. **Top 5–15 scenarios** ranked by likelihood × impact for this business.
5. Test each, record result.

## 2. Scenario library (pick what matches the site)

### Money
- Buy at a lower price by editing price/total/variant/currency in the request.
- Get a product "paid" without paying: open success URL, forge or replay webhook,
  cancel payment after order confirmation, race payment and cart change.
- Stack or reuse coupons; brute-force short codes; apply coupon to excluded items.
- Negative quantity or refund of more than paid.
- Endless free trials (aliases, new accounts, trial without card, trial reset by
  re-subscribing), access kept after cancel/failed payment.
- Upgrade to a higher plan without paying the difference; downgrade keeping features.
- Referral/loyalty self-dealing (refer yourself, points before payment, points kept
  after refund).
- Gift card double spend through parallel requests.

### Data
- Read other customers' orders, invoices, addresses, uploads via IDOR.
- Dump data through pagination/limit/search/export endpoints.
- Find secrets in bundles, source maps, git, `.env`, backups.
- Read BaaS tables with the public key (RLS/rules).
- Enumerate users (login/register/reset differences, `/wp-json/wp/v2/users`).
- Personal data leaking to analytics/chat/AI providers or caches.

### Accounts and access
- Account takeover: weak reset tokens, host header in reset link, no rate limit on
  login/OTP, session not invalidated after password change, OAuth `state` missing.
- Privilege escalation: mass assignment of role, admin endpoints without server check,
  editor → admin through settings or plugin upload.
- Session theft via XSS when tokens live in `localStorage`.

### Content and reputation
- Stored XSS in reviews/comments/profile shown to visitors or admins.
- Defacement through unprotected CMS/API editing endpoints.
- Fake reviews flood; rating outside allowed range.
- Phishing "from" the shop domain (no SPF/DKIM/DMARC); open redirect used in phishing.
- Subdomain takeover of an old CNAME.

### Abuse of resources
- Forms and newsletter as mail bomb / spam relay.
- Expensive endpoints (search, PDF, image resize, AI chat) called in loops → cost or
  slowdown (test only with a few requests, report the missing limit).
- AI assistant prompt injection: reveal system prompt, act on other users' data,
  call tools outside permissions, produce XSS in rendered output.
- SSRF through URL-fetching features to internal services or cloud metadata.

### Supply chain
- Vulnerable dependency or plugin with public exploit.
- Third-party script on checkout capable of skimming.
- Leaked deploy/hosting/registrar credentials, no 2FA on critical accounts (ask the owner).

## 3. Recording

```
| # | Scenariusz | Atakujący | Ścieżka (funkcje) | Wynik | Dowód | Problem # |
|---|---|---|---|---|---|---|
| S1 | Zakup za 1 zł przez zmianę ceny w żądaniu | łowca okazji | koszyk → checkout | Zablokowane (serwer liczy cenę) | żądanie/odpowiedź | — |
```
