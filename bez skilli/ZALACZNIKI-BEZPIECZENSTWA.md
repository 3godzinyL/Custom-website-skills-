# Załączniki do raportu bezpieczeństwa — Kedgely (2026-11-25)

Legenda wyniku: **OK** · **PROBLEM #id** · **DO POTWIERDZENIA** · **NIE TESTOWANO (powód)**
Role w testach: G = gość, U = zalogowany użytkownik z dostępem, P = użytkownik bez dostępu, X = wygasły lub odebrany dostęp, B = inny użytkownik (IDOR), AA = admin w sesji aplikacji, AD = admin w sesji panelu.
Kolumny matrycy: AuthN (bez sesji) · AuthZ (rola) · IDOR · CSRF (bez tokenu / obcy Origin) · Walidacja (złe typy, za długie, złe id) · Błędy · Limit.

## A. Pełny katalog połączeń z wynikami

### A.1 Publiczne API

| # | Metoda | Ścieżka | Auth | Dane | Zmienia stan | Ryzyko | Testy | Wynik |
|---|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/health` | brak | tryb AI | nie | niskie | odpowiedź minimalna (2 pola) | OK |
| 2 | GET | `/api/plans` | brak | limity i ceny planów | nie | niskie | zgodność z cennikiem, cache 5 min | OK |
| 3 | GET | `/api/waitlist/token` | brak | token formularza | nie | niskie | `no-store`, HMAC | OK |
| 4 | POST | `/api/waitlist` | brak + Origin | e-mail, zgody | tak | średnie | za szybko → 400; podrobiony token → 400; honeypot → 202 bez zapisu; duplikat → identyczne 202; brak zgody → 422; 6. żądanie/h → 429; formuła w CSV zneutralizowana | OK |
| 5 | POST | `/api/waitlist/confirm` | token | — | tak | niskie | potwierdzenie, ponowne użycie → `ok:false` | OK |
| 6 | POST | `/api/demo/parse` | brak | tekst wejściowy | nie | niskie | XSS w wyniku wyświetlony jako tekst; 21. żądanie/min → 429; maks. 400 znaków | OK |

### A.2 Uwierzytelnianie (`/api/auth`)

| # | Metoda | Ścieżka | Testy | Wynik |
|---|---|---|---|---|
| 7 | POST | `/signup` | dodatkowe pola (`role`, `status`, `isAdmin`) ignorowane; zły kod → rollback konta; zamknięta rejestracja bez kodu → 403; 10/h na IP; obcy Origin → 403 | **PROBLEM S7** (409 ujawnia istnienie konta), **S12** (aliasy) |
| 8 | POST | `/login` | nowa sesja (bez fixation); obcy Origin → 403; zablokowany użytkownik → 403; limit IP 30/15 min; limit e-mail 10/15 min | **PROBLEM S3** (blokada konta, enumeracja) |
| 9 | POST | `/logout` | CSRF gdy jest sesja; sesja usunięta (401 przy ponownym użyciu) | OK |
| 10 | GET | `/session` | G → 401; brak hashy i liczników w odpowiedzi | OK |
| 11 | POST | `/forgot` | ta sama odpowiedź dla znanego i nieznanego e-maila; link zawsze z `BASE_URL` (nagłówek `Host` ignorowany); 7. żądanie/h → 429 | OK (treść maila: **S4**) |
| 12 | POST | `/reset` | token 256 bit, jednorazowy (drugie użycie → 400); wszystkie sesje zakończone; stare hasło nie działa | OK |

### A.3 Konto i dostęp (`/api/account`, `/api/access`) — wymagają sesji i CSRF

| # | Metoda | Ścieżka | AuthN | CSRF | IDOR / masowe przypisanie | Wynik |
|---|---|---|---|---|---|---|
| 13 | GET | `/api/account` | G → 401 | — | tylko własny profil | OK |
| 14 | PATCH | `/api/account` | G → 401 | wymagany | `role`, `status`, `plan` → 422 (schemat `strict`) | OK |
| 15 | POST | `/api/account/password` | G → 401 | wymagany | inne sesje zakończone, bieżąca zostaje; złe obecne hasło → 400 | OK |
| 16 | GET | `/api/account/sessions` | G → 401 | — | tylko własne | OK |
| 17 | DELETE | `/api/account/sessions/:id` | G → 401 | wymagany | B usuwa sesję A → 404 | OK |
| 18 | POST | `/api/account/sessions/revoke-others` | G → 401 | wymagany | — | OK |
| 19 | GET | `/api/account/export` | G → 401 | — | własne dane, bez hasha hasła, `no-store`, `attachment` | OK |
| 20 | POST | `/api/account/delete` | G → 401 | wymagany | wymaga hasła i „DELETE”; ostatni admin → 409 | **PROBLEM S1, S11** (skutki uboczne usunięcia) |
| 21 | GET | `/api/access` | G → 401 | — | stan: active / pending / scheduled / expired / revoked poprawny | OK |
| 22 | POST | `/api/access/redeem` | G → 401 | wymagany | jednorazowy kod, limit użyć (wyścig 6 → 2 sukcesy), daty, aktywność, przypisanie do e-maila, ponowne użycie przez tę samą osobę → 409; limit 10/h (kod) | OK (poza **S1**) |

### A.4 Aplikacja (`/api/app/*`) — sesja + CSRF + aktywny dostęp przy każdym żądaniu

Wspólny wynik dla każdego wiersza: **G → 401, P (bez dostępu) → 403 `access_required`, X (wygasły / odebrany) → 403, AA → działa tylko na własnych danych, cache `no-store`, CORS bez ACAO.**

| # | Metoda | Ścieżka | IDOR (B na obiektach A) | Walidacja i logika | Wynik |
|---|---|---|---|---|---|
| 23 | GET | `/tasks` | wyszukiwanie B nie widzi zadań A | limit 1000 wierszy | **PROBLEM B3** |
| 24 | GET | `/tasks/history` | tylko własne zdarzenia | — | OK |
| 25 | GET | `/tasks/:id` | 404 | `abc`, `-1` → 422; ogromne id → 422/404; zepsute `%` → **500** | **PROBLEM B2** |
| 26 | POST | `/tasks` | `projectId` cudzego projektu → 400 | złe typy, tytuł > 200 → 422; `__proto__` bez skutku; limit otwartych zadań → 402; brak CSRF → 403; obcy Origin → 403; `text/plain` nie przetworzony | OK |
| 27 | PATCH | `/tasks/:id` | 404; `userId` w treści ignorowane | — | OK |
| 28 | POST | `/tasks/:id/complete` | 404 | — | OK |
| 29 | POST | `/tasks/:id/reopen` | 404 | sprawdza limit planu | OK |
| 30 | DELETE | `/tasks/:id` | 404 | — | OK |
| 31 | GET | `/projects` | tylko własne | — | OK |
| 32 | GET | `/projects/:id` | 404 | — | OK |
| 33 | POST | `/projects` | — | 4. aktywny projekt w Free → 402 | OK |
| 34 | PATCH | `/projects/:id` | 404 | przywrócenie z archiwum ponad limit → 402 | OK |
| 35 | DELETE | `/projects/:id` | 404 | `deleteTasks` tylko `true`/`false` | OK |
| 36 | GET | `/schedule` | B nie widzi bloków A | — | OK |
| 37 | POST | `/schedule/plan` | — | dzień w przeszłości → 400; > 60 dni → 400 | OK |
| 38 | POST | `/schedule/replan` | — | tylko własne dane | OK |
| 39 | POST | `/schedule/blocks` | zadanie A dla B → 400 | koniec przed początkiem → 400; nakładanie na zablokowany blok → 409 | OK |
| 40 | PATCH | `/schedule/blocks/:id` | 404 | — | OK |
| 41 | DELETE | `/schedule/blocks/:id` | 404 | — | OK |
| 42 | GET | `/dashboard` | tylko własne | — | OK |
| 43 | GET | `/analytics` | tylko własne | `days=100000` → 422; zakres obcięty do limitu planu (Free: 14) | OK |
| 44 | GET | `/ai/messages` | tylko własne | — | OK |
| 45 | DELETE | `/ai/messages` | tylko własne | — | OK |
| 46 | POST | `/ai/command` | kontekst tylko z danych użytkownika | tryb oznaczony `demo`; limit dzienny planu → 402; funkcja Pro w Free odmówiona; prompt injection w tytule bez akcji; 12/min | OK (tryb live: **S8 DO POTWIERDZENIA**) |
| 47 | POST | `/ai/proposals/:id/apply` | B → 404 | indeksy poza zakresem pominięte; drugie wykonanie → 403; obiekt akcji od klienta → 422 | OK |
| 48 | POST | `/ai/proposals/:id/discard` | B → 404 | — | OK |

### A.5 Panel admina (`/api/admin/*`) — osobna sesja `kg_admin` + CSRF

Wspólny wynik dla każdego wiersza (poza logowaniem): **G → 401, U → 401, AA (admin w sesji aplikacji) → 401, token panelu w ciasteczku aplikacji i odwrotnie → 401.**

| # | Metoda | Ścieżka | Testy | Wynik |
|---|---|---|---|---|
| 49 | POST | `/auth/login` | konto bez roli admin → 401 (zapis `admin.login_denied`); nieudane próby zapisane; 10/15 min na IP; blokada konta | **PROBLEM S3, S6** |
| 50 | GET | `/auth/session` | — | OK |
| 51 | POST | `/auth/logout` | wpis w audycie | OK |
| 52 | GET | `/overview` | liczniki zgodne z danymi | OK |
| 53 | GET | `/users` | filtry `state`, `role`, `plan`, `q` (bez wstrzyknięć `LIKE`) | OK |
| 54 | GET | `/users/:id` | brak hasha hasła w odpowiedzi | OK |
| 55 | PATCH | `/users/:id` | własna rola → 400; ostatni admin → 409; zmiana roli kończy sesje; `strict` | **PROBLEM S13** (zmiana e-maila) |
| 56 | POST | `/users/:id/block` | siebie → 400; sesje zakończone natychmiast; logowanie → 403 | OK |
| 57 | POST | `/users/:id/unblock` | czyści blokadę logowania | OK |
| 58 | POST | `/users/:id/sessions/revoke` | — | OK |
| 59 | DELETE | `/users/:id` | siebie → 400; ostatni admin → 409 | **PROBLEM S1, S11** |
| 60 | POST | `/users/:id/access` | presety 1d–90d, własny zakres, przyszły start, „bez końca”; koniec w przeszłości → 400; nazwa admina w historii | OK (**B5**) |
| 61 | POST | `/users/:id/access/extend` | zdarzenie `extended` w historii | OK |
| 62 | POST | `/users/:id/access/revoke` | natychmiastowy skutek po stronie serwera | OK |
| 63 | GET | `/users/:id/access/current` | — | OK |
| 64 | GET | `/access` | filtry stanów | OK |
| 65 | GET | `/invites` | **bez filtra → 500**; z filtrem → 200; nigdy nie zwraca jawnego kodu ani hasha | **PROBLEM B1** |
| 66 | POST | `/invites` | jawny kod tylko w odpowiedzi; 1–50 sztuk | OK |
| 67 | PATCH | `/invites/:id` | dezaktywacja działa od razu | OK |
| 68 | DELETE | `/invites/:id` | użyty kod → 409; nieużyty → 200 | OK |
| 69 | GET | `/invites/:id/redemptions` | lista osób, które użyły kodu | OK |
| 70 | GET | `/waitlist` | filtry | OK |
| 71 | GET | `/waitlist/export.csv` | formuły zneutralizowane, wpis w audycie, `no-store` | OK |
| 72 | DELETE | `/waitlist/:id` | wpis w audycie | OK |
| 73 | POST | `/waitlist/purge` | retencja | OK |
| 74 | POST | `/waitlist/:id/invite` | osobisty kod jednorazowy przypisany do e-maila, ważny 30 dni | OK (**S1, S11**) |
| 75 | GET | `/plans` | — | OK |
| 76 | PATCH | `/plans/:id` | ujemne limity → 422; nieznany plan → 422; diff w audycie | OK |
| 77 | GET | `/settings` | — | OK |
| 78 | PUT | `/settings` | zły typ → 422; zamknięta rejestracja działa po stronie serwera | OK |
| 79 | GET | `/audit` | 14 typów zdarzeń obecnych | OK |
| 80 | GET | `/outbox` | w dev zawiera treść maili z linkami resetu | **PROBLEM S4** |

### A.6 Strony i pliki

| # | Ścieżka | Testy | Wynik |
|---|---|---|---|
| 81 | `/`, `/privacy`, `/terms`, `/forgot-password`, `/reset-password`, `/waitlist/confirm`, `/robots.txt`, `/sitemap.xml` | nagłówki, 0 błędów konsoli, 0 skryptów obcych | OK (**S2** formularze, **M3** OG) |
| 82 | `/login`, `/signup` | zalogowany → 302 `/app`; `?next=` bez otwartego przekierowania | OK (**B4**) |
| 83 | `/app`, `/app/*` | G → 302 `/login?next=…`; zalogowany → 200, ale `main.js` → 404 | **PROBLEM M1** |
| 84 | `/admin/login`, `/admin`, `/admin/*` | G i U → 302 `/admin/login`; admin → **500** | **PROBLEM M2** |
| 85 | `/assets/*`, `/assets/fonts/*` | `../` i `%2e%2e` → brak dostępu; `.env`, `.git`, `package.json`, baza, kod serwera → brak dostępu; zepsute `%` → 400/404 | OK |

---

## B. Wynik passive-scan (`passive-scan.mjs`, 34 żądania, lokalnie)

- **HIGH [HTTPS]** HTTP odpowiada 200 bez przekierowania na HTTPS → lokalny dev; dla produkcji opisane jako **C2**.
- **HIGH [Headers]** brak HSTS → wysyłany tylko przy `COOKIE_SECURE=true`; **C2**.
- **INFO** `robots.txt` pokazuje `/admin` i `/api` → oba wymagają uwierzytelnienia (A.5, A.6) — OK.
- **INFO** brak `/.well-known/security.txt` → **C3**.
- Endpointy z HTML/JS: `/api/demo/parse`, `/api/plans`, `/api/waitlist/token`, `/api/waitlist`.
- Formularze: 2, oba bez `method` (domyślnie GET) → **S2**.
- Skrypty: 2, oba własne (`boot.js`, `landing.js`). Ciasteczka na stronie startowej: 0.

Pełny JSON: `audyt/scan.json`.

## C. Mapa tras (`map-routes.mjs`)

- 61 plików, 95 tras backendu, 3 wywołania frontu wykryte automatycznie.
- Ograniczenie skryptu: nie łączy prefiksów `app.use('/api/app', router)` z trasami routerów i nie widzi wywołań przez wrapper `api.post(...)`. Dlatego wszystkie trasy pokazał jako „bez wywołań z frontu”, a 3 wywołania landingu jako „bez trasy”. Po ręcznym zestawieniu (A.1–A.6) wszystkie wywołania istniejącego frontu mają trasy.
- Trasy bez UI to cała aplikacja (A.4) i cały panel admina (A.5) → **M1, M2**. Nie ma ukrytych tras debug ani starszych wersji API.

Pełny JSON: `audyt/routes.json`.

## D. Wyniki testów dynamicznych (`audyt/dyn.mjs`, 365 żądań)

| Obszar | OK | Niezgodne |
|---|---|---|
| setup | 12 | 0 |
| authn (aplikacja, gość) | 37 | 0 |
| authn-admin (gość) | 31 | 0 |
| authz-admin (użytkownik, admin w sesji aplikacji) | 45 | 0 |
| access (dostępy czasowe) | 38 | 0 |
| session | 11 | 0 |
| csrf / cors / cache | 8 | 0 |
| idor | 18 | 0 |
| massassign / validation / logic | 18 | 0 |
| errors | 5 | 1 (B2) |
| files | 10 | 0 |
| plans | 8 | 0 |
| invite | 15 | 2 (B1, S1) |
| waitlist | 9 | 0 |
| reset | 7 | 0 |
| admin / audit | 20 | 0 |
| gdpr | 4 | 1 (S11) |
| pages | 5 | 2 (M1, M2) |
| headers | 10 | 0 |
| exposure | 3 | 1 (S4) |
| ai | 5 | 0 |
| **Razem** | **319** | **7** |

Limity (`audyt/rl.mjs`, 62 żądania, instancja z włączonymi limitami):

| Test | Kody odpowiedzi |
|---|---|
| logowanie, istniejące konto, 6 błędów | 401,401,401,401,401,**429** → potem poprawne hasło: **429** |
| logowanie, nieistniejące konto, 6 błędów | 401 ×6 |
| limit IP logowania (30/15 min) | …401, 401, 429, 429 |
| logowanie admina ×11 | 401 ×5, 429 ×6 |
| waitlista ×6 | 202 ×5, 429 |
| reset hasła ×7 | 200 ×6, 429 |
| rejestracja ×10 (+1 wcześniej) | 201 ×9, 429 |
| demo parsera ×21 | …200, 200, 429 |

Przeglądarka (`audyt/front.mjs`): wyniki w raporcie §6, JSON: `audyt/front-out.json`.

## E. Wersje komponentów i audyt zależności

| Pakiet | Wersja | Rola | `npm audit` |
|---|---|---|---|
| Node.js | 22.13.1 | runtime (`node:sqlite`, `node:crypto`) | — |
| express | 5.3.0 | HTTP | 0 |
| zod | 3.25.76 | walidacja | 0 |
| nodemailer | 6.10.1 | e-mail | **2 high (ponad 20 advisory)** → **S5** |
| @fontsource-variable/inter | 5.x | font lokalny | 0 |
| dev: eslint 9, typescript 5.9, esbuild 0.28, @playwright/test 1.65 | — | narzędzia | 0 |

Sekrety: brak w kodzie i `.env.example`. `.env` i `data/` w `.gitignore` (sprawdzone `git check-ignore`). Repo nie ma commitów, więc historii git nie było co przeszukać.

## F. Nagłówki i ciasteczka (lokalnie, `NODE_ENV=development`)

| Nagłówek | Wartość | Ocena |
|---|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'` (+ `upgrade-insecure-requests` w prod) | OK — bez `unsafe-inline` / `unsafe-eval` |
| X-Frame-Options | DENY | OK |
| X-Content-Type-Options | nosniff | OK |
| Referrer-Policy | strict-origin-when-cross-origin | OK |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), payment=(), usb=() | OK |
| Cross-Origin-Opener-Policy | same-origin | OK |
| Cross-Origin-Resource-Policy | same-origin | OK |
| Strict-Transport-Security | tylko przy `COOKIE_SECURE` | C2 |
| X-Powered-By | brak | OK |
| Cache-Control `/api/*` | no-store | OK |
| Cache-Control `/app`, `/admin` | no-store | OK |

| Ciasteczko | Flagi | Ocena |
|---|---|---|
| `kg_sid` (`__Host-kg_sid` przy HTTPS) | HttpOnly; SameSite=Lax; Path=/; Max-Age 30 dni; Secure przy HTTPS | OK |
| `kg_admin` (`__Host-kg_admin` przy HTTPS) | HttpOnly; SameSite=Strict; Path=/; Max-Age 12 h, bezczynność 60 min | OK |

DNS, SPF/DKIM/DMARC, TLS: **NIE TESTOWANO** — domena nie jest zarejestrowana, brak wdrożenia.
