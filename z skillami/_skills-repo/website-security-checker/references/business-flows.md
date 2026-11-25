# Business flows: wired, logical, safe

For every flow that exists, verify three layers and record each separately:
**Podłączone** (wired correctly), **Logiczne** (correct in every path), **Bezpieczne**
(cannot be tampered with or abused). Use sandboxes; never real money.
Cart/checkout tampering and gateway specifics are in `ecommerce-cms.md`; this file
covers the end-to-end lifecycle.

## Contents
1. Payment gateway
2. Free trials
3. Subscriptions and plans
4. Coupons, gift cards, referrals, loyalty
5. Refunds, cancellations, chargebacks
6. Bookings and deposits
7. Transactional e-mails and notifications
8. Invoices and accounting integrations
9. Account lifecycle
10. Flow verification table

## 1. Payment gateway

**Wired**
- Correct keys per environment (test keys on staging, live on production; never mixed),
  stored in env, not in the frontend (except publishable keys).
- Webhook endpoint registered at the provider, reachable over HTTPS, correct events
  subscribed (e.g. Stripe `checkout.session.completed`, `payment_intent.succeeded`,
  `payment_intent.payment_failed`, `charge.refunded`, `customer.subscription.*`,
  `invoice.paid`, `invoice.payment_failed`); P24 `urlStatus`; PayU `notifyUrl`.
- Return/cancel URLs point to the right domain and handle both outcomes.
- Signing secrets match the environment; webhook logs at the provider show 2xx.
- Currency, amounts in minor units (grosze), tax settings consistent.

**Logical**
- Order states: created → pending → paid → fulfilled / cancelled / refunded; every
  transition triggered by the right event only.
- Payment failure, timeout, user closes the tab, bank returns late (P24/PayU transfers
  can confirm minutes later), duplicate webhook, out-of-order webhooks.
- Stock reserved/released correctly on failure and expiry.
- BLIK code expiry and retry path; payment method switch after failure.

**Safe**
- Paid status only from verified webhook/notification (+ provider verify call where
  required, e.g. P24 `transaction/verify`).
- Amount, currency and order id from the webhook compared with DB.
- Webhook handler idempotent (event id stored), signature verified on raw body.
- Success page reveals nothing and changes nothing by itself.

## 2. Free trials

**Wired**: trial length and plan configured in one place (provider or app, not both
drifting); trial end triggers the right job/webhook; reminder e-mail before trial ends
(also a consumer-law good practice).

**Logical**
- What happens at trial end: with card → first charge; without card → downgrade/lock;
  failed first charge → grace period → lock.
- Trial + cancel during trial → no charge, access until trial end (or as stated).
- Trial start on sign-up vs on first use; time zone of end date.
- Re-subscribing after cancel does not grant a new trial (unless intended).

**Safe (trial farming)**
- One trial per person/payment method/organisation: normalise e-mails (lowercase,
  remove `+tag`, dots for Gmail), card fingerprint (Stripe `card.fingerprint`), device/IP
  signals as soft limits, phone verification if abuse matters.
- Trial status computed server-side from stored dates — not from client flags
  (`localStorage.trialEnds`) or JWT claims the client can refresh.
- Trial features limited server-side (quotas enforced in API, not just hidden in UI).

Testing: Stripe **test clocks** to simulate trial end and renewals; create subscriptions
with trial in test mode and advance time; check webhooks and access state at each step.

## 3. Subscriptions and plans

- **Upgrade**: proration charged, features unlocked only after payment succeeds.
- **Downgrade**: effective at period end or immediately (as stated), features and limits
  reduced, data over limit handled.
- **Cancel**: access until period end, then revoked by webhook/job; cancel is as easy as
  sign-up (consumer rules).
- **Failed renewal (dunning)**: retries, e-mails, grace period, then lock; access
  restored on late success.
- **Plan limits** (seats, projects, API calls, storage) enforced in the backend on every
  relevant action; usage counters not client-writable; race conditions on limits.
- **Plan id/price id** never accepted from the client as a price; the server maps an
  allowed plan key to the provider price id.
- Webhook ordering: `subscription.updated` before `invoice.paid` etc. must not leave
  wrong state; reconcile periodically with provider data.

## 4. Coupons, gift cards, referrals, loyalty

- Rules in one server-side place: validity dates, usage limits (total and per user),
  minimum order, excluded products, stacking rules, first-order-only.
- Usage counted atomically (transaction/unique constraint) — test parallel redemption
  on staging.
- Codes long enough or rate-limited against guessing.
- Gift cards: balance changes in transactions, cannot go negative, partial use correct,
  refund returns to card not cash.
- Referrals: reward after the referred order is paid and past withdrawal period; no
  self-referral; limits.
- Loyalty points: granted after payment, reversed on refund/return, expiry handled.

## 5. Refunds, cancellations, chargebacks

- Only authorised staff can refund; amounts ≤ paid; partial refunds tracked; refund
  through provider API, then status from webhook.
- Order/entitlement revoked or adjusted after refund (digital goods, subscriptions,
  points, coupons used).
- 14-day withdrawal flow for consumers works (form, e-mail, status).
- Chargeback/dispute webhooks handled (lock access, notify owner).

## 6. Bookings and deposits

- Availability checked and slot reserved atomically (no double booking).
- Deposit paid → booking confirmed; deposit failed → slot released after timeout.
- Cancellation policy enforced as stated (refund windows), time zones correct.
- Reminders sent; staff calendar sync updated on changes.

## 7. Transactional e-mails and notifications

- Sent for: account confirmation, password reset, order confirmation, payment received,
  shipped, cancelled, refund, trial ending, renewal failed, booking reminders.
- Actually delivered (SPF/DKIM/DMARC aligned, not in spam), correct language and
  Polish characters, correct amounts and links (HTTPS, right domain, tokens long and
  expiring).
- No sensitive data in plain text; unsubscribe only for marketing, not required for
  transactional.
- Failures logged and retried; owner notified of new orders/leads reliably.

## 8. Invoices and accounting integrations

- Invoice numbering sequential and unique; correct VAT rates and totals equal to the
  charged amount; NIP validation for B2B; corrections for refunds.
- KSeF or accounting API (Fakturownia, inFakt, wFirma…) credentials server-side; errors
  surfaced; retries without duplicates.
- Invoice PDFs accessible only to the owner (IDOR test).

## 9. Account lifecycle

- Sign-up → verification → login → password change → e-mail change (confirm both
  addresses) → deletion/export (RODO) — each step works and is protected.
- Deleting an account handles active subscriptions, orders, invoices (legal retention)
  and personal data consistently.

## 10. Flow verification table (goes into the report)

```
| Przepływ | Podłączone | Logiczne | Bezpieczne | Jak sprawdzono | Problemy |
|---|---|---|---|---|---|
| Płatność BLIK (P24) | ✅ | ⚠️ brak obsługi późnego potwierdzenia | ✅ | sandbox P24, 4 scenariusze | B5 |
| Darmowy trial 14 dni | ✅ | ✅ | ❌ trial przez aliasy e-mail | test clock Stripe, 3 konta | S2 |
```
