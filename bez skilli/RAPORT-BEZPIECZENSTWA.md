# Raport z audytu bezpieczeństwa i jakości — Kedgely (folder „bez skilli”)

Data: 2026-11-25 · Wersja: kod roboczy bez commitów (repo `master`, 0 commitów) · Tryb: white-box + testy dynamiczne na lokalnej kopii
Środowiska: lokalnie, dwie izolowane instancje (port 3591 z limitami, port 3592 bez limitów); bazy w katalogu tymczasowym, a nie w `data/`
Konta testowe: gość, 2 zwykłych użytkowników (A, B), konto bez dostępu, konto z wygasłym dostępem, konto z odebranym dostępem, 6 kont do testu wyścigu, administrator (sesja panelu i osobno sesja aplikacji)
Zakres: cały kod w `server/`, `web/`, `scripts/`, konfiguracja, zależności, wszystkie trasy HTTP
Poza zakresem: produkcja (nie istnieje), dostawca AI (brak klucza — tryb live sprawdzony tylko w kodzie), SMTP (nie skonfigurowany), płatności (nie podłączone z założenia), DNS/TLS domeny (domena nie jest zarejestrowana)
Narzędzia: skill **website-security-checker** z repo `3godzinyL/Custom-website-skills-` (commit `b9e8cd9`): `map-routes.mjs`, `passive-scan.mjs`, macierz testów z `connections.md`, skrypt konsoli z `frontend-attack-surface.md`; własne skrypty testowe (`audyt/dyn.mjs`, `audyt/rl.mjs`, `audyt/front.mjs`), Chrome przez Playwright, `npm audit`, przegląd kodu ręczny

---

## 1. Podsumowanie dla właściciela

**Ogólny poziom ryzyka: Średni.** Zabezpieczenia backendu są solidne, ale produkt jest niekompletny: po zalogowaniu użytkownik widzi pusty ekran, a panel administratora zwraca błąd 500.

Liczba problemów: **Krytyczne 0 · Wysokie 2 · Średnie 8 · Niskie 12 · Informacyjne 3** (razem 25)
Błędy logiczne i funkcjonalne: 5 · Rozbieżności front↔back: 3 · Przepływy biznesowe: 1 · Konfiguracja: 4

Najważniejsza wiadomość: **nikt z zewnątrz nie dostanie się do cudzych danych ani do panelu administratora.** Sprawdziłem 68 endpointów API jako gość, zwykły użytkownik i administrator. Każdy chroniony endpoint odrzucił osobę bez uprawnień. Użytkownik B nie zobaczył, nie zmienił ani nie usunął żadnego obiektu użytkownika A (18 prób). Wygasły i odebrany dostęp jest blokowany przez serwer natychmiast. Jednorazowy kod zaproszenia nie da się użyć dwa razy, nawet przy 6 równoległych próbach.

Biznesowo najgorsze jest coś innego: **produktu nie da się dziś używać.** Strona aplikacji ładuje skrypt, którego nie ma (404). Panel admina nie ma pliku strony (500). Wszystkie funkcje — zadania, plan dnia, asystent, analityka, zarządzanie dostępami — działają tylko przez API, bez interfejsu. Wynika to z przerwania budowy przez limit użycia, nie z luki, ale klient ani inwestor nie zobaczy działającego produktu.

Z prawdziwych luk najpilniejsze są cztery. Osobisty kod zaproszenia zaczyna działać dla każdego, gdy właściciel usunie konto. Hasło może trafić do adresu URL, jeśli ktoś wyśle formularz, zanim załaduje się JavaScript. Linki resetu hasła trafiają do logów serwera, jeśli nie skonfigurowano SMTP — także w produkcji. Każdy może zablokować dowolne konto, w tym konto admina, pięcioma błędnymi hasłami.

**Napraw najpierw:**
1. **M1 + M2** — dokończyć aplikację użytkownika i panel admina. Bez tego produktu nie da się pokazać ani używać.
2. **B1** — lista kodów zaproszeń w panelu (API) zwraca 500 bez filtra. Administrator nie zobaczy wygenerowanych kodów.
3. **S1** — osobisty kod zaproszenia staje się publiczny po usunięciu konta właściciela. Każdy z kodem dostaje plan Team.
4. **S4** — linki resetu hasła w logach i w skrzynce admina, gdy brak SMTP. Pozwala przejąć konto każdemu, kto czyta logi.
5. **S2** — formularze bez `method="post"`. Hasło może trafić do adresu URL, historii przeglądarki i logów proxy.
6. **S3** — blokada konta po 5 błędach. Atakujący może zablokować admina i sprawdzać, które e-maile mają konto.
7. **S5** — aktualizacja `nodemailer` (2 wpisy „high” w `npm audit`).

**Co jest zrobione dobrze:**
- Uwierzytelnianie na wszystkich 68 endpointach.
- Osobna sesja i ciasteczko panelu admina (`SameSite=Strict`, krótszy czas życia).
- Wszystkie zapytania SQL parametryzowane, a dane zawsze filtrowane po `user_id`.
- Trzy warstwy ochrony przed CSRF: token, sprawdzanie `Origin` i `SameSite`.
- Hasła hashowane scryptem, tokeny sesji i resetu przechowywane tylko jako hash.
- Kody zaproszeń przechowywane jako HMAC, z atomowym licznikiem użyć.
- Ścisła polityka CSP bez `unsafe-inline`, brak XSS w testach.
- Eksport CSV odporny na wstrzykiwanie formuł.
- Waitlista z honeypotem, tokenem czasowym, double opt-in i jednakową odpowiedzią dla duplikatów.
- Działające limity żądań na wszystkich formularzach publicznych.
- Pełny dziennik zdarzeń administracyjnych (14 sprawdzonych typów zdarzeń).

---

## 2. Zakres i metoda

| Faza skilla | Co wykonano | Żądania / zakres |
|---|---|---|
| 0. Zakres | White-box + lokalne uruchomienie z izolowanym stanem (osobne bazy SQLite w `%TEMP%`, porty 3591/3592). Twoje `data/kedgely.db` i port 3500 nie były używane. | — |
| 1. Inwentaryzacja | `map-routes.mjs` (95 tras), ręczne rozwinięcie prefiksów montowania (`/api/app`, `/api/admin`, `/api/account`, `/api/access`, `/api/auth`). Skrypt nie widzi prefiksów `app.use()` ani wywołań przez wrapper `api.post()`, więc katalog uzupełniłem ręcznie z kodu. | 61 plików |
| 1b. MCP | Nie instalowałem niczego. Przeglądarkę zapewnił lokalny Playwright + Chrome (odpowiednik Playwright MCP). Sugestie MCP w §12.2. | — |
| 2. Każde połączenie | Macierz z `connections.md` dla każdego endpointu: AuthN, AuthZ według ról, IDOR, CSRF, CORS, walidacja, błędy, cache, limity. | 365 żądań (`dyn.mjs`) + 62 żądania limitów (`rl.mjs`) |
| 3. Front oczami atakującego | Skrypt konsoli ze skilla, XSS przez demo na landingu, formularze bez JS, przekierowanie `?next=`, ładowanie aplikacji po zalogowaniu. | Chrome, 4 scenariusze |
| 4. Scenariusze ataków | 16 scenariuszy (§7). | wykonane bezpiecznie, lokalnie |
| 5. Kod — bezpieczeństwo | Śledzenie danych od wejścia (body/query/params/cookies, odpowiedź modelu AI) do SQL, HTML, e-maili, logów, przekierowań i narzędzi AI. Middleware na każdej trasie. Sekrety, `.gitignore`, `npm audit`. | wszystkie pliki `server/`, `web/assets/js/` |
| 6. Kod — logika i błędy | Strefy czasowe, limity, wyścigi, paginacja, obsługa błędów, martwe skrypty. | jw. |
| 7. Front↔back | Diff tras i wywołań, porównanie pól, zachowanie stron chronionych. | jw. |
| 8. Przepływy | Zaproszenia, dostępy czasowe, waitlista, reset hasła, usuwanie i eksport konta, limity planów, e-maile. Płatności: nie podłączone. | §10 |
| 9. Raport | ten dokument + `ZALACZNIKI-BEZPIECZENSTWA.md` | — |
| 10. Poprawki | **Nie wykonano** — skill robi je tylko na prośbę. Plan napraw w §12. | — |

Wynik automatycznych testów dynamicznych: **319 z 326 sprawdzeń zgodnych z oczekiwaniem**. Te 7 niezgodnych to problemy M1, M2, B1, B2, S1, S11 i S4.

---

## 3. Mapa strony (inwentaryzacja)

| Obszar | Co jest | Uwagi |
|---|---|---|
| Hosting | brak wdrożenia; serwer Node 22 (`server/index.js`), domyślnie `127.0.0.1:3500` | produkcja wymaga reverse proxy z TLS |
| Frontend | statyczny HTML + CSS + vanilla JS (moduły ES), bez frameworka | landing, logowanie, rejestracja, reset hasła, waitlista, polityka prywatności, regulamin, 404 — **gotowe**; aplikacja `/app` — tylko powłoka + komponenty, **brak `main.js` i widoków**; panel `/admin` — tylko strona logowania |
| Backend/API | Express 5, 68 endpointów API + 17 tras stron | kontrakt kompletny i działający |
| Baza danych | SQLite przez wbudowane `node:sqlite` (moduł eksperymentalny w Node 22), 1 migracja, 19 tabel | jedna instancja |
| Uwierzytelnianie | e-mail + hasło (scrypt N=32768), sesje po stronie serwera, ciasteczka `kg_sid` (app) i `kg_admin` (panel), `__Host-` przy HTTPS | role: `user`, `admin`; stan dostępu liczony z grantów: active / pending / scheduled / expired / revoked / blocked |
| Formularze | logowanie, rejestracja (z kodem), reset hasła, waitlista, demo parsera, logowanie admina | wszystkie obsługiwane przez JS (`fetch`) |
| Płatności | **brak** — ceny planów tylko informacyjnie, pole `billing_price_id` przygotowane pod Stripe | zgodne z treścią strony („billing is not active yet”) |
| Uploady | brak | — |
| Skrypty zewnętrzne | **brak** — font Inter z `node_modules`, zero CDN, zero analityki | dobry wynik RODO |
| E-mail | nodemailer (SMTP) lub transport „log” (konsola + tabela `email_outbox`) | SMTP nieskonfigurowany |
| AI | Anthropic Messages API (wymuszony tool call) lub silnik regułowy „demo” | w audycie tylko demo (brak klucza) |
| Zadania w tle | co 60 s: znaczniki wygaśnięcia, sprzątanie sesji i resetów, wygaszanie propozycji AI; co 6 h: retencja waitlisty i outboxa | poprawność dostępu nie zależy od zadań |
| Realtime / webhooki / cron HTTP | brak | — |

**Architektura w skrócie.** Przeglądarka wysyła JSON do `/api/*` z ciasteczkiem sesji i nagłówkiem `X-CSRF-Token`. Middleware w kolejności: nagłówki bezpieczeństwa → parser JSON (100 KB) → sprawdzanie `Origin` → wczytanie sesji (osobno dla `/api/admin`) → router. Router aplikacji ma na stałe łańcuch `requireUser → requireCsrf → requireAccess`. `requireAccess` przy każdym żądaniu sprawdza w bazie, czy istnieje nieodwołany grant obejmujący „teraz”. Router admina wymaga sesji o zakresie `admin` i roli `admin`. Asystent AI dostaje wyłącznie dane zalogowanej osoby. Akcje proponowane przez model są walidowane schematem, zapisywane po stronie serwera i wykonywane dopiero po zatwierdzeniu, przez te same serwisy co REST (limity planu, własność obiektów).

---

## 4. Wszystkie problemy

| # | Ważność | Typ | Problem | Miejsce | Status |
|---|---|---|---|---|---|
| M1 | Wysokie | Rozbieżność front↔back | Aplikacja użytkownika nie istnieje: `/app` ładuje `/assets/js/app/main.js` → 404, pusty ekran po zalogowaniu i rejestracji | `web/app/index.html:13`, brak `web/assets/js/app/main.js` i `views/*` | Otwarte |
| M2 | Wysokie | Rozbieżność front↔back | Panel administratora: `/admin` po zalogowaniu → 500 (brak `web/admin/index.html` i JS panelu) | `server/app.js:70`, brak plików w `web/admin/` | Otwarte |
| B1 | Średnie | Błąd kodu | `GET /api/admin/invites` bez filtra → 500 „Unknown named parameter 'now'” | `server/services/invites.js:103` | Otwarte |
| S1 | Średnie | Bezpieczeństwo | Osobisty kod zaproszenia (z waitlisty) przestaje być przypisany do e-maila po usunięciu konta właściciela i działa dla każdego | `server/services/users.js:77` | Otwarte |
| S2 | Średnie | Bezpieczeństwo | Formularze bez `method="post"`: wysłane przed załadowaniem JS dają `GET /login?email=…&password=…` | `web/login.html:25`, `signup.html:25`, `reset-password.html:24`, `admin/login.html:24`, `index.html:559` | Otwarte |
| S3 | Średnie | Bezpieczeństwo | Blokada konta po 5 błędach: obca osoba może zablokować każde konto (także admina) i rozpoznać, które e-maile istnieją | `server/routes/auth.js:79-91` | Otwarte |
| S4 | Średnie | Bezpieczeństwo / Konfiguracja | Bez SMTP treść e-maili (linki resetu hasła) trafia do logów, także przy `NODE_ENV=production`; w trybie dev admin widzi linki resetu w outboxie | `server/services/mailer.js:35`, `routes/admin.js` (`/outbox`) | Otwarte |
| S5 | Średnie | Bezpieczeństwo (zależności) | `nodemailer@6.10.1`: 2 wpisy „high” w `npm audit`, ponad 20 advisory (m.in. wstrzykiwanie poleceń SMTP, obejście domeny odbiorcy, DoS parsera adresów) | `package.json` | Otwarte |
| S6 | Średnie | Bezpieczeństwo | Brak drugiego składnika (2FA) przy logowaniu do panelu, który kontroluje dostęp wszystkich użytkowników | `server/routes/admin.js:39` | Otwarte |
| C1 | Średnie | Konfiguracja / jakość | Brak testów, `npm run lint` i `npm run typecheck` padają (brak konfiguracji ESLint i `tsconfig.json`), skrypty `build` i `seed:demo` wskazują nieistniejące pliki, brak README | `package.json`, `test/`, `e2e/` | Otwarte |
| S7 | Niskie | Bezpieczeństwo | Enumeracja kont przez rejestrację (409 „account already exists”) | `server/services/users.js:36` | Otwarte |
| S8 | Niskie | Bezpieczeństwo (koszt) | W trybie live limit AI sprawdzany przed `await`, a zliczany po: równoległe żądania mogą przekroczyć dzienny limit planu i limit globalny | `server/services/ai/index.js:98-116` | Do potwierdzenia |
| S9 | Niskie | Konfiguracja | `TRUST_PROXY` domyślnie `1` w produkcji: bez proxy `X-Forwarded-For` z żądania omija limity per IP | `server/config.js:64` | Otwarte |
| S10 | Niskie | Bezpieczeństwo | Limity żądań i blokady w pamięci procesu: restart je zeruje, nie działają przy kilku instancjach | `server/lib/rateLimit.js` | Otwarte |
| S11 | Niskie | Prywatność (RODO) | Po usunięciu konta e-mail zostaje w dzienniku (`waitlist.invited`) i w etykiecie kodu („Waitlist: e-mail”) | `server/routes/admin.js:385,395`, `services/users.js:67-79` | Otwarte |
| S12 | Niskie | Przepływ biznesowy | Gdy admin włączy „auto-grant” (np. Pro na 14 dni), aliasy e-mail (`ania+1@…`) dają nieograniczone darmowe dostępy | `server/routes/auth.js:132-139` | Otwarte |
| S13 | Niskie | Bezpieczeństwo | Zmiana e-maila użytkownika przez admina nie unieważnia sesji ani wysłanych linków resetu (link do starego adresu nadal zmienia hasło) | `server/routes/admin.js:158` | Otwarte |
| B2 | Niskie | Błąd kodu | Zepsute kodowanie `%` w ścieżce API (`/api/app/tasks/%E0%A4%A`) → 500 i stack w logu zamiast 400 | `server/app.js` (obsługa błędów) | Otwarte |
| B3 | Niskie | Błąd logiczny | Lista zadań ucina wynik do 1000, a plan Team pozwala na 20 000 otwartych zadań — reszta po cichu niewidoczna | `server/services/tasks.js:95` | Otwarte |
| B5 | Niskie | Błąd logiczny | Wyłączenie planu (`is_active=0`) nie blokuje nowych grantów ani istniejących dostępów na ten plan | `server/services/access.js:92`, `getCurrentAccess` | Otwarte |
| M3 | Niskie | Rozbieżność front↔back | `og.png` i `apple-touch-icon.png` → 404 (podgląd linku bez obrazka); canonical i OG wskazują `kedgely.app`, domenę niezarejestrowaną | `web/index.html:6-23` | Otwarte |
| C2 | Niskie | Konfiguracja | Aplikacja sama nie przekierowuje HTTP→HTTPS; HSTS tylko przy `COOKIE_SECURE` — zależność od poprawnego proxy | `server/middleware/security.js` | Otwarte |
| B4 | Informacyjne | Błąd logiczny | `?next=` po logowaniu przepuszcza `..` (`/app/../../evil` → `/evil`) — tylko ta sama domena, nie jest to otwarte przekierowanie | `web/assets/js/auth.js:10` | Otwarte |
| C3 | Informacyjne | Konfiguracja | Brak `/.well-known/security.txt`, brak raportowania naruszeń CSP | — | Otwarte |
| C4 | Informacyjne | Konfiguracja | `node:sqlite` jest w Node 22 eksperymentalny; warstwa `Db` ułatwia wymianę sterownika | `server/db/index.js` | Otwarte |

Typy: Bezpieczeństwo (S) · Błąd logiczny/kodu (B) · Rozbieżność front↔back (M) · Przepływ biznesowy (F, tu S12) · Konfiguracja (C)

---

## 5. Połączenia i endpointy

Podsumowanie: **85 pozycji w katalogu** (68 endpointów API + 17 tras stron i plików). 68 przetestowanych w pełni, 17 stron sprawdzonych pod kątem dostępu, przekierowań i nagłówków. Nietestowane: wywołanie dostawcy AI (brak klucza), wysyłka SMTP (brak serwera).

Najważniejsze wnioski:
- **Uwierzytelnianie:**
  - 37/37 chronionych endpointów aplikacji i konta zwraca 401 dla gościa.
  - 31/31 endpointów admina zwraca 401 dla gościa.
  - 31/31 endpointów admina zwraca 401 dla zalogowanego zwykłego użytkownika.
  - 14/14 endpointów admina (GET) zwraca 401 nawet dla administratora zalogowanego tylko w aplikacji. Panel wymaga osobnej sesji.
- **Podmiana ciasteczek:** token panelu włożony do ciasteczka aplikacji (i odwrotnie) daje 401.
- **Dostęp czasowy:**
  - Konto bez dostępu: 403 `access_required` na 26/26 endpointach `/api/app/*`.
  - Dostęp z końcem za 2 s: działał, po 2,6 s → 403, bez żadnego zadania w tle.
  - Odebrany dostęp: 403 przy następnym żądaniu.
  - Grant z przyszłą datą startu: nieaktywny do czasu startu.
- **IDOR:** 0 przypadków. Użytkownik B dostał 404 na wszystkich 10 operacjach na obiektach A. Nie podpiął się pod projekt A, nie zaplanował zadania A, nie zastosował ani nie odrzucił propozycji AI użytkownika A, nie usunął sesji A.
- **CSRF:** odrzucone są żądania bez tokenu, ze złym tokenem, z `Origin` obcej strony i z `Sec-Fetch-Site: cross-site`. Logowanie z obcego `Origin` też jest odrzucane, więc nie da się podrzucić sesji (login CSRF).
- **CORS:** brak nagłówka `Access-Control-Allow-Origin` dla obcej domeny.
- **Błędy:** zły JSON → 400 bez śladu stosu, 200 KB → 413. Jedyny 500 dla klienta to zepsute `%` w ścieżce API (B2). Drugi 500 to błąd SQL w liście kodów (B1).
- **Pliki:** `/.env`, `/.git/HEAD`, `/package.json`, `/data/kedgely.db`, `/server/config.js` i próby `../` z kodowaniem → brak dostępu.

Pełny katalog z wynikiem dla każdego wiersza: **Załącznik A**.

---

## 6. Front oczami atakującego

| Test | Wynik |
|---|---|
| Skrypt konsoli ze skilla na landingu | `localStorage` puste, 0 ciasteczek czytelnych dla JS, 0 ukrytych pól, 0 handlerów inline, 0 skryptów i iframe'ów z zewnątrz |
| XSS przez demo parsera (`<img src=x onerror=…>`, `"><svg onload=…>`, `<b>`) | Zero okienek, zero wstawionych elementów — wszystko wyświetlone jako tekst (escapowanie w `html\`\``) |
| Błędy konsoli i naruszenia CSP na landingu | 0 |
| Wysłanie logowania z wyłączonym JS | **URL: `/login?email=victim%40audit.test&password=Secret-Password-123`** → problem S2 |
| Wysłanie waitlisty z wyłączonym JS | **URL: `/?email=nojs%40audit.test&website=`** → e-mail w adresie (S2) |
| `?next=https://evil.example`, `//evil.example`, `/\evil.example`, `javascript:` | Zawsze `/app` — brak otwartego przekierowania |
| `?next=/app/../../evil` | `/evil` (404 na tej samej domenie) → B4, informacyjne |
| Zalogowanie i otwarcie `/app` | Pusty ekran, w sieci `404 /assets/js/app/main.js` → M1 |
| Zmiana ról, planu, statusu w żądaniach (mass assignment) | `PATCH /api/account {role:"admin"}` → 422. Dodatkowe pola w rejestracji ignorowane (rola została `user`). `userId` w PATCH zadania zignorowane. |
| Wstrzyknięcie akcji do zatwierdzenia propozycji AI | Serwer czyta akcje z bazy, a od klienta przyjmuje tylko numery — próba podania obiektu akcji → 422 |
| Indeksy spoza zakresu przy zatwierdzaniu | Wykonana tylko poprawna akcja; drugie zatwierdzenie → 403 `proposal_closed` |

---

## 7. Scenariusze ataków

| # | Scenariusz | Atakujący | Wynik | Problem # |
|---|---|---|---|---|
| A1 | Wejście do panelu admina kontem użytkownika (API i strona) | ciekawski klient | Zablokowane (401 / przekierowanie na logowanie admina) | — |
| A2 | Nadanie sobie roli admina lub planu przez dodatkowe pola w żądaniu | ciekawski klient | Zablokowane (422 / pola ignorowane) | — |
| A3 | Odczyt i zmiana cudzych zadań, projektów, bloków, propozycji AI | ciekawski klient | Zablokowane (404, 18/18) | — |
| A4 | Korzystanie z aplikacji po wygaśnięciu lub odebraniu dostępu | łowca okazji | Zablokowane natychmiast (403) | — |
| A5 | Wielokrotne użycie kodu jednorazowego, wyścig 6 żądań na kod 2-użyciowy | łowca okazji | Zablokowane (409 / 403; dokładnie 2 sukcesy, `use_count`=2) | — |
| A6 | Zgadywanie kodów zaproszeń | bot | Niewykonalne (80 bitów entropii, limit 10 prób/h na konto, ta sama odpowiedź dla każdego błędu) | — |
| A7 | Przejęcie osobistego kodu z waitlisty po usunięciu konta właściciela | osoba z przekazanym mailem | **Udane** — obce konto dostało plan Team na 30 dni | **S1** |
| A8 | Zablokowanie konta admina | konkurent / złośliwiec | **Udane** — 5 błędnych haseł = 15 min blokady, odnawialne | **S3** |
| A9 | Sprawdzenie, czy e-mail ma konto | bot | **Udane** przez blokadę (429 vs 401) i rejestrację (409) | **S3, S7** |
| A10 | Przejęcie konta przez link resetu z logów | osoba z dostępem do logów / hostingu | **Możliwe**, gdy brak SMTP | **S4** |
| A11 | Podrzucenie linku resetu z obcą domeną (nagłówek `Host`) | phisher | Zablokowane — link zawsze z `BASE_URL` | — |
| A12 | Ponowne użycie linku resetu, stare sesje po resecie | złodziej sesji | Zablokowane (400; wszystkie sesje zakończone) | — |
| A13 | Spam waitlisty i formularzy | spammer | Zablokowane: honeypot, token czasowy (min. 2,5 s), limit 5/h na IP, double opt-in, ta sama odpowiedź dla duplikatów | — |
| A14 | Wstrzyknięcie formuły do eksportu CSV | złośliwy użytkownik | Zneutralizowane (`'=cmd…`) | — |
| A15 | Prompt injection przez tytuł zadania („IGNORE ALL RULES…”) | złośliwy użytkownik | Brak akcji (tryb demo). W trybie live model widzi tylko dane tej osoby, akcje mają białą listę i wymagają zatwierdzenia | — |
| A16 | Wyczerpanie budżetu AI równoległymi żądaniami | bot z kontem | Ograniczone przez limit 12/min; w trybie live możliwe niewielkie przekroczenie limitu dziennego | **S8** |

---

## 8. Przegląd kodu

### 8.1 Bezpieczeństwo kodu

- **SQL:** wszystkie zapytania parametryzowane (`?` lub nazwane). Brak sklejania wartości z wejścia. Frazy `LIKE` mają usunięte `%` i `_`. Nazwy kolumn i kierunki sortowania pochodzą ze stałych w kodzie.
- **HTML:** cały front renderuje przez szablon `html\`\``, który escapuje każdą wartość. `raw()` dostaje tylko stałe znaczniki. `innerHTML` w `ui.js` i `landing.js` zawsze przechodzi przez `esc()`. Ścisła polityka CSP (`script-src 'self'`, bez `unsafe-inline`) to druga warstwa.
- **Sesje:**
  - Token 256-bit, w bazie przechowywany jako SHA-256.
  - Nowy token przy logowaniu, więc nie da się podrzucić sesji (fixation).
  - Sesja kończy się przy wylogowaniu, resecie hasła (wszystkie sesje), zmianie hasła (pozostałe sesje), blokadzie konta i zmianie roli.
  - Ciasteczka `HttpOnly` i `SameSite` (Lax dla aplikacji, Strict dla panelu), `Secure` i prefiks `__Host-` przy HTTPS.
- **Hasła i tokeny:** scrypt N=32768, porównania stałoczasowe (`timingSafeEqual`), fikcyjny hash przy nieznanym e-mailu (równy czas odpowiedzi). Token resetu: 256 bitów, jednorazowy, ważny 30 min.
- **Kody zaproszeń:** w bazie tylko HMAC z `APP_SECRET` i 4 ostatnie znaki. Licznik użyć zwiększany warunkowo (`use_count < max_uses`) w transakcji `BEGIN IMMEDIATE`.
- **AI:** klucz tylko na serwerze, timeout 30 s. Odpowiedź modelu jest walidowana schematem zod i sprawdzana pod kątem własności id. Propozycja żyje 30 min, a do wykonania serwer bierze akcje z bazy, nie z żądania.
- **Sekrety:**
  - `.env` i `data/` są w `.gitignore`.
  - W kodzie i `.env.example` brak kluczy (wyszukiwane wzorce: `sk-ant-`, `sk_live_`, `AKIA…`, klucze prywatne).
  - Produkcja odmawia startu bez `APP_SECRET` ≥ 32 znaki.
  - Brak domyślnego hasła admina: konto tworzy jednorazowa komenda z hasłem z `ADMIN_PASSWORD` albo wygenerowanym.
- **Problemy w kodzie:**
  - **S1:** czyszczenie `bound_email` przy usuwaniu konta.
  - **S4:** logowanie treści e-maili niezależnie od środowiska.
  - **S3:** blokada per konto bez osobnej ścieżki dla atakującego.
  - **S8:** sprawdzanie limitu przed `await`.
  - **S9:** domyślne `trust proxy`.
  - **S13:** zmiana e-maila bez unieważnień.

### 8.2 Błędy logiczne i ogólne

- **B1:** `listInvites` przekazuje `{ now }` do zapytania liczącego, które bez filtra nie zawiera `:now`. `node:sqlite` odrzuca nieznany nazwany parametr, więc domyślny widok listy kodów zawsze kończy się 500. Wersja z filtrem działa.
- **B2:** Express 5 rzuca `URIError` przy dekodowaniu parametru. Globalna obsługa błędów traktuje go jako nieznany błąd (500) i loguje pełny stos.
- **B3:** limit 1000 w `listTasks` jest niezgodny z limitem planu Team.
- **B5:** `grantAccess` i `getCurrentAccess` nie biorą pod uwagę `plans.is_active`.
- **Strefy czasowe:** daty dnia, plan dnia i analityka liczone w strefie użytkownika (`Intl`, `zonedParts`). Wyjątek: „ukończone dziś” na dashboardzie liczone jako „teraz minus minuty od lokalnej północy”. W dniu zmiany czasu (marzec/październik) może się przesunąć o godzinę — nieistotne, nie wpisuję jako problem.
- **Wyścigi:** wszystkie operacje na kodach, limitach i dostępach są synchroniczne w jednym procesie i w transakcjach. Jedyny wyścig to S8 (trasa asynchroniczna).
- **Martwe skrypty:** `npm run build`, `npm run seed:demo` i `npm run test:e2e` wskazują nieistniejące pliki lub konfigurację (C1).

### 8.3 Testy, typy, lint, zależności (wyniki uruchomień)

| Polecenie | Wynik |
|---|---|
| `npm test` | 0 testów, 1 błąd (katalogi `test/unit` i `test/integration` są puste) |
| `npm run lint` | błąd — brak `eslint.config.js` |
| `npm run typecheck` | `TS5058: The specified path does not exist: 'tsconfig.json'` |
| `npm audit --omit=dev` | **2 high** — `nodemailer <=10.1.3` (zainstalowane 6.10.1), poprawka: `nodemailer@^10` (zmiana major) |
| `npm audit` (z dev) | te same 2 high |
| Własne testy audytu (`audyt/dyn.mjs`) | 319/326 OK; 7 niezgodnych opisanych w §4 |

---

## 9. Zgodność frontu i backendu

| # | Funkcja | Front | Backend | Rozbieżność | Skutek | Problem # |
|---|---|---|---|---|---|---|
| 1 | Aplikacja użytkownika | `app/index.html` ładuje `/assets/js/app/main.js` | 26 endpointów `/api/app/*` działa | brak `main.js` i widoków | pusty ekran po zalogowaniu | M1 |
| 2 | Panel admina | tylko `admin/login.html` | 31 endpointów `/api/admin/*` działa | brak `admin/index.html` i JS | 500 po zalogowaniu admina | M2 |
| 3 | Lista kodów (domyślny widok) | (brak UI) | `GET /api/admin/invites` → 500 | błąd SQL | admin nie widzi kodów | B1 |
| 4 | Formularze | obsługa tylko przez JS | API przyjmuje JSON | brak `method="post"` | dane w URL bez JS | S2 |
| 5 | Lista zadań | (UI w budowie) | maks. 1000 wierszy | plan Team: 20 000 | ukryte zadania | B3 |
| 6 | Meta OG / ikony | `og.png`, `apple-touch-icon.png` | brak plików | 404 | podgląd linku bez obrazka | M3 |
| 7 | Cennik | czyta `/api/plans` | limity z bazy | zgodne | — | — |
| 8 | Demo parsera, waitlista | `fetch` do `/api/demo/parse`, `/api/waitlist*` | zgodne pola i błędy | zgodne | — | — |
| 9 | Logowanie, rejestracja, reset (`auth.js`) | pola `email`, `password`, `inviteCode`, `acceptTerms`, `marketing`, `timezone` | ten sam kontrakt zod | zgodne; błędy pól (`details.fields`) wyświetlane przy polach | — | — |

---

## 10. Płatności, triale, subskrypcje i inne przepływy

| Przepływ | Podłączone | Logiczne | Bezpieczne | Jak sprawdzono | Problemy |
|---|---|---|---|---|---|
| Płatności / subskrypcje (Stripe) | ➖ nie podłączone z założenia (strona tak to opisuje) | ➖ | ➖ | kod: tylko pole `billing_price_id` | — |
| Kod zaproszenia → dostęp czasowy | ✅ | ✅ (normalizacja wpisu, daty ważności, aktywność, limit użyć, przypisanie do e-maila) | ⚠️ osobisty kod traci przypisanie po usunięciu konta | 15 testów + wyścig 6 żądań | S1 |
| Ręczne nadanie, przedłużenie i odebranie dostępu | ✅ | ✅ (przyszły start, wygaśnięcie bez zadań w tle, historia z nazwą admina) | ✅ | 12 testów | — |
| Automatyczny dostęp przy rejestracji (trial) | ✅ (domyślnie wyłączony) | ✅ | ⚠️ aliasy e-mail | test aliasu `+farm1` | S12 |
| Limity planów (projekty, zadania, AI, analityka, funkcje) | ✅ | ✅ (archiwizacja zwalnia miejsce, przywrócenie sprawdza limit) | ✅ / ⚠️ wyścig AI w trybie live | 8 testów + kod | S8 |
| Waitlista z double opt-in | ✅ | ✅ (token jednorazowy, retencja 30 dni dla niepotwierdzonych) | ✅ | 9 testów | — |
| Reset hasła | ✅ (link przez outbox) | ✅ | ⚠️ treść maili w logach bez SMTP | 7 testów | S4 |
| Rejestracja zamknięta / tylko z kodem | ✅ | ✅ | ✅ | 2 testy | — |
| Usunięcie konta (RODO) | ✅ | ⚠️ zostawia e-mail w dzienniku i etykiecie kodu | ⚠️ odpina osobisty kod | test end-to-end | S1, S11 |
| Eksport danych (RODO) | ✅ | ✅ (bez hasha hasła) | ✅ | 1 test | — |
| E-maile transakcyjne | ⚠️ SMTP nieskonfigurowany (transport log) | ✅ | ⚠️ zależność z CVE | outbox | S4, S5 |
| Asystent AI | ✅ tryb demo; live tylko w kodzie | ✅ (propozycja → zatwierdzenie, ważność 30 min, jednokrotne wykonanie) | ✅ | 5 testów | S8 |

---

## 11. Szczegóły problemów

### [M1] Aplikacja użytkownika nie ma interfejsu — Wysokie
- **Gdzie:** `web/app/index.html:13` → `/assets/js/app/main.js` (404); brak `web/assets/js/app/views/*`.
- **Typ i kategoria:** Rozbieżność front↔back · brak funkcji.
- **Na czym polega:** Serwer poprawnie wpuszcza zalogowaną osobę na `/app` i ma działające API (zadania, projekty, plan dnia, asystent, analityka, ustawienia). Brakuje jednak modułu startowego i widoków, więc strona zostaje na szkielecie ładowania. Gotowe są tylko komponenty (`components.js`, `state.js`) i CSS.
- **Skutek dla biznesu:** Każda osoba, która się zarejestruje albo zaloguje, widzi pusty ekran. Produktu nie da się pokazać klientowi ani inwestorowi.
- **Dowód:** Chrome po zalogowaniu: URL `/app`, treść strony „Skip to content”, w sieci `404 /assets/js/app/main.js`.
- **Jak odtworzyć:** zarejestrować się na `/signup` → przekierowanie na `/app` → pusta strona.
- **Jak naprawić:** dokończyć `main.js` (router, layout, sesja, ekran braku dostępu) i widoki: dashboard, asystent, zadania, projekty, harmonogram, statystyki, ustawienia. Kontrakt API jest gotowy i przetestowany.
- **Jak sprawdzić naprawę:** `node audyt/front.mjs <url>` → `appShell.failedRequests` puste. Dodać test E2E logowania i pierwszego zadania.
- **Powiązane:** M2, C1.

### [M2] Panel administratora zwraca 500 — Wysokie
- **Gdzie:** `server/app.js:70` (`sendFile`), brak `web/admin/index.html`.
- **Typ i kategoria:** Rozbieżność front↔back · brak funkcji.
- **Na czym polega:** Po poprawnym logowaniu admina serwer próbuje wysłać nieistniejący plik. `sendFile` zgłasza `ENOENT`, a ogólna obsługa błędów odpowiada 500.
- **Skutek dla biznesu:** Administrator nie zarządzi użytkownikami, dostępami czasowymi, kodami ani waitlistą inaczej niż przez ręczne wywołania API.
- **Dowód:** `GET /admin` z sesją admina → `500 Something went wrong on our side`.
- **Jak naprawić:** zbudować `web/admin/index.html`, `admin.css` i widoki (przegląd, użytkownicy, dostępy, kody, waitlista, plany, ustawienia, dziennik, outbox). Na czas budowy dodać w `sendPage` callback `sendFile`, który przy braku pliku zwraca czytelne 404 zamiast 500.
- **Jak sprawdzić naprawę:** test `pages › admin shell served` w `audyt/dyn.mjs`.

### [B1] Lista kodów zaproszeń zwraca 500 — Średnie
- **Gdzie:** `server/services/invites.js:103`.
- **Typ i kategoria:** Błąd kodu.
- **Na czym polega:** Bez filtra `status` zapytanie `SELECT COUNT(*) FROM invite_codes i` nie zawiera `:now`, ale dostaje obiekt `{ now }`. `node:sqlite` rzuca „Unknown named parameter 'now'”.
- **Skutek dla biznesu:** Domyślny widok kodów w panelu nie działa. Admin nie zobaczy wygenerowanych kodów ani ich użycia.
- **Dowód:** `GET /api/admin/invites` → 500. W logu: `Error: Unknown named parameter 'now' at listInvites (invites.js:103)`. Z `?status=active` → 200.
- **Jak naprawić:**
  ```js
  const total = db.get(`SELECT COUNT(*) AS n FROM invite_codes i ${where}`, status ? { now, status } : {}).n;
  ```
  To samo sprawdzić w każdym zapytaniu z nazwanymi parametrami. Dobry test regresji to wywołanie każdej listy admina bez filtrów.
- **Jak sprawdzić naprawę:** test `invite › admin invite list (no filter) loads`.

### [S1] Osobisty kod zaproszenia działa dla każdego po usunięciu konta właściciela — Średnie
- **Gdzie:** `server/services/users.js:77` — `UPDATE invite_codes SET bound_email = NULL WHERE bound_email = ?`.
- **Typ i kategoria:** Bezpieczeństwo · Kontrola dostępu (OWASP A01).
- **Na czym polega:** Kod wysłany osobie z waitlisty jest przypisany do jej e-maila. Przy usuwaniu konta (przez samą osobę lub przez admina) przypisanie jest czyszczone dla zgodności z RODO. Kod pozostaje jednak aktywny, więc staje się zwykłym kodem bez ograniczenia.
- **Skutek dla biznesu:** Ktoś, kto ma kod — przekazany mail, wspólna skrzynka, zrzut ekranu — dostaje plan nadany przez admina (w teście Team na 30 dni), mimo że zaproszenie było osobiste.
- **Dowód:** waitlista `xavier@…` → zaproszenie (Team, 30 dni) → Xavier zakłada konto bez kodu i je usuwa → `yvonne@…` wpisuje kod → **200, plan Team**.
- **Jak odtworzyć (bezpiecznie):** test `invite › personal (bound) invite unusable by others…` w `audyt/dyn.mjs`.
- **Jak naprawić:** zamiast odpinać, dezaktywować kod i zastąpić e-mail hashem:
  ```js
  db.run(`UPDATE invite_codes SET is_active = 0, bound_email = ?, label = 'Personal invite (deleted user)', updated_at = ?
          WHERE bound_email = ?`, `deleted:${sha256(user.email)}`, Date.now(), user.email);
  ```
  `deleted:<hash>` nigdy nie pasuje do prawdziwego e-maila, a przy okazji usuwa e-mail z etykiety (S11).
- **Jak sprawdzić naprawę:** ten sam test → 403.
- **Powiązane:** S11.

### [S2] Hasło może trafić do adresu URL — Średnie
- **Gdzie:** `web/login.html:25`, `web/signup.html:25`, `web/reset-password.html:24`, `web/admin/login.html:24`, `web/forgot-password.html:24`, `web/index.html:559` (waitlista).
- **Typ i kategoria:** Bezpieczeństwo · Ujawnienie danych (A04/A02).
- **Na czym polega:** Formularze nie mają `method`, więc przeglądarka domyślnie użyje GET. Moduł JS (`type="module"`) ładuje się z opóźnieniem. Jeśli ktoś szybko wpisze dane i naciśnie Enter albo JS się nie załaduje (blokada, błąd sieci, stara przeglądarka), formularz wyśle się zwykłym GET.
- **Skutek dla biznesu:** Hasło trafia do paska adresu, historii przeglądarki, logów serwera i proxy oraz ewentualnych narzędzi analitycznych w przyszłości. Formularz logowania admina ma ten sam problem.
- **Dowód:** Chrome z wyłączonym JS → `http://localhost:3592/login?email=victim%40audit.test&password=Secret-Password-123`.
- **Jak naprawić:** dodać do każdego formularza `method="post"` (dane nigdy nie trafią do URL), a `action` ustawić na `#` albo na stronę z komunikatem „Włącz JavaScript”. Ewentualnie wyłączyć przycisk do załadowania JS (`<button disabled>`, które `auth.js` włącza).
  ```html
  <form data-form="login" method="post" action="/login" novalidate>
  ```
  Serwer odpowiada na `POST /login` czytelnym 404 lub stroną informacyjną, bez przetwarzania danych.
- **Jak sprawdzić naprawę:** `node audyt/front.mjs` → `loginWithoutJs` bez `password=` w URL.

### [S3] Blokada konta przez obcą osobę i rozpoznawanie kont — Średnie
- **Gdzie:** `server/routes/auth.js:79-91` (`verifyLogin`, `LOCK_AFTER = 5`).
- **Typ i kategoria:** Bezpieczeństwo · Uwierzytelnianie (A07).
- **Na czym polega:** Po 5 błędnych hasłach konto jest blokowane na 15 minut dla wszystkich, także dla właściciela z poprawnym hasłem. Komunikat 429 „Too many failed attempts” pojawia się tylko dla istniejących kont. Dla nieistniejących jest zawsze 401.
- **Skutek dla biznesu:**
  - Konkurent lub złośliwiec może co 15 minut blokować konto admina (5 żądań) i całkowicie odciąć zarządzanie.
  - Może też sprawdzić, które adresy (np. klientów) mają konto.
- **Dowód:**
  - Istniejące konto: `401,401,401,401,401,429`, potem poprawne hasło → 429.
  - Nieistniejące konto: `401` × 6.
  - Konto admina: `401×5, 429…`.
- **Jak naprawić:**
  1. Blokować parę (konto + IP) zamiast samego konta. Pełną blokadę konta zostawić tylko przy bardzo dużej liczbie prób z wielu IP, z mailem do właściciela.
  2. Dla nieznanych e-maili liczyć próby tak samo (np. w limiterze pamięci po kluczu e-maila) i zwracać identyczny komunikat po przekroczeniu.
  3. Panel admina: osobna, łagodniejsza ścieżka oraz 2FA (S6), bo samo hasło nie wystarczy.
- **Jak sprawdzić naprawę:** `node audyt/rl.mjs` → oba ciągi identyczne, poprawne hasło z innego IP działa.

### [S4] Linki resetu hasła w logach i outboxie — Średnie
- **Gdzie:** `server/services/mailer.js:35` (`logger.info(... body: m.text)`), `GET /api/admin/outbox`.
- **Typ i kategoria:** Bezpieczeństwo / Konfiguracja · Logowanie danych wrażliwych (A09/A02).
- **Na czym polega:** Bez `SMTP_HOST` transport „log” wypisuje pełną treść każdego e-maila (także link resetu z tokenem) do stdout. Dzieje się tak również przy `NODE_ENV=production` — warunek wyłącza to tylko w testach. W trybie dev treść jest też zapisywana w `email_outbox`, a panel admina ją pokazuje. Redakcja w loggerze nie obejmuje pola `body`.
- **Skutek dla biznesu:**
  - Ktoś z dostępem do logów (hosting, narzędzie logów, współpracownik) może zresetować hasło dowolnej osoby i przejąć jej konto.
  - W dev admin może to zrobić z panelu.
- **Dowód:** `server2.log` zawiera `"body":"Someone (hopefully you) asked to reset the password…"` z linkiem. Outbox admina zawiera `reset-password?token=`.
- **Jak naprawić:** w produkcji bez SMTP odmówić startu (jak przy `APP_SECRET`) albo logować tylko metadane:
  ```js
  } else if (!config.isTest) {
    logger.info('email (log transport)', { to: m.to, subject: m.subject, ...(config.isProd ? {} : { body: m.text }) });
  }
  ```
  W `loadConfig`: `if (isProd && !env.SMTP_HOST) throw new Error('SMTP_HOST is required in production.')`. W outboxie ukrywać treść szablonów `password_reset` także w dev, a przycisk „pokaż” wpisywać do audytu.
- **Jak sprawdzić naprawę:** start z `NODE_ENV=production` bez SMTP → odmowa; w dev log bez tokenu resetu.

### [S5] Podatna wersja nodemailer — Średnie
- **Gdzie:** `package.json` → `nodemailer@^6` (zainstalowane 6.10.1).
- **Typ i kategoria:** Bezpieczeństwo · Łańcuch dostaw (A03).
- **Na czym polega:** `npm audit` zgłasza 2 wpisy „high” obejmujące ponad 20 advisory: wstrzykiwanie poleceń SMTP, obejście domeny odbiorcy przez komentarze i punycode, DoS parsera adresów, ujawnienie danych SMTP przez wspólny cache DNS.
- **Skutek dla biznesu:** Dziś ryzyko jest niskie, bo SMTP nie jest skonfigurowany, a adres odbiorcy przechodzi walidację e-mail w zod. Po włączeniu SMTP biblioteka parsuje adresy z formularzy, więc część tych błędów staje się osiągalna.
- **Jak naprawić:** `npm install nodemailer@^10` (zmiana major — sprawdzić `createTransport` i `sendMail`, API w tym projekcie jest proste), potem `npm audit --omit=dev` → 0.
- **Jak sprawdzić naprawę:** `npm audit --omit=dev`.

### [S6] Brak 2FA w panelu administratora — Średnie
- **Gdzie:** `server/routes/admin.js:39` (`/auth/login`).
- **Typ i kategoria:** Bezpieczeństwo · Uwierzytelnianie (A07).
- **Na czym polega:** Panel nadaje dostępy, generuje kody, usuwa konta i zmienia limity. Chroni go tylko hasło (plus osobna sesja, limit 10 prób na 15 min i blokada konta).
- **Skutek dla biznesu:** Wyciek lub zgadnięcie hasła admina (phishing, ponowne użycie hasła) daje pełną kontrolę nad dostępami i danymi.
- **Jak naprawić:** TOTP (RFC 6238, ok. 40 linii z `node:crypto`) z kodami zapasowymi, wymagany dla roli `admin`. Sekret szyfrowany kluczem z `APP_SECRET`. Wpisy w audycie przy włączeniu, wyłączeniu i nieudanym kodzie. Dodatkowo opcjonalna lista dozwolonych IP dla `/admin` w proxy.
- **Jak sprawdzić naprawę:** logowanie admina bez kodu → odmowa; test E2E z kodem z biblioteki TOTP.

### [C1] Brak testów i działającego lintu, typecheck i buildu — Średnie
- **Gdzie:** `package.json` (`lint`, `typecheck`, `build`, `seed:demo`, `test:e2e`), puste `test/`, `e2e/`, `docs/`.
- **Typ i kategoria:** Konfiguracja / jakość.
- **Na czym polega:** Skrypty w `package.json` wskazują brakujące pliki lub konfigurację. Nie ma testów regresji dla zabezpieczeń, które działają dziś.
- **Skutek dla biznesu:** Każda kolejna zmiana może po cichu zepsuć kontrolę dostępu albo limity — nikt tego nie wykryje przed klientem. Nie ma też wersji produkcyjnej ani instrukcji wdrożenia (README).
- **Jak naprawić:**
  1. Przenieść `audyt/dyn.mjs` do `test/integration` (uruchamiany przez `node --test` na serwerze z `DATABASE_PATH=:memory:`).
  2. Dodać testy jednostkowe silnika planowania i parsera demo.
  3. Dodać `eslint.config.js`, `tsconfig.json` (`checkJs`), `scripts/build.js` (esbuild) i README.
- **Jak sprawdzić naprawę:** `npm run check` przechodzi.

### [S7] Enumeracja kont przez rejestrację — Niskie
- **Gdzie:** `server/services/users.js:36`.
- **Na czym polega:** `POST /api/auth/signup` z istniejącym e-mailem → 409 „An account with this e-mail already exists.”. Limit 10 rejestracji na godzinę na IP spowalnia masowe sprawdzanie.
- **Jak naprawić:** zwracać tę samą odpowiedź co przy sukcesie („Sprawdź skrzynkę”) i wysyłać mail „masz już konto — zaloguj się lub zresetuj hasło”. To wymaga weryfikacji e-maila przed pierwszym logowaniem. Alternatywnie zaakceptować ryzyko (często spotykany kompromis) i wpisać to do rejestru ryzyk.

### [S8] Wyścig limitu AI w trybie live — Niskie (Do potwierdzenia)
- **Gdzie:** `server/services/ai/index.js:98-116`.
- **Na czym polega:** `usageToday` i limit globalny są sprawdzane przed `await live.interpret(...)`, a zużycie zapisywane po odpowiedzi modelu. N równoległych żądań przechodzi kontrolę zanim pierwsze się zapisze.
- **Skutek:** Przekroczenie limitu planu i limitu globalnego o liczbę równoległych żądań, ograniczoną przez limit 12/min na użytkownika. Koszt API wyższy niż zakładany.
- **Do potwierdzenia:** wymaga klucza API (nie testowane w trybie live).
- **Jak naprawić:** rezerwować użycie przed wywołaniem (wstawić wiersz `ai_usage` z `ok=0` w tej samej synchronicznej sekcji co sprawdzenie, potem go zaktualizować) albo trzymać licznik „w trakcie” per użytkownik.

### [S9] Domyślne zaufanie do proxy w produkcji — Niskie
- **Gdzie:** `server/config.js:64`.
- **Na czym polega:** W produkcji `trust proxy = 1`. Jeśli aplikacja zostanie wystawiona bez reverse proxy, klient może podać dowolne `X-Forwarded-For` i obchodzić limity per IP (logowanie, waitlista, reset hasła).
- **Jak naprawić:** domyślnie `false` i wymagać jawnego `TRUST_PROXY` w `.env` (opisane w README wdrożenia). Albo przy starcie ostrzegać, gdy `TRUST_PROXY` nie jest ustawione.

### [S10] Limity w pamięci procesu — Niskie
- **Gdzie:** `server/lib/rateLimit.js`.
- **Na czym polega:** Licznik jest w `Map`. Restart serwera zeruje limity, a kilka instancji ma osobne liczniki.
- **Jak naprawić:** przy skalowaniu przenieść liczniki do Redis lub SQLite (ten sam interfejs `hit()`). Blokada kont z S3 jest już w bazie.

### [S11] E-mail usuniętej osoby zostaje w danych — Niskie
- **Gdzie:** `server/routes/admin.js:385` (etykieta kodu `Waitlist: <e-mail>`), `:395` (`target_label` w dzienniku), `server/services/users.js:67-79` (anonimizacja nie obejmuje `target_type='waitlist'`).
- **Dowód:** po usunięciu konta w bazie zostają: wpis `waitlist.invited` z `target_label = xavier@…` i kod z etykietą `Waitlist: xavier@…`.
- **Jak naprawić:** w `deleteUser` anonimizować także `audit_logs` z `target_label = email` oraz `invite_codes.label LIKE 'Waitlist: ' || email` (razem z poprawką S1). Przy usuwaniu wpisu waitlisty przez admina robić to samo.

### [S12] Darmowe dostępy przez aliasy e-mail (gdy auto-grant włączony) — Niskie
- **Gdzie:** `server/routes/auth.js:132-139`.
- **Na czym polega:** Auto-grant przy rejestracji jest domyślnie wyłączony. Gdy admin go włączy (np. Pro na 14 dni), każdy alias (`ania+1@gmail.com`, kropki w Gmailu) to nowe konto z nowym dostępem.
- **Jak naprawić:** przechowywać znormalizowany e-mail (bez `+tag`, bez kropek dla gmail.com) jako unikalny klucz „jeden trial na osobę”. Ostrzegać w panelu przy włączaniu auto-grantu na płatny plan.

### [S13] Zmiana e-maila przez admina nie unieważnia sesji i linków resetu — Niskie
- **Gdzie:** `server/routes/admin.js:158`.
- **Na czym polega:** Tokeny resetu są związane z id konta. Link wysłany na stary adres nadal ustawia nowe hasło po zmianie e-maila na nowy.
- **Jak naprawić:** przy zmianie e-maila oznaczyć niewykorzystane `password_resets` jako użyte i zakończyć sesje użytkownika (jak przy zmianie roli). Wpis w audycie już powstaje.

### [B2] Zepsute kodowanie `%` → 500 — Niskie
- **Gdzie:** globalna obsługa błędów w `server/app.js`.
- **Dowód:** `GET /api/app/tasks/%E0%A4%A` → 500, w logu `URIError: Failed to decode param` z pełnym stosem. Strony i `/assets` przy tym samym wejściu odpowiadają poprawnie (404).
- **Jak naprawić:**
  ```js
  if (err instanceof URIError) e = new HttpError(400, 'bad_path', 'Malformed URL.');
  ```

### [B3] Lista zadań ucięta do 1000 — Niskie
- **Gdzie:** `server/services/tasks.js:95`.
- **Jak naprawić:** paginacja (`limit`/`offset` lub kursor) w `GET /api/app/tasks` i w UI, albo limit równy `plan.max_open_tasks`.

### [B5] Wyłączony plan nadal przyznawany — Niskie
- **Gdzie:** `server/services/access.js:92` (`grantAccess`), `getCurrentAccess`.
- **Jak naprawić:** w `grantAccess` i `createInvite` wymagać `is_active = 1`. Dla istniejących grantów zdecydować świadomie (zostawić do końca okresu) i opisać w panelu.

### [M3] Brakujące obrazy OG i ikony, domena w canonical — Niskie
- **Gdzie:** `web/index.html:6-23`.
- **Na czym polega:** `og.png` i `apple-touch-icon.png` → 404, więc udostępniony link nie ma podglądu. Canonical, OG, JSON-LD i adresy w treści wskazują `kedgely.app`, która nie jest zarejestrowana — ktoś inny może ją kupić i przejąć ruch z wyszukiwarek.
- **Jak naprawić:** wygenerować obrazy (np. zrzutem Playwright z szablonu). Zarejestrować domenę lub podmieniać ją przy buildzie z `BASE_URL`.

### [C2] HTTPS zależne od proxy — Niskie
- **Na czym polega:** Aplikacja nie przekierowuje HTTP→HTTPS. HSTS jest wysyłany tylko przy `COOKIE_SECURE`. Skan pasywny oznaczył to jako „HIGH”, ale dotyczy wdrożenia, nie lokalnego dev.
- **Jak naprawić:** w produkcji (`isProd && cookieSecure`) przekierować żądania z `X-Forwarded-Proto: http` na HTTPS. Opisać konfigurację proxy (Caddy/Nginx/Cloudflare) w README.

### [B4] `?next=` przepuszcza `..` — Informacyjne
- **Gdzie:** `web/assets/js/auth.js:10`.
- **Opis:** `/app/../../evil` → `/evil` na tej samej domenie. Nie jest to otwarte przekierowanie, ale reguła powinna normalizować ścieżkę: `new URL(next, location.origin)`, potem sprawdzić `origin` i `pathname.startsWith('/app')`.

### [C3] Brak `security.txt` i raportów CSP — Informacyjne
Dodać `/.well-known/security.txt` (kontakt `security@…`) oraz `report-to` / `report-uri` do CSP po wdrożeniu monitoringu.

### [C4] `node:sqlite` eksperymentalny — Informacyjne
Działa stabilnie w testach. Przed produkcją rozważyć `better-sqlite3` lub Postgres — wymiana dotyczy tylko `server/db/index.js`. Kopia zapasowa pliku bazy jest po stronie wdrożenia.

---

## 12. Pokrycie, plan naprawy i ponowny test

### 12.1 Pokrycie

| Obszar | Status | Uwagi |
|---|---|---|
| Inwentaryzacja | Pełna | z kodu; `map-routes.mjs` + ręczne prefiksy |
| Połączenia (68 API + 17 stron) | 68/68 API w pełni, 17/17 stron | dostawca AI i SMTP tylko w kodzie |
| Kontrola dostępu między użytkownikami | Pełna | 2 zwykłe konta, admin w dwóch zakresach sesji, konta bez dostępu, wygasłe i odebrane |
| Front oczami atakującego | Pełna dla istniejących stron | aplikacji i panelu admina nie ma (M1, M2) — ich front trzeba przebadać po zbudowaniu |
| Limity i brute force | Pełna (logowanie, admin, waitlista, reset, rejestracja, demo) | limit kodów (10/h) i AI (12/min) sprawdzone w kodzie, nie dynamicznie |
| Przegląd kodu | Wszystkie pliki `server/`, `web/assets/js/`, `scripts/` | zależności przez `npm audit`; brak Semgrep |
| Przepływy płatności | Nie dotyczy | płatności nie są podłączone |
| Tryb AI live | Tylko kod | brak klucza API — S8 „Do potwierdzenia” |
| TLS, DNS, nagłówki produkcyjne | Nie dotyczy | brak wdrożenia; nagłówki sprawdzone lokalnie |

### 12.2 Plan naprawy

- **Dziś:**
  - B1 (1 linia).
  - S1 + S11 (wspólna poprawka w `deleteUser`).
  - S2 (`method="post"` w 6 formularzach).
  - S4 (wymagać SMTP w produkcji, nie logować treści).
  - B2 (`URIError` → 400).
  - Czytelne 404 zamiast 500 dla brakujących stron (część M2).
- **W tym tygodniu:**
  - M1 i M2 — dokończyć aplikację i panel admina; potem ponownie przejść fazę 3 skilla na nowych widokach.
  - S5 — `nodemailer@^10`.
  - S3 — blokada konto+IP i jednakowe odpowiedzi.
  - C1 — testy z `audyt/dyn.mjs`, lint, typecheck, build, README.
  - S13.
- **W tym miesiącu:**
  - S6 — TOTP dla adminów.
  - S8 — rezerwacja zużycia AI.
  - S9/S10/C2 — konfiguracja produkcyjna i README wdrożenia.
  - B3, B5, M3, S12, S7 — decyzja o weryfikacji e-maila.
- **Stale:** `npm audit` w CI, testy regresji dla każdego problemu z tego raportu, przegląd dziennika admina, kopie zapasowe bazy, audyt po każdej większej zmianie.

**Sugerowane MCP** (faza 1b skilla — do Twojej decyzji, niczego nie instalowałem):
1. **Semgrep MCP** — deterministyczny skan SAST całego repo (reguły OWASP i sekretów), przyda się po dopisaniu aplikacji i panelu. `claude mcp add semgrep -- semgrep mcp` (wymaga Semgrep CLI; sprawdź polecenie w dokumentacji).
2. **Playwright MCP** — nie był potrzebny, bo lokalny Playwright + Chrome robił to samo.

### 12.3 Plan ponownego testu

1. Uruchomić izolowaną instancję (osobna `DATABASE_PATH`, inny port) i `ADMIN_PASSWORD=… npm run admin:create -- --email admin@audit.test`.
2. `node audyt/dyn.mjs http://localhost:<port> wyniki.json` → oczekiwane 326/326. Ten skrypt wymaga wyłączonych limitów (`RATE_LIMIT_DISABLED=true`).
3. `node audyt/rl.mjs http://localhost:<port>` na instancji z limitami → po poprawce S3 identyczne ciągi dla kont istniejących i nieistniejących.
4. `node audyt/front.mjs http://localhost:<port>` → brak `password=` w URL, `appShell.failedRequests` puste.
5. `npm audit --omit=dev` → 0; `npm run check` przechodzi.
6. Po zbudowaniu aplikacji i panelu: XSS w widokach admina (nazwy użytkowników, etykiety kodów, e-maile z waitlisty), przekierowania po wygaśnięciu sesji, ekran braku dostępu.

---

## 13. Czas pracy i tokeny

Policzone skryptem z zapisu sesji Claude Code (`usage` każdej odpowiedzi API, bez duplikatów). Czas aktywny to suma przerw krótszych niż 10 minut, więc czekanie na odpowiedź właściciela nie jest liczone.

| Etap | Od – do (UTC) | Czas aktywny | Wywołania API | Wywołania narzędzi | Tokeny wyjściowe (w tym myślenie) | Zapis do cache | Odczyt z cache | Wejście bez cache | Razem przetworzone |
|---|---|---|---|---|---|---|---|---|---|
| Budowa (do limitu użycia) | 24.11 22:11 – 22:52 | 0 h 41 min | 75 | 121 | 282 523 (49 370) | 347 254 | 15 521 225 | 156 | 16 151 158 |
| Audyt skillem 1 | 25.11 00:42 – 00:57 | 0 h 14 min | 28 | 40 | 87 787 (18 422) | 498 852 | 12 199 737 | 56 | 12 786 432 |
| **Razem** | | **0 h 55 min** | **103** | **161** | **370 310 (67 792)** | **846 106** | **27 720 962** | **212** | **28 937 590** |

„Nowe” tokeny (wejście bez cache + zapis do cache + wyjście): **1 216 628**. Odczyty z cache to wielokrotnie przesyłany ten sam kontekst rozmowy — są tańsze i nie oznaczają nowej treści. Stan na 00:57 UTC; samo podsumowanie w czacie po tej godzinie dokłada kilka tysięcy tokenów.

Załączniki: **`ZALACZNIKI-BEZPIECZENSTWA.md`** (A–F) oraz katalog **`audyt/`** (skrypty i surowe wyniki).
