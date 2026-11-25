# Załączniki do raportu bezpieczeństwa — Ogarnij

## A. Katalog połączeń (54 tras z kodu `src/`)

| # | Metoda | Ścieżka | Plik | Ochrona / wynik testu |
|---|---|---|---|---|
| 1 | POST | `/api/admin/login` | src/admin.js:83 | publiczne; limit IP 10 + e-mail 6 /15 min; blokada po 8 błędach; 2FA: limit IP + konto |
| 2 | POST | `/api/admin/login/2fa` | src/admin.js:110 | publiczne; limit IP 10 + e-mail 6 /15 min; blokada po 8 błędach; 2FA: limit IP + konto |
| 3 | POST | `/api/admin/logout` | src/admin.js:130 | kasuje sesję |
| 4 | GET | `/api/admin/me` | src/admin.js:132 | sesja viewer+; gość 401 |
| 5 | POST | `/api/admin/password` | src/admin.js:134 | sesja viewer+ + CSRF; gość 401 |
| 6 | POST | `/api/admin/2fa/setup` | src/admin.js:145 | sesja viewer+ + CSRF; gość 401 |
| 7 | POST | `/api/admin/2fa/enable` | src/admin.js:152 | sesja viewer+ + CSRF; gość 401 |
| 8 | POST | `/api/admin/2fa/disable` | src/admin.js:161 | sesja viewer+ + CSRF; gość 401 |
| 9 | GET | `/api/admin/dashboard` | src/admin.js:170 | sesja viewer+; gość 401 |
| 10 | GET | `/api/admin/subscribers` | src/admin.js:200 | sesja viewer+; gość 401 |
| 11 | GET | `/api/admin/subscribers.csv` | src/admin.js:215 | sesja editor+; gość 401 |
| 12 | DELETE | `/api/admin/subscribers/:id` | src/admin.js:224 | sesja owner + CSRF; gość 401 |
| 13 | GET | `/api/admin/posts` | src/admin.js:234 | sesja viewer+; gość 401 |
| 14 | GET | `/api/admin/posts/:id` | src/admin.js:235 | sesja viewer+; gość 401 |
| 15 | POST | `/api/admin/posts` | src/admin.js:240 | sesja editor+ + CSRF; gość 401 |
| 16 | PUT | `/api/admin/posts/:id` | src/admin.js:245 | sesja editor+ + CSRF; gość 401 |
| 17 | DELETE | `/api/admin/posts/:id` | src/admin.js:250 | sesja editor+ + CSRF; gość 401 |
| 18 | GET | `/api/admin/codes` | src/admin.js:258 | sesja viewer+; gość 401 |
| 19 | POST | `/api/admin/codes` | src/admin.js:259 | sesja editor+ + CSRF; gość 401 |
| 20 | PUT | `/api/admin/codes/:id` | src/admin.js:275 | sesja editor+ + CSRF; gość 401 |
| 21 | GET | `/api/admin/orders` | src/admin.js:284 | sesja viewer+; gość 401 |
| 22 | POST | `/api/admin/orders/:id/refund` | src/admin.js:287 | sesja owner + CSRF; gość 401 |
| 23 | GET | `/api/admin/emails` | src/admin.js:294 | sesja viewer+; gość 401 |
| 24 | GET | `/api/admin/audit` | src/admin.js:297 | sesja owner; gość 401 |
| 25 | GET | `/api/admin/health` | src/admin.js:298 | sesja viewer+; gość 401 |
| 26 | GET | `/api/admin/users` | src/admin.js:312 | sesja owner; gość 401 |
| 27 | POST | `/api/admin/users` | src/admin.js:313 | sesja owner + CSRF; gość 401 |
| 28 | PUT | `/api/admin/users/:id` | src/admin.js:326 | sesja owner + CSRF; gość 401 |
| 29 | POST | `/api/waitlist` | src/app.js:45 | JSON+Origin; limit IP 6/10 min + adres 3/h; honeypot; jednakowa odpowiedź |
| 30 | POST | `/api/waitlist/confirm` | src/app.js:62 | token 32 B (hash), 72 h, jednorazowy; limit 20/10 min |
| 31 | POST | `/potwierdz` | src/app.js:72 | token 32 B (hash), 72 h, jednorazowy; limit 20/10 min |
| 32 | GET | `/api/waitlist/stats` | src/app.js:82 | publiczna strona; escapowanie; CSP |
| 33 | GET | `/api/waitlist/me` | src/app.js:83 | klucz HMAC; limit 60/min; no-referrer |
| 34 | POST | `/api/survey` | src/app.js:89 | klucz + biała lista odpowiedzi |
| 35 | POST | `/api/e` | src/app.js:98 | biała lista zdarzeń klienta; boty pomijane; limit 120/min |
| 36 | POST | `/api/e/error` | src/app.js:106 | limit 10/min IP + 500/dobę globalnie |
| 37 | GET | `/api/quote` | src/app.js:115 | limit 20/min (zgadywanie kodów) |
| 38 | POST | `/api/orders` | src/app.js:124 | JSON+Origin; limit 8/10 min; cena z serwera; 503 gdy przedsprzedaż wyłączona |
| 39 | POST | `/api/sandbox/pay` | src/app.js:133 | klucz zamówienia; 404 w prod bez zgody; Origin |
| 40 | POST | `/api/webhooks/:param` | src/app.js:144 | podpis HMAC t/v1, 300 s, idempotencja, ref/kwota/waluta; sandbox: 404 w prod bez zgody |
| 41 | GET | `/healthz` | src/app.js:155 | publiczna strona; escapowanie; CSP |
| 42 | GET | `/platnosc-testowa/:id` | src/app.js:187 | klucz zamówienia; no-referrer; noindex |
| 43 | GET | `/wypisz` | src/app.js:194 | publiczna strona; escapowanie; CSP |
| 44 | POST | `/wypisz` | src/app.js:195 | formularz/one-click; Origin; limit 20/10 min |
| 45 | GET | `/poradnik` | src/app.js:202 | publiczna strona; escapowanie; CSP |
| 46 | GET | `/poradnik/:slug` | src/app.js:203 | publiczna strona; escapowanie; CSP |
| 47 | GET | `/offline` | src/app.js:210 | publiczna strona; escapowanie; CSP |
| 48 | GET | `/admin` | src/app.js:211 | publiczna strona; escapowanie; CSP |
| 49 | GET | `/en` | src/app.js:212 | publiczna strona; escapowanie; CSP |
| 50 | GET | `/.well-known/security.txt` | src/app.js:213 | publiczna strona; escapowanie; CSP |
| 51 | GET | `/robots.txt` | src/app.js:218 | publiczna strona; escapowanie; CSP |
| 52 | GET | `/sitemap.xml` | src/app.js:219 | publiczna strona; escapowanie; CSP |
| 53 | ANY | `/en` | src/app.js:41 | publiczna strona; escapowanie; CSP |
| 54 | ANY | `/api` | src/app.js:247 | publiczna strona; escapowanie; CSP |

Plus pliki statyczne z `public/` (bez dotfiles, bez wyjścia poza katalog — A10).

## B. Macierz ról (GET, wynik skryptu endpoint-matrix)

```
{"base":"http://127.0.0.1:3710","roles":["guest","owner","viewer","editor"],"results":[{"endpoint":"/","url":"http://127.0.0.1:3710/","values":{},"byRole":{"guest":{"status":200,"size":34487,"fp":"34487:1899947152","sensitive":[],"cache":"no-store"},"owner":{"status":200,"size":34477,"fp":"34477:389525244","sensitive":[],"cache":"no-store"},"viewer":{"status":200,"size":34466,"fp":"34466:1839541864","sensitive":[],"cache":"no-store"},"editor":{"status":200,"size":34466,"fp":"34466:1839541864","sensitive":[],"cache":"no-store"}}},{"endpoint":"/en","url":"http://127.0.0.1:3710/en","values":{},"byRole":{"guest":{"status":404,"size":3605,"fp":"3605:-1218344677","sensitive":[],"cache":"no-store"},"owner":{"status":404,"size":3605,"fp":"3605:-1218344677","sensitive":[],"cache":"no-store"},"viewer":{"status":404,"size":3605,"fp":"3605:-1218344677","sensitive":[],"cache":"no-store"},"editor":{"status":404,"size":3605,"fp":"3605:-1218344677","sensitive":[],"cache":"no-store"}}},{"endpoint":"/api/admin/me","url":"http://127.0.0.1:3710/api/admin/me","values":{},"byRole":{"guest":{"status":401,"size":24,"fp":"24:682511512","sensitive":[],"cache":"no-store"},"owner":{"status":200,"size":183,"fp":"183:-1219546190","sensitive":["email","role"],"cache":"no-store"},"viewer":{"status":200,"size":187,"fp":"187:-1670114426","sensitive":["email","role"],"cache":"no-store"},"editor":{"status":200,"size":187,"fp":"187:-37415952","sensitive":["email","role"],"cache":"no-store"}}},{"endpoint":"/api/admin/dashboard","url":"http://127.0.0.1:3710/api/admin/dashboard","values":{},"byRole":{"guest":{"status":401,"size":24,"fp":"24:682511512","sensitive":[],"cache":"no-store"},"owner":{"status":200,"size":738,"fp":"738:-400723236","sensitive":[],"cache":"no-store"},"viewer":{"status":200,"size":738,"fp":"738:-400723236","sensitive":[],"cache":"no-store"},"editor":{"status":200,"size":738,"fp":"738:-400723236","sensitive":[],"cache":"no-store"}}},{"endpoint":"/api/admin/subscribers","url":"http://127.0.0.1:3710/api/admin/subscribers","values":{},"byRole":{"guest":{"status":401,"size":24,"fp":"24:682511512","sensitive":[],"cache":"no-store"},"owner":{"status":200,"size":881,"fp":"881:811816012","sensitive":["email"],"cache":"no-store"},"viewer":{"status":200,"size":881,"fp":"881:811816012","sensitive":["email"],"cache":"no-store"},"editor":{"status":200,"size":881,"fp":"881:811816012","sensitive":["email"],"cache":"no-store"}}},{"endpoint":"/api/admin/subscribers.csv","url":"http://127.0.0.1:3710/api/admin/subscribers.csv","values":{},"byRole":{"guest":{"status":401,"size":24,"fp":"24:682511512","sensitive":[],"cache":"no-store"},"owner":{"status":200,"size":452,"fp":"452:658592150","sensitive":[],"cache":"no-store"},"viewer":{"status":403,"size":21,"fp":"21:-1226256661","sensitive":[],"cache":"no-store"},"editor":{"status":200,"size":452,"fp":"452:658592150","sensitive":[],"cache":"no-store"}}},{"endpoint":"/api/admin/posts","url":"http://127.0.0.1:3710/api/admin/posts","values":{},"byRole":{"guest":{"status":401,"size":24,"fp":"24:682511512","sensitive":[],"cache":"no-store"},"owner":{"status":200,"size":986,"fp":"986:1691893056","sensitive":[],"cache":"no-store"},"viewer":{"status":200,"size":986,"fp":"986:1691893056","sensitive":[],"cache":"no-store"},"editor":{"status":200,"size":986,"fp":"986:1691893056","sensitive":[],"cache":"no-store"}}},{"endpoint":"/api/admin/codes","url":"http://127.0.0.1:3710/api/admin/codes","values":{},"byRole":{"guest":{"status":401,"size":24,"fp":"24:682511512","sensitive":[],"cache":"no-store"},"owner":{"status":200,"size":11,"fp":"11:1778156707","sensitive":[],"cache":"no-store"},"viewer":{"status":200,"size":11,"fp":"11:1778156707","sensitive":[],"cache":"no-store"},"editor":{"status":200,"size":11,"fp":"11:1778156707","sensitive":[],"cache":"no-store"}}},{"endpoint":"/api/admin/orders","url":"http://127.0.0.1:3710/api/admin/orders","values":{},"byRole":{"guest":{"status":401,"size":24,"fp":"24:682511512","sensitive":[],"c
```

## C. Scenariusze ataków — wynik po poprawkach (2026-11-25)

| # | Scenariusz | Wynik | Szczegóły |
|---|---|---|---|
| A1 | production without Stripe: order "paid" with no money | OK | order 503, pay undefined |
| A2 | single-use code used by two pending orders | OK | orders 201/422, used=1 |
| A3 | forged hero_impression events skew A/B test | OK | 0 → 0 |
| A4 | consentMarketing:"false" stored as consent | OK | consent=0 |
| A5 | viewer role reads every e-mail via JSON while CSV is forbidden | OK | json 200, csv 403 |
| A6 | X-Forwarded-For: first (client-controlled) hop used for rate limits | OK | only when TRUST_PROXY=1 |
| A7 | TOTP code can be reused inside its validity window | OK | no last-used step stored |
| A8 | stored XSS via blog post (editor) | OK | create 201, page 200 |
| A8b | stored XSS via order name on order page | OK | page 200 |
| A9 | price/amount tampering, forged & replayed webhooks | OK | npm test: payments.test.js (5 cases) |
| A10 | path traversal / dotfiles | OK | 404,404,404,404,404 |
| A11 | oversized JSON rejected, type confusion handled | OK | big 413, array-token 200 {"ok":false,"reason":"invalid"} |
| A12 | cross-site form POST blocked | OK | status 403 |
| A13 | /en (no slash) reachable | OK | status 301 |
| A14 | production redirects http→https (behind proxy) | OK | status 308, HSTS yes |
| A15 | /.well-known/security.txt present | OK | status 200 |
| A16 | login does not reveal which e-mails exist | OK | 401/401 |
| A17 | Wyliczanie zapisów przez formularz | OK | test/waitlist.test.js: jednakowa odpowiedź dla nowego, aliasu i potwierdzonego adresu |

Przed poprawkami: A1–A7 = VULN, A11 = zerwane połączenie, A13 = 404, A14 = brak przekierowania, A15 = brak (log w raporcie §7).

## D. Nagłówki odpowiedzi (serwer QA, GET /)

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: DENY
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Permissions-Policy: camera=(), geolocation=(), payment=(), microphone=(self)
```
W trybie produkcyjnym dodatkowo: `Strict-Transport-Security: max-age=31536000; includeSubDomains` (potwierdzone na serwerze 3711) oraz przekierowanie 308 z HTTP za proxy.

## E. Metoda generowania
Katalog z `map-routes.mjs` (skill), macierz GET z `endpoint-matrix.mjs` (4 role, 115 zapytań, 0 flag), scenariusze z `attacks.mjs` (lokalnie, własne dane testowe, ≤ 20 zapytań na próbę limitu).
