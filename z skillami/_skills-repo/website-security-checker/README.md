# 🛡️ Website Security Checker

Duży audyt **bezpieczeństwa i jakości** strony, sklepu albo aplikacji webowej.
Działa jak doświadczony pentester i code reviewer w jednym. Najpierw robi mapę
wszystkiego, potem testuje **każdy** element mapy, czyta kod, porównuje front
z backendem, sprawdza płatności i triale, a na końcu oddaje **długi raport**
z gotowymi poprawkami.

## Kolejność pracy

| Faza | Co się dzieje |
|---|---|
| **0. Zakres** | co testujemy, w jakim trybie (sam adres, kod, konta testowe), co jest wyłączone z testów |
| **1. Mapa strony** | serwer, hosting, front, API, baza, CMS, sklep, logowanie, formularze, płatności, webhooki, upload, skrypty zewnętrzne, e-maile, subdomeny, AI |
| **1b. Narzędzia MCP** | po rozpoznaniu technologii proponuje w jednej wiadomości MCP, które przyspieszą audyt i oszczędzą tokeny. Nic nie instaluje samodzielnie |
| **2. Wszystkie połączenia** | katalog **każdego** endpointu, WebSocketu, webhooka, crona i usługi zewnętrznej, niezależnie od ich liczby. Każde połączenie przechodzi macierz testów: logowanie, role, IDOR, metody, walidacja, injection, wycieki, CORS, CSRF, rate limit, cache, błędy |
| **3. Front oczami atakującego** | co odwiedzający może zrobić we własnej przeglądarce: ukryte pola, wyłączone przyciski, flagi w `localStorage`, bezpośrednie wywołania API, pomijanie kroków, sekrety w bundlu i source mapach, XSS |
| **4. Sugerowane ataki** | model zagrożeń (bot, spamer, łowca okazji, oszust, ciekawski klient, konkurent, przejęty skrypt) i konkretne scenariusze dla tej strony, każdy przetestowany |
| **5. Bezpieczeństwo kodu** | śledzi dane od źródła (żądanie, webhook, plik) do miejsca użycia (zapytanie SQL, HTML, powłoka, przekierowanie), sprawdza middleware na każdej trasie, sekrety w historii gita i zależności |
| **6. Pełny przegląd kodu** | **błędy logiczne i zwykłe błędy:** warunki, stany zamówień, wyścigi, pieniądze na floatach, VAT, strefy czasowe i zmiana czasu, nieobsłużone promisy, paginacja, cache, wycieki pamięci, polskie znaki |
| **7. Front ↔ backend** | wywołania tras, które nie istnieją, trasy bez wywołań (zapomniane admin/debug), różne nazwy pól i typy, różna walidacja, inna kwota na froncie i inna pobrana, uprawnienia widoczne w UI, ale niewymuszane przez serwer |
| **8. Płatności, triale i subskrypcje** | każdy przepływ sprawdzany na trzech poziomach: **podłączony** (klucze, webhooki, środowiska, e-maile), **logiczny** (każda ścieżka: porażka, duplikat, koniec triala, zwrot), **bezpieczny** (podmiana planu, triale na aliasy e-mail, łączenie kodów rabatowych) |
| **9. Długi raport** | podsumowanie dla właściciela, wszystkie problemy, pełny katalog połączeń z wynikami, scenariusze, kod, rozbieżności, tabela przepływów, szczegóły z poprawkami, pokrycie, plan naprawy i ponownego testu, załączniki |
| **10. Naprawa** | na życzenie poprawia kod i jeszcze raz uruchamia test, który wykrył problem |

## Dopasowanie do sytuacji

Inaczej pracuje, gdy ma sam adres strony, inaczej z samym kodem, a inaczej z jednym
i drugim. Osobno podchodzi do aplikacji z setkami endpointów, do SPA i backendu
aplikacji mobilnej, do WordPressa, WooCommerce i PrestaShop, do Shopify, Wix
i Webflow, do Supabase i Firebase, do sytuacji bez kont testowych i do testów tylko
na produkcji.

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
| Burp Suite | Burp MCP | historia proxy, modyfikacja żądań |

Każda propozycja ma uzasadnienie, komendę instalacji i bezpieczną konfigurację
(tylko odczyt, klucze testowe). Jeśli odmówisz, audyt idzie dalej innymi metodami.

## Skrypty w zestawie (Node 18+, bez instalowania paczek)

| Skrypt | Co robi |
|---|---|
| `passive-scan.mjs <url>` | pasywny skan strony na żywo: HTTPS, nagłówki, ciasteczka, CORS, odsłonięte pliki (`.env`, `.git`, kopie zapasowe, source mapy), technologia, klucze w JS, endpointy, formularze |
| `map-routes.mjs <folder>` | wyciąga z kodu trasy backendu (Express, Fastify, surowy Node http, Next.js, Nuxt, SvelteKit, PHP) i wywołania z frontu (fetch, axios, XHR, jQuery, WebSocket, formularze). Pokazuje **wywołania bez tras**, **trasy bez wywołań** i trasy bez widocznej autoryzacji |
| `endpoint-matrix.mjs` | wysyła te same zapytania jako gość, użytkownik A, użytkownik B i admin, tylko GET. Wykrywa IDOR, panel admina dostępny dla zwykłych kont, wrażliwe pola w JSON-ie, odbijany CORS, stack trace'y i brak `no-store` |

Wszystkie trzy zostały przetestowane na serwerach z celowo podłożonymi dziurami
i wykryły każdą z nich. `map-routes` sprawdzono też na prawdziwym projekcie z ponad
13 tys. plików.

## Bezpieczeństwo testów

Skill testuje tylko strony Twoje albo takie, na których test masz zgodę. Nie robi DoS
ani masowego brute force. Płatności sprawdza wyłącznie w sandboxie. Testy zmieniające
dane uruchamia na stagingu albo na własnych danych testowych. Wycieki potwierdza
minimalnie i ich nie pobiera. Sekrety maskuje. Gdy uruchamia aplikację lokalnie, robi
to w izolowanym stanie.

## Przykładowe polecenia

- „Zrób pełny audyt bezpieczeństwa mojego sklepu, kod jest w `C:\projekty\sklep`, adres to https://…”
- „Sprawdź, czy płatności BLIK i darmowy trial działają dobrze i czy da się je oszukać”
- „Znajdź błędy logiczne i rozbieżności między frontem a backendem”
- „Przetestuj wszystkie endpointy API na dostęp do cudzych danych, mam dwa konta testowe”

## Struktura

```
website-security-checker/
├── SKILL.md
├── references/
│   ├── recon.md                    # rozpoznanie i inwentaryzacja
│   ├── connections.md              # katalog połączeń + macierz testów
│   ├── frontend-attack-surface.md  # co może zrobić odwiedzający w przeglądarce
│   ├── attack-scenarios.md         # model zagrożeń i biblioteka scenariuszy
│   ├── checks.md                   # katalog testów (OWASP Top 10:2025)
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
