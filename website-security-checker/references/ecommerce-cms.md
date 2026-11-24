# Shops, payments and CMS

The core principle for every shop: **the browser can only express intent** ("I want
2 × product 17 with code LATO10"). Everything with money or permissions — price, total,
discount, shipping cost, stock, order status, role — must be calculated or decided on
the server from the database. Content shown on the site (products, prices, pages) must
come from a backend/CMS that only authorized people can change, never from data the
client can manipulate.

## Contents
1. Cart and checkout tampering
2. Discounts, gift cards, loyalty
3. Payments and webhooks
4. Orders, invoices, digital products
5. Customer accounts
6. Content from backend vs frontend (CMS integrity)
7. WordPress / WooCommerce
8. PrestaShop, Shopify, other platforms
9. Headless CMS and BaaS (Supabase, Firebase, Strapi, Sanity…)
10. Polish payment gateways and market specifics

## 1. Cart and checkout tampering

Intercept the add-to-cart and checkout requests (DevTools → copy as fetch / cURL, or a
proxy like Burp/ZAP in a test environment) and modify:

| Change | Expected (safe) | Finding if |
|---|---|---|
| `price` / `unitPrice` / `total` field | ignored, server recalculates | order created at the sent price |
| `quantity: -1`, `0`, `0.5`, `999999` | rejected / clamped to stock | negative totals, refunds, stock overflow |
| `productId` of hidden/draft/out-of-stock product | rejected | can buy unpublished product |
| variant id of a cheaper variant with expensive variant's name | server uses variant from DB | mismatch accepted |
| `shippingCost: 0`, other `shippingMethod` id | recalculated from rules | free shipping by editing |
| `currency` changed (PLN → EUR with same number) | server-defined | paid 100 EUR-cents as 100 PLN |
| `taxRate`, `vat` | server-defined | changed tax |
| two parallel checkouts of the last item | one fails | overselling (race condition) |

Also check: is the cart stored in `localStorage` with prices that are later trusted?
Does the order summary page recalculate from the server?

## 2. Discounts, gift cards, loyalty

- Apply the same code twice, stack codes that should not stack, apply after payment
  started, use an expired or other user's single-use code.
- Race: send the "apply code" or "redeem gift card" request 10× in parallel.
- Brute force of short codes (`LATO10`, 6-digit gift cards) — rate limit?
- Percentage over 100, negative amounts, code applied to excluded products.
- Referral/loyalty points: self-referral, points granted before payment is confirmed,
  points kept after refund.

## 3. Payments and webhooks

The most important rule: **an order becomes "paid" only after a verified notification
from the payment provider**, never because the customer's browser landed on
`/success` or sent `status=paid`.

Check:
- Return URL (`/payment/success?order=123`) does not change order status by itself.
- Webhook/notification endpoint verifies the provider's signature (Stripe
  `Stripe-Signature` + `constructEvent`; Przelewy24 `sign` with CRC + `verify` call;
  PayU `OpenPayu-Signature`; Tpay `md5sum`/JWS signature; PayPal webhook verification).
- After signature: amount, currency and order id match the order in the DB; order is
  in a state that can be paid; event handled idempotently (the same event twice does
  not double-ship or double-credit).
- Webhook endpoint not callable to mark arbitrary orders paid (try replaying an old
  valid payload with a changed order id in test mode → must fail signature).
- Card data never touches the site's server: hosted payment page or provider's
  iframe/elements (keeps PCI DSS scope minimal, SAQ A).
- Test vs live keys: live secret never in repo or frontend; test mode disabled on
  production.
- Refunds and cancellations: only admins, logged, cannot exceed paid amount.

## 4. Orders, invoices, digital products

- Order details, invoice PDFs, shipping labels, return forms by id → IDOR test with two
  accounts and as a guest. Guest order lookup should require order number + e-mail
  (or a signed link), with rate limiting.
- Order confirmation e-mails: link to order with a long random token, not a sequential id.
- Digital downloads: signed, expiring URLs; not a static public path; download count
  limits if relevant.
- Admin order list: stored XSS through customer-provided fields (name, company, address,
  order note, NIP).
- Order status transitions enforced on the server (cannot go from "unpaid" to
  "shipped" via API).

## 5. Customer accounts

- Registration with an existing e-mail does not reveal existence (or does so only with
  rate limiting).
- Guest checkout with a registered e-mail does not attach the order to that account
  without verification.
- Address book, saved payment methods (should be provider tokens only), order history —
  IDOR.
- Account deletion and data export (RODO) work and actually remove/export data.

## 6. Content from backend vs frontend (CMS integrity)

What to verify:
- Products, prices, availability, page content are loaded from the server/CMS, and the
  server uses its own data for orders (not the values rendered in the page).
- Editing endpoints (CMS API, admin API) require admin auth on the server. Try the
  editing request without a session and with a customer session.
- No "admin mode" toggled by a frontend flag, URL parameter (`?admin=1`), cookie value
  (`role=admin`) or `localStorage` key.
- Preview/draft content not reachable by guessing URLs or using a preview token found in
  the bundle.
- CMS write tokens never shipped to the browser; read tokens only for public content.
- Static site generated from CMS: build webhooks protected (secret), so outsiders cannot
  trigger endless rebuilds.
- Rich text from CMS sanitized before rendering (an editor account compromise should not
  mean XSS on every visitor — defence in depth).

## 7. WordPress / WooCommerce

- Core, theme and plugin versions (page source `?ver=`, `/wp-content/plugins/<name>/readme.txt`)
  vs WPScan vulnerability database. Abandoned or nulled (pirated) plugins are a common
  malware source.
- User enumeration: `/wp-json/wp/v2/users`, `/?author=1` → restrict REST users endpoint
  for guests.
- `/xmlrpc.php` enabled (brute force amplification via `system.multicall`) → disable if
  unused.
- `/wp-login.php` and `/wp-admin` brute-force protection, 2FA for admins, no `admin` user.
- `wp-config.php` backups (`.bak`, `.old`, `~`, `.save`), `/wp-content/debug.log`,
  `WP_DEBUG` on production, directory listing in `/wp-content/uploads/`.
- File editing in admin (`DISALLOW_FILE_EDIT`), correct file permissions.
- WooCommerce: REST API keys (`ck_…`/`cs_…`) never in the theme JS; Store API
  (`/wp-json/wc/store/…`) price handling; order received page requires the `key`
  parameter; customer data export plugins not public.
- Forms plugins (Contact Form 7, WPForms, Elementor forms): uploads folder exposure,
  spam protection.

## 8. PrestaShop, Shopify, other platforms

- **PrestaShop**: admin folder name not guessable and not linked; `/install` removed;
  modules up to date (many critical CVEs historically in third-party modules); debug mode
  off; `.git`/backups in web root.
- **Shopify**: platform handles most infrastructure; focus on apps (permissions,
  necessity, abandoned apps with access), custom Liquid sections rendering unescaped
  metafields/customer input, staff accounts with 2FA, exposed preview/draft themes,
  discount logic in custom checkout extensions.
- **Wix/Webflow/Squarespace**: custom code embeds, form handling, member areas,
  collection/CMS items exposed via public APIs, third-party widgets.
- **Custom Node/PHP shops**: everything in sections 1–6 applies in full — custom shops
  are where price tampering and IDOR are most often found.

## 9. Headless CMS and BaaS

- **Supabase**: anon key in front is normal. Check every table: RLS enabled and policies
  restrict rows to the owner/role. Test directly:
  `GET https://<project>.supabase.co/rest/v1/<table>?select=*` with only the anon key
  (`apikey` + `Authorization: Bearer <anon>` headers) — if it returns other users' data,
  critical. Storage buckets: public vs private, upload policies. RPC functions with
  `security definer` need their own checks. `service_role` key must never be in the
  frontend.
- **Firebase**: Firestore/RTDB/Storage rules — `allow read, write: if true;` or
  `if request.auth != null` (any logged-in user can read everything) are findings.
  RTDB: `https://<db>.firebaseio.com/.json` publicly readable = critical.
- **Strapi/Directus**: Public role permissions (find/create on collections that should be
  private), admin panel exposed, API tokens scope.
- **Sanity/Contentful/Storyblok**: read tokens for drafts/preview or management tokens
  in the bundle, public datasets containing private documents.
- **Airtable/Google Sheets as backend**: API key or sheet editable link in the front
  = anyone can edit the "database".

## 10. Polish payment gateways and market specifics

- **Przelewy24 (P24)**: transaction registration with `sign` (SHA-384 of JSON incl.
  CRC); after notification you must call `transaction/verify`; CRC key and API key only
  on server; check `amount` and `currency` from the notification against the order.
- **PayU**: OAuth `client_secret` on server only; verify `OpenPayu-Signature` header
  (algorithm + signature with second key/MD5); order status from notification, not from
  `continueUrl`.
- **Tpay**: verify notification signature (JWS in new API / md5sum in legacy) and that
  the request comes from Tpay; security code server-side.
- **Stripe** (incl. BLIK and P24 via Stripe): webhooks with `constructEvent` and raw body,
  `payment_intent.succeeded` as the source of truth, idempotency keys.
- **BLIK**: same rules — status only from provider notification.
- **Invoices/NIP**: invoice generation endpoints (also KSeF integrations) — IDOR,
  credentials of accounting integrations (KSeF tokens, Fakturownia/inFakt API keys)
  server-side only.
- **InPost/couriers**: API tokens server-side; label download IDOR; parcel locker
  selection value validated on server.
- **RODO**: shop collects PESEL/ID only if legally needed (normally never), customer
  data access limited in admin roles, processor agreements with integrations.
