# Raport z audytu bezpieczeństwa i jakości — Ogarnij (landing + lista + przedsprzedaż + panel)

Wykonał: website-security-checker · Data: 2026-11-25 · Tryb: white-box (pełny kod) + testy dynamiczne na lokalnych serwerach z izolowanymi danymi
Załączniki: `ZALACZNIKI-BEZPIECZENSTWA.md` (katalog połączeń, macierz ról, logi scenariuszy)

---

## 1. Podsumowanie dla właściciela

**Stan po audycie: brak otwartych problemów krytycznych i wysokich.** Znalazłem 19 problemów. 16 naprawiłem i przetestowałem ponownie, 1 naprawiłem częściowo (B6), 2 zostają świadomie otwarte (P1, P2). Do tego dochodzą sprawy infrastruktury spoza kodu (§12.2).

Najważniejsze, co było nie tak (wszystko już naprawione):
1. **Darmowe „płatności” w produkcji (S1, Wysokie).** Gdyby ktoś wdrożył stronę bez kluczy Stripe, testowa bramka zostałaby włączona i każdy mógłby „opłacić” pakiet bez pieniędzy. Teraz w trybie produkcyjnym bez operatora przedsprzedaż jest wyłączona, a bramka testowa nie istnieje.
2. **Jednorazowy kod rabatowy działał dwa razy (B1, Średnie).** Dwa równoległe zamówienia z tym samym kodem były oba opłacane z rabatem. Teraz otwarte zamówienie rezerwuje kod na 30 minut.
3. **Rola „podgląd” widziała wszystkie adresy e-mail (S2, Średnie),** choć eksport CSV miała zablokowany. Teraz widzi dane zamaskowane.
4. **Kod 2FA można było użyć ponownie (S3, Średnie)** w ciągu ok. 90 sekund. Teraz każdy kod działa raz, a liczba prób jest ograniczona też na konto.
5. **Za proxy limit zapytań dało się obejść (S4, Średnie)** fałszywym nagłówkiem `X-Forwarded-For`.
6. **Test A/B dało się zafałszować z przeglądarki (B2, Średnie)** i **zgoda marketingowa „false” była zapisywana jako zgoda (B3, Średnie).**

Co zostaje do zrobienia przed prawdziwym startem (szczegóły w §12):
- Czcionki z Google Fonts przenieść na własny serwer (RODO). Zgodnie z Twoją decyzją na razie ładowane są z Google.
- SPF/DKIM/DMARC dla domeny nadawcy, szyfrowane kopie bazy poza serwerem, prawdziwe klucze Stripe w trybie testowym i test webhooka na stagingu.

Co jest mocne:
- ceny i rabaty liczy wyłącznie serwer, opłacenie tylko z podpisanego webhooka, ze sprawdzeniem kwoty, waluty i identyfikatora oraz odpornością na powtórki,
- ścisłe CSP bez skryptów inline,
- zapytania SQL tylko parametryzowane, a cały tekst escapowany (także w Markdown poradnika),
- panel: scrypt, sesje HttpOnly/SameSite=Strict, CSRF, role, dziennik działań,
- zero zależności npm.

## 2. Zakres i metoda

- **Cel:** `C:\Users\huber\Desktop\skill test\z skillami` (aktywne źródła: `server.js`, `src/`, `public/`, `scripts/`, `test/`; pominięte: `_skills-repo/`, `design-demos/`, `data/`).
- **Środowiska:**
  - serwer QA `127.0.0.1:3710` (dane w katalogu tymczasowym, tryb deweloperski),
  - serwer „produkcyjny” `127.0.0.1:3711` (`NODE_ENV=production`, `TRUST_PROXY=1`, bez Stripe).
  - Oba zatrzymane po audycie. Dane właściciela w `data/` nietknięte.
- **Konta testowe:** właściciel, edytor i podgląd, utworzone na serwerze QA.
- **Bez:** testów obciążeniowych, prawdziwych płatności, skanerów agresywnych. Każda próba limitu to ≤ 20 zapytań.
- **Narzędzia:** skrypty skilla (`passive-scan.mjs`, `map-routes.mjs`, `endpoint-matrix.mjs`), własny zestaw 17 scenariuszy (`attacks.mjs`), `npm test` (46 testów), `scripts/e2e.mjs` (67 kontroli w Chrome).
- **MCP:** proponowane Playwright i Semgrep. Nie instalowano: Playwright zastąpiony lokalnym `playwright-core`, a Semgrep ręcznym przeglądem kodu (≈ 2 600 linii).

## 3. Mapa strony (inwentaryzacja)

| Obszar | Co jest |
|---|---|
| Hosting | Node 22 `node:http` (bez frameworka), docelowo za proxy TLS (`TRUST_PROXY=1`) |
| Frontend | HTML renderowany na serwerze (`src/pages/*`), `public/js/site.js` (vanilla), `public/js/admin.js`, PWA (`sw.js`, manifest) |
| Baza | SQLite (`node:sqlite`), migracje w `src/db.js`, kopie `VACUUM INTO` (14 dni) |
| Auth / role | tylko panel: e-mail + hasło (scrypt) + opcjonalne TOTP; role owner / editor / viewer; sesje w DB |
| Formularze | zapis na listę (×2), potwierdzenie (JS + bez JS), ankieta, wypis, zamówienie, kod rabatowy, logowanie, 2FA, edycja poradnika, kody, użytkownicy |
| Płatności | sandbox (lokalnie) lub Stripe Checkout; webhooki `/api/webhooks/{stripe,sandbox}` z podpisem HMAC |
| E-mail | kolejka w DB → `data/outbox` lub Resend (env); sekwencja dzień 0/3/7; wypis jednym kliknięciem |
| Analityka | własna, dzienne sumy bez IP i ciasteczek; test A/B nagłówka |
| Zewnętrzne | Google Fonts (CSS + woff2); Stripe API i Resend API tylko po skonfigurowaniu |
| Uploady, WebSocket, AI | brak (demo „AI” działa w przeglądarce bez sieci) |
| Zadania w tle | wysyłka maili co 5 s, sprzątanie RODO i kopia co godzinę/dobę |

## 4. Wszystkie problemy

| # | Ważność | Typ | Problem | Miejsce | Status |
|---|---|---|---|---|---|
| S1 | **Wysokie** | Bezpieczeństwo / płatności | W produkcji bez Stripe bramka sandbox oznaczała zamówienia jako opłacone bez pieniędzy | `src/config.js`, `src/app.js` | Naprawione |
| S2 | Średnie | Kontrola dostępu / RODO | Rola „podgląd” czytała pełne e-maile, imiona i NIP (CSV zablokowane, JSON nie) | `src/admin.js` | Naprawione |
| S3 | Średnie | Uwierzytelnianie | Kod TOTP wielokrotnego użytku w oknie ±30 s; limit prób tylko na IP | `src/admin.js`, `src/security.js`, `src/db.js` | Naprawione |
| S4 | Średnie | Limity / proxy | `X-Forwarded-For`: brany pierwszy (podawany przez klienta) adres → obejście limitów logowania i formularzy | `src/http.js` | Naprawione |
| B1 | Średnie | Błąd logiczny / pieniądze | Kod z limitem 1 użycia opłacony dwa razy przy równoległych zamówieniach | `src/payments.js` | Naprawione |
| B2 | Średnie | Integralność danych | Przeglądarka mogła wysyłać zdarzenia serwerowe (`hero_impression`, zapisy, płatności) → fałszowanie A/B i lejka | `src/app.js`, `src/analytics.js` | Naprawione |
| B3 | Średnie | Błąd logiczny / RODO | `consentMarketing: "false"` (tekst) zapisywane jako zgoda | `src/waitlist.js` | Naprawione |
| B4 | Niskie | Odporność | Za duże zapytanie zrywało połączenie (ECONNRESET) zamiast 413 | `src/http.js` | Naprawione |
| B5 | Niskie | Wydajność | Pozycja w kolejce liczona osobnym zapytaniem dla każdego wiersza panelu (50 × pełne przeliczenie) | `src/waitlist.js`, `src/admin.js` | Naprawione |
| B6 | Niskie | Nadużycie | Farmienie kolejki adresami z domeny catch-all (każde polecenie −5 miejsc bez limitu) | `src/waitlist.js` | Częściowo (limit 20 liczonych poleceń; reszta w §12) |
| B7 | Niskie | Logika | Zwrot nie zwalniał użycia kodu rabatowego | `src/payments.js` | Naprawione |
| B8 | Niskie | Nadużycie | Anonimowe raporty błędów mogły zapełniać bazę | `src/app.js` | Naprawione (limit 500/dobę) |
| M1 | Niskie | Rozbieżność front↔back | `/en` bez ukośnika → 404 (linki zewnętrzne, ręczne wpisanie) | `src/app.js` | Naprawione (301) |
| L1 | Niskie | Transport | Brak przekierowania HTTP→HTTPS za proxy (HSTS był, ale tylko po pierwszym wejściu przez HTTPS) | `src/app.js` | Naprawione (308) |
| L2 | Niskie | Konfiguracja | Produkcja bez `BASE_URL` wysyłałaby linki `localhost` w mailach; słabe `ADMIN_PASSWORD` przyjmowane | `src/config.js` | Naprawione (start przerwany z komunikatem) |
| L3 | Niskie | E-mail | Brak `List-Unsubscribe` / one-click (wymóg Gmail/Yahoo dla wysyłek masowych) | `src/emails.js`, `src/app.js` | Naprawione |
| L4 | Informacyjne | Ujawnianie | Brak `/.well-known/security.txt` | `src/app.js` | Naprawione |
| P1 | Średnie | Prywatność / RODO | Google Fonts: adres IP odwiedzającego trafia do Google przy każdym wejściu | `src/pages/layout.js`, CSP | **Otwarte** — decyzja właściciela (bez pobierania plików); poprawka opisana |
| P2 | Niskie | Projekt | Prywatne linki (kolejka, wypis, zamówienie) są stałe (HMAC z ID) — wyciek linku nie da się „unieważnić” | `src/security.js` | Otwarte — zaakceptowane (opis §11) |

Infrastruktura poza kodem (nie da się sprawdzić lokalnie, lista w §12.2): SPF/DKIM/DMARC, szyfrowanie kopii, 2FA na kontach hostingu/domeny/Stripe/Resend.

## 5. Połączenia i endpointy

Katalog **54 tras** (pełna tabela z wynikami w załączniku A). Podsumowanie:
- **Panel (22 trasy `/api/admin/*`):** gość → 401 na wszystkich. Role zgodne z kodem: CSV tylko editor+, użytkownicy i dziennik tylko owner, zmiany wymagają `X-CSRF-Token`. Macierz GET: 23 adresy × 4 role = 115 zapytań, 0 flag.
- **Publiczne API (12):** każde POST wymaga `application/json` (415 dla formularzy), sprawdza `Origin` (403 dla obcego), ma limit na IP. Zapis ma też limit na adres. Wszystkie odpowiedzi `Cache-Control: no-store`.
- **Webhooki (2):** podpis `t=…,v1=HMAC`, tolerancja 300 s, idempotencja po `event_id`, zgodność `ref`/kwoty/waluty. Sandbox wyłączony w produkcji bez zgody.
- **Strony (≈ 25):** escapowanie, `noindex` i `Referrer-Policy: no-referrer` na stronach z kluczem w URL, `no-store`.
- **CORS:** brak nagłówków CORS, więc obce strony nie odczytają odpowiedzi. **Clickjacking:** `frame-ancestors 'none'` + `X-Frame-Options: DENY`.

## 6. Front oczami atakującego

| Próba | Wynik |
|---|---|
| Zmiana ceny/kwoty w zapytaniu `/api/orders` (`amount`, `price`) | ignorowane: cena z `PRODUCT.price` na serwerze (test) |
| Ukryte pola zapisu (`variant`, `ref`, `source`) | walidowane: wariant a–c, ref `[A-Za-z0-9]{4,12}` i tylko potwierdzony polecający, source ≤ 40 znaków |
| Pominięcie kroku (opłacenie bez operatora) | `/api/sandbox/pay` wymaga klucza zamówienia; w produkcji 404 |
| XSS w e-mailu, imieniu zamówienia, tytule/treści poradnika, polu demo | brak wykonania: escapowanie na serwerze, `textContent` w JS, Markdown z białą listą linków (bez `javascript:` i `//`) |
| Sekrety w bundle/HTML | brak: klucze tylko w env / `data/.secrets.json` (poza `public/`, dotfiles blokowane) |
| `localStorage`/ciasteczka | strona publiczna nie używa; sesja panelu HttpOnly (JS jej nie przeczyta) |
| Wstrzyknięcie stylu/skryptu | zablokowane przez CSP (potwierdzone: nawet narzędzie testowe nie mogło dodać `<style>`) |

## 7. Scenariusze ataków

Model zagrożeń: bot spamujący formularz, „łowca rabatów”, osoba farmiąca kolejkę, ktoś z wyciekłym hasłem do panelu, konkurent fałszujący statystyki, błędna konfiguracja przy wdrożeniu.

| # | Scenariusz | Atakujący | Wynik przed | Wynik po | Problem |
|---|---|---|---|---|---|
| A1 | „Opłacenie” pakietu bez pieniędzy na produkcji bez Stripe | każdy | **udane** (200) | zablokowane (503/404) | S1 |
| A2 | Jeden kod jednorazowy w dwóch zamówieniach | łowca rabatów | **udane** (used=2) | drugie odrzucone (422) | B1 |
| A3 | Fałszywe wyświetlenia wariantu C | konkurent | **udane** (3 → 8) | ignorowane (0 → 0) | B2 |
| A4 | Zgoda marketingowa z `"false"` | błąd klienta API | **zgoda zapisana** | brak zgody | B3 |
| A5 | Podgląd czyta wszystkie e-maile | pracownik z rolą podgląd | **pełne dane** | zamaskowane | S2 |
| A6 | Obejście limitów przez `X-Forwarded-For` | bot za proxy | **możliwe** | ostatni hop | S4 |
| A7 | Ponowne użycie podejrzanego kodu 2FA | phishing / podgląd ekranu | **możliwe** | odrzucone | S3 |
| A8 | Stored XSS (poradnik, zamówienie) | edytor / kupujący | brak | brak | — |
| A9 | Zmiana kwoty, sfałszowany i powtórzony webhook | oszust | brak | brak | — |
| A10 | Path traversal, `.env`, baza, `.secrets.json` | każdy | 404 | 404 | — |
| A11 | Ogromne JSON, typy (tablica zamiast tokenu) | bot | zerwane połączenie | 413 / bezpieczna odmowa | B4 |
| A12 | CSRF: obca strona wysyła formularz wypisu | każdy | 403 | 403 | — |
| A13 | `/en` bez ukośnika | użytkownik | 404 | 301 | M1 |
| A14 | HTTP za proxy | sieć publiczna | 200 po HTTP | 308 → HTTPS | L1 |
| A15 | `security.txt` | badacz | brak | jest | L4 |
| A16 | Wyliczanie kont panelu przez logowanie | każdy | identyczne 401 | identyczne 401 | — |
| A17 | Wyliczanie zapisów przez formularz | każdy | identyczna odpowiedź | identyczna | — |

## 8. Przegląd kodu

### 8.1 Bezpieczeństwo kodu
- **Źródła → ujścia:**
  - wszystkie zapytania SQL przez `prepare()` z parametrami, `LIKE` z usuniętymi `%_`,
  - HTML wyłącznie przez `escapeHtml`, JSON-LD z `\u003c`,
  - jedyne „surowe” ujście to `VACUUM INTO` ze ścieżką z konfiguracji (cudzysłowy escapowane).
- **Hasła i sekrety:** scrypt N=16384 z solą, porównania `timingSafeEqual`, tokeny 32 B `randomBytes`, w bazie tylko hashe tokenów, sekrety generowane lokalnie z uprawnieniami 0600.
- **Sesje:** nowe ID po logowaniu i po 2FA, wylogowanie innych sesji po zmianie hasła, 8 h ważności, sesja „w połowie” (przed 2FA) 5 min bez dostępu.
- **Zależności:** 0 paczek npm, więc `npm audit` nie ma czego sprawdzać. Node 22.13: `node:sqlite` oznaczone jako eksperymentalne (ostrzeżenie przy starcie, informacyjnie).

### 8.2 Błędy logiczne i ogólne
- Pieniądze w groszach (liczby całkowite), rabat zaokrąglany raz, kwoty porównywane dokładnie.
- Znalezione i naprawione w trakcie budowy (przed audytem, pokryte testami): remis w kolejce (awans o 4 zamiast 5), rotacja klucza zamówienia psująca link powrotny od operatora, parser demo nierozpoznający „godzinę” (`\b` nie działa z polskimi znakami).
- Znalezione w audycie: B1–B8 (tabela §4).
- Strefa czasowa: wykres „zapisy dziennie” w panelu grupuje po dniach UTC (spójnie front i back). Przy wpisach 00:00–01:00/02:00 czasu polskiego słupek trafia do poprzedniego dnia. Informacyjnie.

### 8.3 Uruchomienia
- `npm test`: **46/46** (po poprawkach, w tym nowe testy rezerwacji kodu i powtórki TOTP).
- `scripts/e2e.mjs` w Chrome: **67/67** (4 szerokości, przepływy, brak błędów konsoli i naruszeń CSP).
- Audyt spójności designu: 0 kolorów poza tokenami (poza wydrukiem), kontrast wszystkich par AA.

## 9. Zgodność frontu i backendu

| # | Funkcja | Front | Backend | Rozbieżność | Skutek | Problem |
|---|---|---|---|---|---|---|
| 1 | Zgoda marketingowa | wysyła `true/false` (boolean) | przyjmował każdą wartość prawdziwą | API przyjmowało `"false"` jako zgodę | zgoda bez zgody | B3 (naprawione) |
| 2 | Uprawnienia podglądu | panel nie pokazuje przycisku CSV | JSON z pełnymi danymi | uprawnienia w UI ≠ w API | wyciek danych w roli podgląd | S2 (naprawione) |
| 3 | `/en` | linki zawsze `/en/` | trasa tylko `/en/` | ręczne `/en` → 404 | zgubiony ruch | M1 (naprawione) |
| 4 | Komunikaty błędów zamówienia | mapuje `invalid_email/terms_required/invalid_nip/invalid_code` | zwraca te same kody + `presale_unavailable` | nowy kod 503 → komunikat ogólny | czytelny komunikat ogólny; strona `/zamow` pokazuje „wstrzymana” | OK |
| 5 | Walidacja e-maila | regex uproszczony | regex + długość 254 | front łagodniejszy | serwer zawsze decyduje, 422 obsłużone | OK |
| 6 | Trasy bez UI | — | `/api/waitlist/me`, `/api/quote`, `/healthz` | celowe (API kolejki, kalkulacja kodu, monitoring) | brak | OK |

## 10. Płatności, triale, subskrypcje i inne przepływy

| Przepływ | Podłączone | Logiczne | Bezpieczne | Jak sprawdzono | Problemy |
|---|---|---|---|---|---|
| Przedsprzedaż — sandbox | tak (lokalnie) | tak | tak | e2e + testy + A1/A2/A9 | S1, B1 (naprawione) |
| Przedsprzedaż — Stripe | kod gotowy, **niepodłączony** (brak kluczy) | tak (statusy, idempotencja) | podpis testowany jednostkowo | brak testu na żywo | wymaga testu na stagingu (§12.2) |
| Webhooki | tak | powtórka, inna kwota, inny ref, zły podpis, przeterminowany | tak | `payments.test.js` | — |
| Kody rabatowe | tak | limit, data ważności, rezerwacja 30 min, zwolnienie przy zwrocie | limit zapytań 20/min | testy + A2 | B1, B7 (naprawione) |
| Zwroty | tak (owner) | tylko opłacone, raz | rola owner + CSRF | test admin | B7 (naprawione) |
| Polecenia | tak | liczone po potwierdzeniu, bez samopolecenia, limit 20 | aliasy e-mail złączone | testy | B6 (częściowo) |
| Maile transakcyjne | outbox / Resend | potwierdzenie, powitanie, dzień 3/7 tylko ze zgodą, zamówienie, płatność, zwrot | linki z `BASE_URL`, nie z nagłówka Host | e2e (outbox) | L2, L3 (naprawione) |
| Wypis | tak | anuluje zaplanowane maile; GET tylko pyta, POST wypisuje | CSRF-safe, one-click | testy + A12 | — |
| Usunięcie danych (RODO) | tak (owner) | kasuje rekord i kolejkę maili; sprzątanie niepotwierdzonych po 30 dniach | dziennik działań | test | — |
| Triale / subskrypcje | nie dotyczy (przed startem produktu) | — | — | — | — |

## 11. Szczegóły problemów

### [S1] Darmowe „płatności” na produkcji bez Stripe — Wysokie
- **Dowód:** `NODE_ENV=production`, brak `STRIPE_SECRET_KEY` → `POST /api/orders` 201 → `POST /api/sandbox/pay {outcome:"success"}` 200 → zamówienie `paid`, e-mail „opłacone”.
- **Skutek:** każdy dostaje pakiet bez płacenia, zafałszowany przychód w panelu.
- **Poprawka:** `config.payments.enabled = !!STRIPE_SECRET_KEY || !production || ALLOW_SANDBOX_PAYMENTS === '1'`. Przy wyłączeniu: `/api/orders` → 503, `/api/sandbox/pay`, `/api/webhooks/sandbox` i `/platnosc-testowa/*` → 404, a `/zamow` pokazuje „Przedsprzedaż jest chwilowo wstrzymana”.
- **Ponowny test:** A1 → `order 503`.

### [S2] Pełne dane osobowe w roli „podgląd” — Średnie
- **Dowód:** `GET /api/admin/subscribers` jako viewer → 200 z pełnymi e-mailami; `GET …/subscribers.csv` → 403.
- **Poprawka:** funkcja `privacy()` w `src/admin.js` maskuje e-mail (`o***@p***.pl`), imię i NIP dla roli viewer na listach zapisów, zamówień, maili i poleceń.
- **Ponowny test:** A5 → brak pełnych adresów.

### [S3] Powtórne użycie kodu 2FA — Średnie
- **Poprawka:** migracja 2 (`users.totp_last_step`), `totpMatch()` zwraca krok czasu; logowanie odrzuca krok ≤ ostatnio użytego. Dodatkowy limit 5 prób / 15 min na konto.
- **Ponowny test:** `admin.test.js` („replayed code rejected”, „same code cannot log in twice”).

### [S4] `X-Forwarded-For` — Średnie (tylko przy `TRUST_PROXY=1`)
- **Poprawka:** brany ostatni hop (dopisany przez nasze proxy). Przy łańcuchu kilku proxy trzeba ustawić liczbę zaufanych hopów; zapisane w README produkcyjnym (§12.2).

### [B1] Kod jednorazowy opłacony dwa razy — Średnie
- **Poprawka:** przy walidacji kodu liczone są `used` + zamówienia `pending` z ostatnich 30 min. Porzucone zamówienie zwalnia kod po 30 min.
- **Ponowny test:** A2 → `201/422`, `used=1`; nowy test „an unpaid order holds a single-use code”.

### [B2] Fałszowanie zdarzeń — Średnie
- **Poprawka:** `CLIENT_EVENTS` (biała lista dla przeglądarki). Wyświetlenia hero, zapisy, potwierdzenia i płatności zapisuje tylko serwer.

### [B3] Zgoda z tekstu „false” — Średnie
- **Poprawka:** `consentMarketing === true`.

### [B4]–[B8], [M1], [L1]–[L4]
Opis i poprawki w tabeli §4. Każda poprawka została sprawdzona ponownie: scenariusze A11, A13–A15, testy i e2e.

### [P1] Google Fonts — Średnie, otwarte
Przy każdej wizycie przeglądarka łączy się z serwerami Google, które dostają adres IP. Sądy w UE uznawały to za przekazanie danych bez podstawy prawnej. Poprawka (ok. 15 minut):
1. pobrać 6 plików woff2 (Bricolage, Manrope, JetBrains Mono, latin + latin-ext) do `public/fonts/`,
2. dodać `@font-face` w `tokens.css`,
3. usunąć `<link>` z `layout.js`,
4. usunąć `fonts.googleapis.com` i `fonts.gstatic.com` z CSP w `src/http.js`.

Wstrzymane, bo pobieranie plików zostało odrzucone w tej sesji.

### [P2] Stałe prywatne linki — Niskie, zaakceptowane
Link do kolejki, wypisu i zamówienia to HMAC(APP_SECRET, id). Dzięki temu działa w każdym starym mailu, ale nie da się go unieważnić pojedynczo. Wyciek linku pozwala zobaczyć pozycję i wypisać daną osobę, nic więcej. Awaryjnie: zmiana `APP_SECRET` unieważnia wszystkie linki naraz.

## 12. Pokrycie, plan naprawy i ponowny test

### 12.1 Pokrycie
| Obszar | Status | Uwagi |
|---|---|---|
| Inwentaryzacja | Pełna | kod + crawl + skan pasywny |
| Połączenia (54) | 54/54 | GET macierzą ról; POST/PUT/DELETE ręcznie i testami |
| Kontrola dostępu | Pełna dla 3 ról | jedno konto na rolę (+ drugi edytor nie był potrzebny: brak zasobów należących do użytkownika) |
| Przegląd kodu | wszystkie pliki `src/`, `public/js/`, `sw.js` | — |
| Przepływy płatności | Sandbox | Stripe niepodłączony — test na stagingu do zrobienia |
| E-mail na żywo | Outbox | Resend i nagłówki domeny niesprawdzone (brak domeny) |
| Produkcja | nie istnieje | sprawdzono tryb produkcyjny lokalnie |

### 12.2 Plan naprawy (przed startem)
1. **P1:** fonty na własnym serwerze i dwa hosty mniej w CSP.
2. Stripe w trybie testowym: `STRIPE_SECRET_KEY=sk_test_…`, webhook w panelu Stripe na `/api/webhooks/stripe` (zdarzenia: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`). Test kartą 4242… i BLIK (test). Dopiero potem klucze live.
3. Domena nadawcy: SPF, DKIM (Resend), DMARC `p=quarantine`.
4. Kopie bazy: kopiować `data/backups` poza serwer, szyfrowane (np. `age` lub restic). W kopiach są adresy e-mail.
5. 2FA na kontach: hosting, rejestrator domeny, Stripe, Resend, GitHub. W panelu włączyć 2FA dla właściciela.
6. Za proxy: `TRUST_PROXY=1` tylko gdy aplikacja jest dostępna wyłącznie przez proxy. Port Node nie może być wystawiony publicznie.
7. B6 (opcjonalnie): blokada domen jednorazowych albo ręczna weryfikacja top poleceń przed wysłaniem zaproszeń (panel pokazuje listę).

### 12.3 Plan ponownego testu
`npm test` → `node scripts/e2e.mjs` (z `playwright-core`) → `attacks.mjs` (scenariusze A1–A17) na stagingu → test Stripe webhooka → skan pasywny na domenie produkcyjnej (oczekiwane: HSTS, 308 z HTTP, brak hostów Google po P1).

## 13. Załączniki
`ZALACZNIKI-BEZPIECZENSTWA.md`: A) katalog połączeń z wynikami, B) macierz ról, C) log scenariuszy przed i po, D) nagłówki odpowiedzi.

---
*Severity wg skali skilla: Krytyczne / Wysokie / Średnie / Niskie / Informacyjne. Listy prawne to checklisty, nie porada prawna.*

---

# Przebieg 2 — ponowny audyt (2026-11-25, tylko sprawdzenie, bez poprawek)

**Zakres:**
- ten sam kod po poprawkach z przebiegu 1,
- nowe serwery z izolowanymi danymi (QA :3710, produkcyjny :3711 za symulowanym proxy), zatrzymane po teście,
- skrypty skilla (skan pasywny, mapa tras, macierz 4 ról), regresja 17 scenariuszy (`scripts/audit/security-scenarios.mjs`) i 11 nowych prób (`scripts/audit/security-scenarios-2.mjs`).

**Regresja:** 17/17 OK. Macierz GET: 0 flag, podział ról bez zmian. Produkcja: 308 na HTTPS, HSTS obecny, przedsprzedaż bez Stripe wyłączona (503).

## Nowe problemy

| # | Ważność | Typ | Problem | Miejsce | Status |
|---|---|---|---|---|---|
| S5 | Średnie | Odporność / nadużycie | Zniekształcone kodowanie w ścieżce (`/poradnik/%E0%A4%A`, `/zamowienie/%ZZ`) → `URIError` w routerze → **500**. Każde takie wejście (anonimowe, bez limitu) zapisuje wiersz ze stosem do tabeli `errors` i do pliku logu, a w panelu wygląda jak awaria serwera | `src/http.js` (`Router.match`, `decodeURIComponent`) | Otwarte |
| L5 | Niskie | Nadużycie e-mail | Formularz przedsprzedaży kolejkuje przypomnienie na **dowolny** adres (bez potwierdzenia właściciela). Zmierzone: 3 zamówienia → 3 maile do „ofiary”; limit 8 / 10 min na IP | `src/payments.js` (`order_created`) | Otwarte |
| L6 | Niskie | Nadużycie | Kody rabatowe mogą mieć 3 znaki — krótkie kody da się zgadywać (limit 20/min na IP spowalnia, ale nie blokuje sieci botów) | `src/admin.js` (walidacja kodu) | Otwarte |
| L7 | Niskie | Wdrożenia / front↔back | Service worker podaje CSS/JS „cache-first” bez wersji w nazwie pliku → po wdrożeniu powracający goście mają stary `site.js`, dopóki ktoś nie podbije `VERSION` w `sw.js` (ryzyko rozjazdu z nowym API) | `public/sw.js` | Otwarte |
| L8 | Niskie | Dostępność konta | Brak ścieżki odzyskania, gdy jedyny właściciel straci hasło lub telefon z 2FA (`ensureOwner` działa tylko przy pustej tabeli) | `src/admin.js` | Otwarte |
| I1 | Informacyjne | Sesje | Ciasteczko panelu bez prefiksu `__Host-` (już HttpOnly, SameSite=Strict, Secure w prod) | `src/admin.js` | Otwarte |
| I2 | Informacyjne | Zależności | Node.js 22.13.1 — przed wdrożeniem sprawdzić najnowsze wydanie bezpieczeństwa 22.x (nie weryfikowano online) | środowisko | Otwarte |

## Sprawdzone i bez zastrzeżeń (nowe próby)
- nagłówek `Host: evil.example` nie trafia do canonical, OG ani linków,
- logowanie z obcej strony z treścią `text/plain` → 415 (brak login-CSRF),
- metody OPTIONS, PUT, DELETE na stronach → 405, TRACE odrzucony,
- sprzeczne `Content-Length` i `Transfer-Encoding` → 400 (parser Node).

## Proponowane poprawki (do wykonania na prośbę)
1. **S5:** w `Router.match` łapać `URIError` i zwracać 400 (`HttpError(400, 'bad_path')`) bez zapisu do `errors`. Opcjonalnie limit dzienny na zapis błędów serwera, jak dla błędów klienta.
2. **L5:** przypomnienie o niedokończonej płatności wysyłać tylko na adres potwierdzony na liście albo zrezygnować z niego; limit zamówień na adres e-mail (np. 3/dobę).
3. **L6:** minimum 6 znaków dla nowych kodów; kody jednorazowe generowane losowo (np. 10 znaków).
4. **L7:** strategia stale-while-revalidate dla CSS/JS w `sw.js` albo wersja w nazwie pliku (`site.v2.js`) i automatyczne podbijanie `VERSION`.
5. **L8:** skrypt `scripts/reset-admin.js` (lokalny, z konsoli serwera) resetujący hasło i 2FA wskazanego właściciela, z wpisem w dzienniku.
6. **I1:** w produkcji nazwa ciasteczka `__Host-og_admin`.

**Stan łączny po dwóch przebiegach:** 26 problemów. 16 naprawionych i sprawdzonych ponownie, 1 częściowo (B6), 9 otwartych: 2 średnie (S5, P1), 5 niskich (P2, L5–L8), 2 informacyjne (I1, I2). Krytycznych i wysokich brak.
