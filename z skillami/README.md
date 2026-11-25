# Ogarnij — landing page startupu z AI

Strona fikcyjnej aplikacji „Ogarnij” (planer dnia sterowany polskim głosem): prezentacja produktu, interaktywne demo, lista oczekujących z poleceniami, przedsprzedaż i panel właściciela. Powstała z użyciem skilli: website-strategist → website-maker (opcja 4) + website-design → website-security-checker.

## Uruchomienie

Wymaga **Node.js 22.13+** (wbudowane SQLite). Brak zależności do instalowania.

```powershell
npm start            # http://127.0.0.1:3700, panel: /admin
npm test             # 46 testów (izolowana baza tymczasowa)
npm run backup       # ręczna kopia bazy do data/backups
```

Przy pierwszym starcie powstaje konto właściciela panelu, a dane logowania trafiają do `data/PIERWSZE-LOGOWANIE.txt`. Zmień hasło w **Panel → Moje konto** i usuń ten plik. Możesz też ustawić `ADMIN_EMAIL` i `ADMIN_PASSWORD` w `.env` przed pierwszym startem.

Bez konfiguracji:
- e-maile są zapisywane do `data/outbox/` (HTML + JSON) zamiast wysyłki,
- płatności działają w trybie **sandbox** (`/platnosc-testowa/...`): podpisany webhook, bez pieniędzy.

Konfiguracja produkcyjna: skopiuj `.env.example` do `.env` (Resend do maili, klucze Stripe w trybie testowym `sk_test_…`, `BASE_URL`, `TRUST_PROXY=1` za proxy).

## Co jest gdzie

| Ścieżka | Co robi |
|---|---|
| `server.js` | start serwera |
| `src/app.js` | trasy: strony, API, webhooki |
| `src/waitlist.js` | zapis, potwierdzenie, kolejka, polecenia, ankieta, wypis |
| `src/payments.js` | przedsprzedaż, kody, sandbox/Stripe, webhooki |
| `src/admin.js` | API panelu: logowanie, 2FA, role, CSRF, eksport, audyt |
| `src/emails.js` | szablony PL/EN, kolejka, sekwencja (dzień 0/3/7) |
| `src/analytics.js` | zdarzenia bez ciasteczek, test A/B (z-test) |
| `src/jobs.js` | wysyłka maili, sprzątanie RODO, codzienna kopia |
| `src/pages/*` | szablony stron (PL/EN), treści strony głównej w `landing-copy.js` |
| `public/` | CSS (tokeny + strona + panel), JS strony i panelu, PWA |
| `test/` | testy `node --test` |
| `scripts/e2e.mjs` | test w prawdziwej przeglądarce (wymaga `playwright-core`) |

## Edycja treści

- Teksty strony głównej (PL i EN): `src/pages/landing-copy.js`.
- Warianty nagłówka testu A/B: `h1.a / h1.b / h1.c` w tym samym pliku. Wymuszenie podglądu: `/?v=b`.
- Poradnik: w panelu (**Poradnik**), Markdown w podstawowym zakresie.
- Kody rabatowe: w panelu (**Kody rabatowe**).
- Dokumenty prawne (szkice): `src/pages/legal.js`.

## Placeholdery do uzupełnienia

- Dane firmy (nazwa, NIP, adres) w stopce i dokumentach prawnych (`[DO UZUPEŁNIENIA]`).
- Adres kontaktowy `kontakt@ogarnij.example`, nadawca maili `MAIL_FROM`.
- Domena (`BASE_URL`), fonty na własnym serwerze (zob. `DESIGN-SYSTEM.md`).

## Produkcja — zasady bezpieczeństwa

- `NODE_ENV=production` wymaga `BASE_URL`. Bez kluczy Stripe przedsprzedaż jest **wyłączona**, a bramki testowej nie ma. Sandbox można świadomie włączyć tylko przez `ALLOW_SANDBOX_PAYMENTS=1`, np. na stagingu.
- `TRUST_PROXY=1` ustawiaj tylko wtedy, gdy Node jest dostępny wyłącznie przez Twoje proxy TLS. Aplikacja bierze ostatni adres z `X-Forwarded-For`. Przy kilku proxy w łańcuchu skonfiguruj proxy tak, żeby nadpisywało ten nagłówek.
- Za proxy żądania HTTP dostają przekierowanie 308 na `BASE_URL` (HTTPS), a odpowiedzi mają nagłówek HSTS.
- Pełny raport: `RAPORT-BEZPIECZENSTWA.md` (+ `ZALACZNIKI-BEZPIECZENSTWA.md`). Scenariusze do ponownego testu: `scripts/audit/` (wymagają lokalnego serwera QA na porcie 3710 i serwera w trybie produkcyjnym na porcie 3711, z osobnymi katalogami `DATA_DIR`).
