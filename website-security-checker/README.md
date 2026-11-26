# 🛡️ Website Security Checker

Duży audyt **bezpieczeństwa i jakości** strony, sklepu albo aplikacji webowej.
Działa jak doświadczony pentester i code reviewer w jednym. Najpierw robi mapę
wszystkiego, w kilkanaście minut sprawdza 20 wpadek, które najczęściej kładą strony
budowane szybko (także przez AI), potem testuje **każdy** element mapy, czyta kod,
porównuje front z backendem, sprawdza płatności i triale, uruchamia aplikację
w ustawieniach produkcyjnych, a na końcu oddaje **długi raport** z gotowymi
poprawkami.

## Logika sprawdzania

1. **Najpierw mapa, potem testy.** Checklista odpalona „w ciemno” pomija zapomniany
   `/api/admin/export` albo tabelę Supabase bez RLS. Dlatego audyt zaczyna się od
   inwentaryzacji wszystkiego, co jest na stronie.
2. **Szybki triaż zaraz po mapie.** 20 najczęstszych wpadek (sekrety we froncie, baza
   otwarta dla świata, API bez logowania, sandbox płatności na produkcji, pliki z hasłami
   w repo…). Krytyczny problem trafia do Ciebie **od razu**, a nie dopiero w raporcie.
3. **Każde połączenie, nie próbka.** Każdy endpoint dostaje wynik w katalogu.
   To, czego nie sprawdzono, jest wypisane z powodem.
4. **Atakujący i recenzent naraz.** Szuka dziur, ale też zwykłych błędów logicznych
   (pieniądze na floatach, strefy czasowe, wyścigi, `"false"` zapisane jako zgoda).
5. **Konfiguracja produkcyjna.** Aplikacja uruchomiona lokalnie jak na produkcji: pełna,
   bez klucza płatności i za proxy. Wszystko ma się „zamykać”: żadnych płatności na
   niby ani linków resetu hasła w logach.
6. **Drugie przejście świeżym okiem** przed raportem: dziwne dane wejściowe, nadużycie
   zwykłych funkcji, wyścigi. Pierwsze fazy sprawdzają, co funkcja *ma* robić. To
   przejście sprawdza, na co *jeszcze* pozwala.
7. **Dowód albo „do potwierdzenia”.** Każdy problem jest odtworzony (żądanie
   i odpowiedź albo linia kodu i uruchomienie) albo wyraźnie oznaczony jako
   niepotwierdzony. Bez szumu ze skanerów.
8. **Raport powstaje od pierwszej minuty** i jest uzupełniany po każdej fazie, z blokiem
   „Stan audytu”. Gdy sesja się urwie (limit, zamknięty terminal), następna kontynuuje
   od następnego kroku.

## Kolejność pracy

| Faza | Co się dzieje |
|---|---|
| **0. Zakres** | co testujemy, w jakim trybie (sam adres, kod, konta testowe), co jest wyłączone; plik raportu z blokiem „Stan audytu” |
| **1. Mapa strony** | serwer, hosting, front, API, baza, CMS, sklep, logowanie, formularze, płatności, webhooki, upload, skrypty zewnętrzne, e-maile, subdomeny, AI, konfiguracja i tryby |
| **1b. Narzędzia MCP** | proponuje w jednej wiadomości MCP, które przyspieszą audyt i oszczędzą tokeny. Nic nie instaluje sam |
| **1c. Szybki triaż** | 20 najczęstszych wpadek, bezpieczne testy, 15–30 minut; krytyczne trafiają do Ciebie od razu |
| **2. Wszystkie połączenia** | katalog **każdego** endpointu, Server Action, WebSocketu, webhooka, crona i usługi zewnętrznej. Macierz testów: logowanie, role, IDOR, metody, walidacja, injection, zniekształcone dane, wycieki, CORS, CSRF, limity, cache, błędy |
| **3. Front oczami atakującego** | ukryte pola, wyłączone przyciski, flagi w `localStorage`, bezpośrednie wywołania API, pomijanie kroków, zdarzenia, które powinien tworzyć serwer, sekrety w bundlu, XSS, formularze wysłane przed załadowaniem JS |
| **4. Sugerowane ataki** | model zagrożeń i konkretne scenariusze dla tej strony, każdy przetestowany |
| **5. Bezpieczeństwo kodu** | dane od źródła do miejsca użycia, middleware na każdej trasie, sekrety i to, co jest w repo, zależności, znane CVE frameworków (np. Next.js 2025) |
| **6. Pełny przegląd kodu** | błędy logiczne i zwykłe: stany, wyścigi, pieniądze, VAT, strefy czasowe, parsowanie wartości logicznych, paginacja, cache, polskie znaki |
| **7. Front ↔ backend** | wywołania bez tras, trasy bez wywołań, różne pola i walidacja, inne kwoty, uprawnienia tylko w UI, stary kod z service workera po wdrożeniu |
| **8. Płatności, triale, subskrypcje** | każdy przepływ: **podłączony**, **logiczny**, **bezpieczny** (także równoległe użycie jednorazowego kodu) |
| **8b. Produkcja, drugie przejście, bramka pokrycia** | konfiguracja produkcyjna (pełna / bez klucza / za proxy), przejście „świeżym okiem”, sprawdzenie, że wszystko ma wynik |
| **9. Długi raport** | podsumowanie dla właściciela, tabela triażu, wszystkie problemy ze statusem dowodu, katalog połączeń, scenariusze, kod, rozbieżności, przepływy, konfiguracja produkcyjna, poprawki, pokrycie, plan naprawy i ponownego testu |
| **10. Naprawa** | na życzenie poprawia kod i ponownie uruchamia test (skrypty w `scripts/audit/`), który wykrył problem |

## Skrypty w zestawie (Node 18+, bez instalowania paczek)

| Skrypt | Co robi |
|---|---|
| `passive-scan.mjs <url>` | pasywny skan na żywo: HTTPS, nagłówki, ciasteczka, CORS, odsłonięte pliki (`.env`, `.git`, kopie, bazy SQLite, `sftp.json`, `.npmrc`, listing katalogów), source mapy, technologia, sekrety w JS (m.in. Stripe, Supabase `sb_secret_`, klucze AI, webhooki Discord/Slack), formularze z hasłem bez POST. Na `localhost` nie zgłasza fałszywie braku HTTPS |
| `map-routes.mjs <folder>` | trasy backendu z **pełnymi prefiksami montowania** (`app.use('/api/admin', auth, adminRoutes(deps))`, routery z funkcji, kilka routerów w pliku, zagnieżdżenia, Hono, Fastify) i wywołania z frontu (fetch, axios, wrappery `api.post('/x')` i `api('POST', '/x')`, formularze także w szablonach JS). Pokazuje wywołania bez tras, trasy bez wywołań, trasy bez autoryzacji i formularze z hasłem bez `method="post"` |
| `endpoint-matrix.mjs` | te same zapytania GET jako gość, użytkownik A, B i admin. Wykrywa IDOR, panel admina dla zwykłych kont, wrażliwe pola, odbijany CORS (także `Origin: null`), brak `no-store`. **Nigdy nie wysyła ciasteczek na inny host**, pomija GET-y, które coś zmieniają (wylogowanie, wypis, cron, płatność), obsługuje 429 |

Skrypty przetestowano na serwerze z celowo podłożonymi dziurami: wykryły każdą, ani
razu nie wywołały `/api/logout` i nie wysłały niczego na obcy host. `map-routes`
sprawdzono na obu projektach z testu porównawczego (w projekcie Express rozpoznał
6 z 6 routerów i 0 fałszywych „wywołań bez trasy”; wersja 1 rozpoznawała 0 routerów
i zgłaszała 3 fałszywe) oraz na projekcie z ponad 13 tys. plików.

## Co zmieniło się w wersji 2 (po teście porównawczym)

- Szybki triaż 20 wpadek z natychmiastowym zgłaszaniem krytycznych.
- Raport pisany na bieżąco z blokiem „Stan audytu”, odporny na przerwanie sesji.
- Faza 8b: konfiguracja produkcyjna, drugie przejście i bramka pokrycia (w teście drugie
  przejście znalazło 7 problemów, których nie było w pierwszym).
- Nowe działy katalogu kontroli: konfiguracja produkcyjna, proxy i higiena repo;
  pułapki frameworków 2025–2026; odporność i nadużycia zwykłych funkcji.
- Status dowodu przy każdym problemie (Potwierdzone / Do potwierdzenia).
- Poprawione i zabezpieczone wszystkie trzy skrypty.

## MCP, które może zaproponować

| Kiedy | MCP | Po co |
|---|---|---|
| dużo stron do przeklikania | Playwright MCP | prawdziwa przeglądarka, zapis ruchu sieciowego, tanie odczyty stron |
| błędy konsoli, wydajność | Chrome DevTools MCP | konsola, sieć, ślady wydajności |
| jest kod | Semgrep MCP, Trivy MCP, Snyk MCP | skan całego repo, zależności i sekretów |
| kod na GitHubie | GitHub MCP | alerty code scanning, Dependabot, secret scanning |
| Supabase | Supabase MCP (tylko odczyt) | RLS i zabezpieczenia wszystkich tabel w jednym wywołaniu |
| Firebase | Firebase MCP | reguły bezpieczeństwa i konfiguracja |
| Stripe | Stripe MCP (tryb testowy) | produkty, subskrypcje, triale, webhooki |
| baza SQL | DBHub (tylko odczyt) | schemat, ograniczenia, typy kwot |
| błędy produkcyjne | Sentry MCP | prawdziwe ślady błędów |

Każda propozycja ma uzasadnienie, komendę instalacji i bezpieczną konfigurację
(tylko odczyt, klucze testowe). Jeśli odmówisz, audyt idzie dalej innymi metodami.

## Bezpieczeństwo testów

Skill testuje tylko strony Twoje albo takie, na których test masz zgodę. Nie robi DoS
ani masowego brute force. Płatności sprawdza wyłącznie w sandboxie. Testy zmieniające
dane i testy wyścigów uruchamia na stagingu albo lokalnie, na własnych danych testowych.
Wycieki potwierdza minimalnie i ich nie pobiera. Sekrety maskuje. Lokalną kopię
aplikacji uruchamia z osobnym katalogiem danych i portem, a po testach ją zatrzymuje.

## Przykładowe polecenia

- „Zrób pełny audyt bezpieczeństwa mojego sklepu, kod jest w `C:\projekty\sklep`, adres to https://…”
- „Zbudowałem to w Lovable, sprawdź, czy dane klientów są bezpieczne”
- „Sprawdź, czy płatności BLIK i darmowy trial działają dobrze i czy da się je oszukać”
- „Znajdź błędy logiczne i rozbieżności między frontem a backendem”
- „Przetestuj wszystkie endpointy API na dostęp do cudzych danych, mam dwa konta testowe”

## Struktura

```
website-security-checker/
├── SKILL.md
├── references/
│   ├── recon.md                    # rozpoznanie i inwentaryzacja
│   ├── fast-triage.md              # 20 wpadek, które kładą szybko budowane strony
│   ├── connections.md              # katalog połączeń + macierz testów
│   ├── frontend-attack-surface.md  # co może zrobić odwiedzający w przeglądarce
│   ├── attack-scenarios.md         # model zagrożeń i biblioteka scenariuszy
│   ├── checks.md                   # katalog testów (OWASP Top 10:2025) + produkcja, frameworki, nadużycia
│   ├── code-review.md              # bezpieczeństwo kodu + błędy logiczne
│   ├── front-back-consistency.md   # rozbieżności front ↔ backend
│   ├── business-flows.md           # płatności, triale, subskrypcje, rabaty, e-maile
│   ├── ecommerce-cms.md            # sklepy, bramki PL, CMS, Supabase/Firebase
│   ├── mcp-toolkit.md              # MCP: kiedy, po co, jak zainstalować
│   └── report-template.md          # szablon długiego raportu + skala ważności
└── scripts/
    ├── passive-scan.mjs
    ├── map-routes.mjs
    └── endpoint-matrix.mjs
```
