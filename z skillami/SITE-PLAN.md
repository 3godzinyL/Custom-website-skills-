# SITE-PLAN — Ogarnij
Prowadzi: website-maker · Brief: `SITE-BRIEF.md` (website-strategist, 2026-11-24)

## Wybór
**Opcja 4 — tryb ostateczny** + wszystkie propozycje ze strategista (1–7).
Data wyboru: 2026-11-24.

## Zakres (checklista)

### Fundament + opcja 1 (front)
- [x] Strona główna: 13 sekcji z briefu (hero → stopka)
- [x] Makiety telefonów w HTML/CSS (hero: pętla głos → zadania → oś dnia)
- [x] P1 Demo „Wypróbuj na sucho” (parser w przeglądarce, bez sieci)
- [x] P3 Dyktowanie w demo (Web Speech API, ukryte gdy brak wsparcia)
- [x] P7 Sekcja „Co robi AI, a czego nie”
- [x] SEO: title/description, OG 1200×630, schema (SoftwareApplication, Organization, FAQPage), sitemap, robots, canonical, hreflang
- [x] Dostępność WCAG 2.2 AA, reduced motion

### Opcja 2 (backend)
- [x] Node 22, `node:http` + `node:sqlite`, zero zależności runtime
- [x] Waitlista: double opt-in, token 72 h, normalizacja e-maila, honeypot, rate limit
- [x] P2 Pozycja w kolejce + link polecający (−5 miejsc za potwierdzone polecenie)
- [x] P4 Licznik zapisów (od 100, zaokrąglony)
- [x] P5 Ankieta 1-pytaniowa po zapisie
- [x] Wypis jednym kliknięciem (link w każdym e-mailu)
- [x] Poradnik (blog) z bazy: lista + artykuł, edycja w panelu
- [x] Analityka bez ciasteczek (własny endpoint zdarzeń, agregaty)
- [x] Nagłówki bezpieczeństwa (CSP, HSTS w prod, nosniff, frame-ancestors)
- [x] E-maile: outbox (dev) / SMTP (env)

### Opcja 3 (panel + płatności)
- [x] P6 `/admin`: logowanie (scrypt), sesje HttpOnly, CSRF, opcjonalne 2FA TOTP
- [x] Role: owner / editor / viewer; log działań
- [x] Pulpit: zapisy dziennie, potwierdzenia, polecenia, ankieta, lejek zdarzeń
- [x] Lista zapisów: filtr, szukaj, eksport CSV, usunięcie (RODO)
- [x] Przedsprzedaż „Pakiet założycielski” (Plus na rok) — sandbox lokalny lub Stripe (env)
- [x] Opłacone tylko z webhooka z weryfikacją podpisu, kwoty i waluty
- [x] Kody rabatowe (panel), cena liczona na serwerze
- [x] E-maile transakcyjne: zamówienie, płatność, zwrot
- [x] Potwierdzenie zamówienia do druku; regulamin przedsprzedaży, odstąpienie 14 dni

### Opcja 4 (ostateczna)
- [x] Wersja EN (`/en/`) + hreflang
- [x] Test A/B nagłówka hero (wyniki w panelu, test istotności)
- [x] Automatyczne e-maile (sekwencja: powitanie, dzień 3, dzień 7) — kolejka + harmonogram
- [x] PWA: manifest, service worker, strona offline, ikony
- [x] Monitoring: `/healthz`, log błędów serwera i frontu, zakładka „Zdrowie” w panelu
- [x] Kopie bazy (`VACUUM INTO`) codziennie + `npm run backup`
- [x] Testy automatyczne (`node --test`): jednostkowe + integracyjne; e2e Playwright (skrypt)
- [x] CI: GitHub Actions (`npm test`)

### Poza zakresem (świadomie)
- Asystent AI na stronie — produkt jest fikcyjny; demo w przeglądarce pełni tę rolę.
- Prawdziwe faktury/KSeF — fikcyjna firma; „potwierdzenie zamówienia” zamiast faktury.
- Prawdziwa wysyłka SMTP i prawdziwe klucze Stripe — konfiguracja przez env.

## Mapa strony
| URL | Status |
|---|---|
| `/` , `/en/` | ☐ |
| `/dziekujemy` | ☐ |
| `/potwierdz?token=` | ☐ |
| `/kolejka?key=` | ☐ |
| `/poradnik`, `/poradnik/:slug` | ☐ |
| `/zamow` (przedsprzedaż), `/zamowienie/:id?key=` | ☐ |
| `/platnosc-testowa/:id` (sandbox) | ☐ |
| `/prywatnosc`, `/zasady-listy`, `/regulamin-przedsprzedazy` | ☐ |
| `/wypisz?key=` | ☐ |
| `/offline`, `/404` | ☐ |
| `/admin` (+ podstrony) | ☐ |

## Stack i decyzje
- Node 22.13 (wbudowany `node:sqlite` bez flagi), `node:http`, bez frameworka i bez zależności runtime → mniejsza powierzchnia ataku.
- Front: statyczny HTML/CSS/vanilla JS, tokeny w `public/css/tokens.css` (kontrakt z website-design).
- Szablony stron po stronie serwera: proste funkcje JS (escapowanie domyślne).

## Postęp
- 2026-11-24: brief przyjęty, opcja 4 wybrana, plan utworzony.
- 2026-11-24: 3 dema designu w design-demos/ (sprawdzone 390/1440 px) — czeka na wybór.
- 2026-11-24: backend gotowy (waitlista, polecenia, ankieta, wypis, płatności sandbox/Stripe, kody, panel API z rolami/2FA/CSRF/audytem, analityka, A/B, kolejka maili + drip, kopie, sprzątanie RODO). npm test: 45/45. 

- 2026-11-25: wybrane demo 1 (Nocny plan). Zbudowane wszystkie strony PL/EN, demo z dyktowaniem, panel, PWA, e2e 67/67.
- 2026-11-25: website-security-checker — 19 problemów: 16 naprawionych i przetestowanych ponownie, 1 częściowo (B6), 2 otwarte (P1 fonty Google, P2 stałe linki) + infrastruktura.
- 2026-11-25: przebieg 2 audytu (bez poprawek) — regresja 17/17 OK; 7 nowych otwartych (S5 średnie: zniekształcone %-kodowanie → 500 i zapis błędów; L5–L8 niskie; I1–I2 info). Łącznie 26: 16 naprawionych, 1 częściowo, 9 otwartych. npm test 46/46. Raport: RAPORT-BEZPIECZENSTWA.md.

## Otwarte przed startem
- Fonty na własnym serwerze (P1), Stripe test na stagingu, SPF/DKIM/DMARC, szyfrowane kopie poza serwerem, 2FA na kontach usług.

## Placeholdery
- `[DO UZUPEŁNIENIA: kontakt@…]`, dane firmy (nazwa, NIP, adres) — projekt fikcyjny.

## Treści potrzebne od właściciela
- Brak wymaganych (projekt fikcyjny). Opcjonalnie: logo, prawdziwy e-mail kontaktowy.

## MCP
- Zaproponowano Playwright MCP; używany lokalnie `playwright-core` + Chrome (bez instalacji MCP).

## Pytania otwarte
- Brak (kierunek wybrany: demo 1).
