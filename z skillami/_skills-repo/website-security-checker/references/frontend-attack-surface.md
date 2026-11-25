# Frontend attack surface: what a visitor can do in their own browser

Assume the attacker fully controls the browser: DevTools, a proxy, scripts, a modified
client. Anything enforced only in the frontend is a suggestion, not a rule. For every
item below ask: **does the server still enforce it?**

## Contents
1. DOM and form tampering
2. Client state: storage, cookies, flags
3. Direct API use and request replay
4. Flow and step skipping
5. Hidden data in the frontend
6. Client-side rendering and XSS paths
7. Third-party and supply-chain exposure in the page
8. Abuse through legitimate UI
9. Quick test script for the console

## 1. DOM and form tampering
- Remove `disabled`, `readonly`, `required`, `maxlength`, `pattern`, `min`, `max`
  attributes and submit.
- Change hidden inputs (`price`, `user_id`, `role`, `plan`, `discount`, `shipping`).
- Add `<option>` values that the select did not offer (other plan, other country,
  0 PLN shipping method).
- Change `value` of radio/checkbox that should be locked (e.g. "terms accepted",
  "verified").
- Submit forms that are hidden (CSS `display:none`) or only shown to admins.
- Upload files bypassing the `accept` attribute.

## 2. Client state: storage, cookies, flags
- `localStorage` / `sessionStorage` / IndexedDB: look for `isAdmin`, `role`, `plan`,
  `premium`, `trialEnds`, `cart` with prices, `token`, feature flags. Change them and
  reload: does UI unlock *and* does the server serve data?
- Cookies readable by JS (`document.cookie`): session tokens without `HttpOnly`,
  role/plan cookies (`role=admin`, `plan=pro`) that the server trusts.
- JWT in storage: decode payload (base64) — role/plan claims; try modified token
  (server must reject bad signature, `alg: none`, expired token).
- Feature flags fetched from a public endpoint and trusted on the server.

## 3. Direct API use and request replay
- Copy any request as fetch/cURL and call it outside the UI: without session, with
  another user's ids, with modified body, many times (staging).
- Call endpoints the UI never uses but the bundle mentions (admin, export, debug, old
  versions).
- Replay a successful request (e.g. "apply coupon", "redeem", "vote", "claim reward").
- Change `Content-Type` (JSON ↔ form) to bypass validation middleware.

## 4. Flow and step skipping
- Open step 3 of a wizard/checkout directly; open `/success`, `/thank-you`,
  `/download/:id`, `/order/confirm` without completing payment.
- Go back after payment and change the cart, then resume.
- Change plan/quantity between "summary" and "pay".
- Use browser back/forward and multiple tabs to create inconsistent states (two
  checkouts, two trials).

## 5. Hidden data in the frontend
- View source and bundles: API keys, admin routes, internal URLs, staging hosts,
  commented-out features, test credentials, e-mail addresses of staff.
- Source maps (`.map`) with original code and comments.
- Hydration payloads (`__NEXT_DATA__`, `__NUXT__`, `window.__INITIAL_STATE__`,
  Remix loaders, Astro props) with more data than displayed: other users, cost price,
  supplier, unpublished products, internal notes.
- Content hidden with CSS but present in HTML (paid content, answers, coupon codes).
- Paywalled content delivered fully and blurred with CSS.
- Error messages and console logs revealing internals.

## 6. Client-side rendering and XSS paths
- Every place where user data is rendered: names, reviews, comments, order notes,
  addresses, file names, search terms, URL params, `postMessage` data, markdown.
- Sinks: `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`,
  `dangerouslySetInnerHTML`, `v-html`, `{@html}`, jQuery `.html()`/`$()`, `eval`,
  `setTimeout(string)`, `location = userValue`, `href`/`src` with `javascript:`.
- Admin panel views of customer-provided data (stored XSS against staff).
- Emails and PDFs generated from user data (HTML injection in invoices).
- `postMessage` listeners without origin checks.
- Open redirects after login/logout (`?next=`).

## 7. Third-party and supply-chain exposure in the page
- Which scripts run on checkout/login pages (each can read everything on the page).
- Chat widgets, analytics and pixels receiving personal data in URLs or events.
- Scripts loaded from CDNs without SRI or from domains that could expire.
- Payment fields: must be the provider's iframe/hosted page, not own inputs.

## 8. Abuse through legitimate UI
- Contact/quote forms as spam cannons or e-mail relays (to arbitrary recipients).
- "Send to a friend", invitations, newsletter forms used to mail bomb third parties.
- Search used for scraping (no limits) or for heavy queries.
- Reviews/ratings manipulated (many reviews from one user, rating outside 1–5).
- Account enumeration through register/login/reset messages.
- Coupon or gift-card guessing through the UI.
- Unlimited free trials with e-mail aliases (`name+1@gmail.com`, dots in Gmail).

## 9. Quick test script for the console

Paste in the browser console on the target site (own session) to list client-side
attack surface quickly:

```js
(() => {
  const out = {};
  out.storage = Object.fromEntries(Object.keys(localStorage).map(k => [k, String(localStorage.getItem(k)).slice(0, 120)]));
  out.session = Object.fromEntries(Object.keys(sessionStorage).map(k => [k, String(sessionStorage.getItem(k)).slice(0, 120)]));
  out.cookiesReadableByJs = document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(Boolean);
  out.hiddenInputs = [...document.querySelectorAll('input[type=hidden]')].map(i => `${i.name}=${i.value}`.slice(0, 120));
  out.disabledOrReadonly = [...document.querySelectorAll('[disabled],[readonly]')].map(e => e.name || e.id || e.outerHTML.slice(0, 60));
  out.forms = [...document.forms].map(f => `${(f.method || 'get').toUpperCase()} ${f.action}`);
  out.hydration = ['__NEXT_DATA__', '__NUXT__', '__INITIAL_STATE__', '__APOLLO_STATE__'].filter(k => window[k] || document.getElementById(k));
  out.inlineHandlers = document.querySelectorAll('[onclick],[onload],[onerror]').length;
  out.thirdPartyScripts = [...document.scripts].map(s => s.src).filter(s => s && !s.startsWith(location.origin));
  out.iframes = [...document.querySelectorAll('iframe')].map(f => f.src);
  console.log(JSON.stringify(out, null, 2));
  return out;
})();
```
