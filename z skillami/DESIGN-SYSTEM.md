# Design system — Ogarnij

## Koncept
„Z chaosu w oś czasu.” Strona robi to samo co produkt: nieuporządkowane słowa (transkrypcja głosu) układają się w czystą, rytmiczną oś dnia. Ciemne tło jak w inspiracji (FlyTask), ale z jednym zdecydowanym kolorem akcji zamiast fioletowej poświaty.

## Kierunek (wybrane demo: 1 · Nocny plan)
Wybór właściciela: 2026-11-25. Źródło: `design-demos/demo-1-nocny-plan.html`. Bez zmian względem dema poza rozbudową o komponenty podstron i panelu.

## Kolory (rola · hex · para kontrastu · wynik)
| Token | Hex | Użycie | Kontrast |
|---|---|---|---|
| `--color-bg` | #0f0e17 | tło | tekst 17:1 |
| `--color-surface` | #191823 | sekcje, karty | tekst 15,6:1, muted 7,4:1 |
| `--color-surface-2` | #23212f | wnętrza kart, kafelki | — |
| `--color-text` | #f4f1ea | tekst | 17:1 na bg |
| `--color-text-muted` | #aaa6b8 | opisy | 8,1:1 na bg |
| `--color-primary` | #ff6b4a | **jedyny kolor akcji** (CTA, wyróżnienia) | 6,8:1 na bg; ciemny tekst na nim 6,8:1 |
| `--color-accent` | #7fe0c2 | oś czasu, „zrobione”, eyebrow | 12,2:1 na bg |
| `--color-error` | #ff7a7a | błędy | 7,6:1 na bg |
| `--color-focus` | #ffc861 | obrys fokusu | widoczny na bg i na koralu |
| role pomocnicze | header-bg, border-strong, device-edge, text-soft, on-primary-* | patrz tokens.css | sprawdzone AA |

Zasada: koral tylko dla akcji i jednego wyróżnienia w nagłówku. Mięta tylko dla czasu i „zrobione”.

## Typografia
- Nagłówki: **Bricolage Grotesque** 700–800, `letter-spacing: -0.03em`, `line-height: 1.02`.
- Tekst: **Manrope** 400–700, `line-height: 1.6`, max ~65ch.
- Czas, etykiety, eyebrow: **JetBrains Mono** 500.
- Skala płynna `--step--1 … --step-5` (Utopia, 360→1440 px). Wszystkie fonty z latin-ext (sprawdzone „Zażółć gęślą jaźń”).
- Polskie zasady: „cudzysłowy”, twarda spacja po jednoliterowych spójnikach w nagłówkach (`z&nbsp;tego`).
- **Do zrobienia przed produkcją:** fonty są ładowane z Google Fonts (CSP dopuszcza tylko fonts.googleapis.com i fonts.gstatic.com). Przenieść pliki woff2 na własny serwer (RODO) i usunąć te dwa hosty z CSP w `src/http.js`.

## Odstępy, siatka, promienie, cienie
- Odstępy 4/8/12/16/24/32/48/64/96/128 (`--space-1…10`), sekcje `--section-y` (płynnie 64→128 px).
- Kontener 1200 px, wąski 760 px, margines `--gutter` 16→32 px.
- Promienie: 8 / 14 / 24 / pigułka; telefony `--radius-xl` 42 px (i 33/26 px ekranu — koncentrycznie).
- Cienie: `--shadow-1` (drobne), `--shadow-2` (telefony). Jedno źródło światła z góry.

## Ruch
- Wejścia: opacity + translateY 16 px, 600 ms `--ease-out`, raz na element (IntersectionObserver).
- Problem: przekreślenia rysowane przy przewijaniu (900 ms).
- Hero: pętla telefonu — transkrypcja „pisze się”, potem zadania wskakują na oś (9 s), tylko gdy hero jest widoczne.
- Plan B: bloki zmieniają szerokość, „Zakupy” zjeżdżają na jutro.
- `prefers-reduced-motion`: wszystkie animacje wyłączone, pokazywany stan końcowy.

## Ikony i obrazy
- Jeden zestaw: kreska w stylu Lucide, 2 px, inline SVG (`src/pages/layout.js → icon()`).
- Brak zdjęć stockowych i AI: wizualizacje to makiety interfejsu w HTML/CSS (czytelne, lekkie, bez LCP z obrazu).

## Komponenty (lista + stany)
- Przycisk: primary / secondary / ghost / dark / sm — hover, active (scale .97), focus, disabled, busy.
- Pole: input (zwykły, pigułka), textarea, select, checkbox — hover, focus, `aria-invalid`, komunikat błędu `role="alert"`.
- Formularz zapisu (hero, CTA) z honeypotem i stanami: walidacja, wysyłanie, błąd limitu, błąd serwera.
- Telefon (`.phone`), slot osi dnia (zwykły / stały), wiersz „zrobione”, lista kroków.
- Karta planu cenowego (zwykła / wyróżniona obrysem), przełącznik okresu.
- FAQ (`<details>`), kafel „Dla kogo”, lista faktów (`<dl>`), kolumny AI tak/nie.
- Podstrony: karta statusu (kolejka, zamówienie), duża liczba, wiersz kopiowania, chipy ankiety, podsumowanie zamówienia, odznaki statusów, notice.
- Panel (`admin.css`): ten sam system tokenów w gęstszej skali; KPI, tabele, paski, wykres słupkowy.

## Rytm sekcji strony głównej
hero (bg) → problem (linia, wąsko) → jak działa (linia, 3 kolumny) → demo (surface) → funkcje (bg, naprzemiennie) → Plan B (linia, pełna szerokość) → dla kogo (bg, 3 kolumny z liniami) → prywatność (surface) → cennik (bg) → mapa drogowa (linia) → FAQ (linia, wąsko) → CTA (koral) → stopka.

## Zakazy (AI slop i inne)
Fioletowo-niebieskie gradienty, świecące bloby, glassmorphism, gradientowy tekst, emoji jako ikony, trzy identyczne karty z ikoną w kółku, bento dla samego bento, plakietki nad każdym nagłówkiem, stockowi ludzie z laptopami, zmyślone loga, opinie i liczby (licznik zapisów tylko prawdziwy, od 100), fade-up na wszystkim, scroll-jacking, styl inline (blokuje CSP).

## Wyjątki od tokenów (świadome)
- Miniaturowy interfejs w makietach telefonów: 10–12 px tekstu i 3/6/8 px odstępów — skala urządzenia, nie strony.
- Kolory wydruku (`@media print`): biel/czerń.
- Audyt: `node _skills-repo/website-design/scripts/consistency-audit.mjs public/css --tokens public/css/tokens.css` — 0 kolorów poza tokenami (poza wydrukiem), wszystkie pary AA.

## Dziennik decyzji
- 2026-11-24 — 3 dema (Nocny plan, Papierowy terminarz, Śliwka bez poświaty).
- 2026-11-25 — wybrane demo 1. Fonty z Google Fonts (właściciel nie chciał pobierania plików); self-hosting przed produkcją.
- 2026-11-25 — usunięta etykieta „najczęściej wybierany w testach” (brak danych) → „polecany”.
