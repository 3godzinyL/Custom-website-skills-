# Master build prompt: template and writing rules

## Writing rules
1. **Complete.** A builder AI should be able to finish the site without asking
   questions. Unknowns become explicit `ZAŁOŻENIE:` lines.
2. **Explicit placement.** For every section: position on the page, width (container/
   full-bleed), columns per breakpoint, alignment, order on mobile, sticky behaviour.
3. **Real draft copy.** Headlines, sublines, CTA labels, microcopy and FAQ answers in the
   audience's language, specific to the business. The builder may polish, not invent.
4. **Measurable acceptance criteria** per section and per flow ("formularz wysyła e-mail
   do właściciela i zapisuje rekord; błąd pokazuje komunikat pod polem").
5. **Design is specified, not described with adjectives.** Hex values, contrast pairs,
   font names with weights, type scale, spacing scale, radii, motion durations, icon set.
6. **Prohibitions are explicit** (anti-AI-slop list, fake content ban).
7. **Order of work and checkpoints**, so long builds stay on track.
8. Prefer lists and tables over prose; keep each section self-contained.

## Template

Copy everything below into the final prompt and fill every part. Replace `<…>`.

````markdown
# ZADANIE: Zbuduj stronę <nazwa> — <typ strony> dla <odbiorca>

## 0. Twoja rola i zasady pracy
You are a senior full-stack developer and product designer. Build the website specified
below exactly, at production quality. Work page by page in the order given in section 20;
after each checkpoint, show what you built (screenshots if you can) and wait for
confirmation if the user is present. Never invent facts, reviews, statistics, logos or
certificates; use marked placeholders. All user-facing text is in <język>, with correct
Polish diacritics.

## 1. Projekt w skrócie
- Firma / marka: <nazwa, czym się zajmuje, od kiedy, gdzie>
- Oferta: <lista produktów/usług z cenami lub widełkami>
- Odbiorca: <kto, skąd, potrzeby, obawy>
- Rynek / obszar: <…>
- Główny cel strony: <akcja konwersji>; cele dodatkowe: <…>
- Wyróżniki (USP, konkretne): <…>
- Konkurencja i wzorce: <strony + co z nich bierzemy / czego unikamy>
- Mierniki sukcesu: <np. 30 zapytań/mies., konwersja 2%>

## 1b. Kategoria teraz (z radaru, stan na <RRRR-MM-DD>)
- Teza strony: <jedno zdanie>
- Standard kategorii (musi być): <lista — każda strona tego typu to ma>
- Fala (sygnały ostatnich miesięcy) i jak je wykorzystujemy: <sygnał → sekcja/funkcja/treść>
- Luki, które zajmujemy: <…>
- Wybrany kierunek: <nazwa i obietnica> · Zaakceptowane pomysły: <#…> · Odrzucone (nie dodawaj): <#…>
- Słowa kluczowe → strony: <fraza → gdzie>
- Pytania odbiorców → FAQ / poradniki: <…>

## 2. Język i ton
- Ton: <np. rzeczowy, ciepły, pewny siebie; na „Ty” / „Państwo”>
- Zasady: konkrety zamiast przymiotników; krótkie zdania; liczby tylko prawdziwe;
  polskie cudzysłowy „…”; twarde spacje po jednoliterowych spójnikach.
- Zakazane frazy: „kompleksowe rozwiązania”, „pasja i profesjonalizm”, „Odkryj”,
  „przenieś na wyższy poziom”, „najwyższa jakość w przystępnej cenie”, „Twój zaufany
  partner”, „indywidualne podejście”, emoji w nagłówkach, wykrzykniki.

## 3. Kierunek designu
- Koncept (2–3 zdania): <idea wynikająca z biznesu>
- Paleta (z kontrastem):
  | Token | Hex | Użycie | Para kontrastu |
  |---|---|---|---|
  | --color-bg | <#…> | tło | tekst <#…> = <x:1> |
  | --color-primary | <#…> | przyciski, akcenty | tekst na nim <#…> = <x:1> |
  | … | | | |
- Typografia: nagłówki <font, wagi>, tekst <font, wagi> — obie z polskimi znakami
  (sprawdzone „Zażółć gęślą jaźń”); skala fluid `clamp()` od <…> do <…>; body <px>,
  line-height <…>, max 65ch.
- Odstępy: skala 4/8/12/16/24/32/48/64/96/128 px; promienie <…>; cienie <…>.
- Siatka: 12 kolumn, kontener <px>, marginesy mobile <px>.
- Ikony: <Lucide/Phosphor/…>, stroke <…>, rozmiary <…>.
- Zdjęcia: <styl, proporcje, obróbka>; placeholdery oznaczone.
- Ruch: wejścia 200–400 ms ease-out `cubic-bezier(0.22,1,0.36,1)`, hover 150 ms, tylko
  transform/opacity, `prefers-reduced-motion` wyłącza ozdobne animacje; <konkretne
  animacje: np. suwak przed/po, linia postępu procesu>.
- Rytm sekcji: <kolejność jasna/ciemna, szeroka/wąska, zdjęciowa/tekstowa>.
- Wzorce: <strona → co dokładnie przejmujemy jako zasadę>.
- ZAKAZY (AI slop): fioletowo-niebieskie gradienty, świecące bloby, glassmorphism,
  gradientowy tekst, emoji jako ikony, trzy identyczne karty z ikoną w kółku, wszystko
  wyśrodkowane, szary tekst o słabym kontraście, plakietki nad każdym nagłówkiem,
  ilustracje komiksowe/flat ludzie z laptopami, stockowe uściski dłoni, zmyślone
  statystyki i loga, fade-up na każdym elemencie, scroll-jacking.

## 4. Technologia i architektura
- Stack: <…> (uzasadnienie w 1 zdaniu)
- Struktura katalogów: <…>
- Źródła danych: <pliki / baza / CMS>; co jest edytowalne bez kodu: <…>
- Środowiska: lokalne, <staging>, produkcja; zmienne środowiskowe: <lista bez wartości>
- Hosting i deploy: <…>

## 5. Mapa strony i nawigacja
- Strony: <lista z URL-ami, np. / , /uslugi/mycie-kostki, /cennik, /realizacje, /kontakt …>
- Header desktop: <logo lewo, menu: …, CTA prawo „…”>; po przewinięciu: <…>
- Menu mobile: <typ, elementy, CTA, telefon>
- Pasek akcji mobile (sticky): <np. „Zadzwoń” | „Wycena”>
- Stopka: <kolumny i zawartość>

## 6. Komponenty globalne
Dla każdego: warianty, stany (default/hover/focus/active/disabled/loading/error),
rozmiary, zachowanie mobile.
- Przycisk (primary/secondary/ghost): <…>
- Pole formularza + walidacja: <…>
- Karta usługi/produktu: <…>
- Opinia: <źródło, data, ocena, tekst, zdjęcie opcjonalne>
- Nagłówek sekcji: <wzorzec>
- <inne>

## 7. Specyfikacja stron (sekcja po sekcji)

### Strona: <nazwa> (`<url>`)
Cel strony: <…> · Główna akcja: <…> · Title: <…> · Meta description: <…> · Schema: <…>

#### Sekcja <nr>: <nazwa>
- **Cel:** <po co ta sekcja>
- **Położenie i układ:** <desktop: …; tablet: …; mobile: …; kolejność elementów na mobile>
- **Treść (szkic):**
  - Nagłówek: „<…>”
  - Tekst: „<…>”
  - CTA: „<…>” → <dokąd>
- **Komponenty:** <…>
- **Dane:** <statyczne / z backendu: endpoint/kolekcja>
- **Interakcje i animacje:** <…>
- **Stany:** <pusty, ładowanie, błąd>
- **Dostępność:** <alt, aria, kolejność fokusu>
- **Kryteria akceptacji:** <mierzalne punkty>

<powtórz dla każdej sekcji i każdej strony>

## 8. Wymagania funkcjonalne
Dla każdej funkcji: przepływ krok po kroku, walidacja (serwer!), komunikaty, e-maile,
uprawnienia, przypadki brzegowe.
- Formularz kontaktu / wyceny: <pola, wymagane, limity, honeypot/captcha, rate limit,
  zapis, powiadomienia, autoresponder>
- <Kalkulator / rezerwacje / koszyk / checkout / płatności / panel admina / konta>
- Płatności: <operator, metody>; status opłacenia tylko z webhooka z weryfikacją podpisu,
  kwoty i waluty.
- Panel admina: <role, moduły, uprawnienia, log działań>

## 9. Model danych
| Encja | Pola (typ) | Relacje | Kto edytuje |
|---|---|---|---|

## 10. Integracje
<usługa → cel → dane → klucze w env, nigdy we froncie>

## 11. Treści i placeholdery
- Dostarcza klient: <…>; szkice tekstów w tym prompcie.
- Placeholdery: `[DO UZUPEŁNIENIA: …]`, opinie `[PRZYKŁADOWA OPINIA — podmień na prawdziwą]`,
  zdjęcia z opisem, co ma być na zdjęciu. Na końcu pracy wypisz listę wszystkich placeholderów.

## 12. SEO
- Struktura URL, title/description dla każdej strony (tabela), jeden H1 na stronę,
  linkowanie wewnętrzne, schema.org (<typy>), sitemap.xml, robots.txt, canonical,
  Open Graph z obrazami 1200×630, lokalne SEO (NAP zgodny z Google Business Profile).

## 13. Dostępność (WCAG 2.2 AA)
Kontrast AA, nawigacja klawiaturą, widoczny focus, skip link, etykiety pól, komunikaty
błędów powiązane z polami, alt po polsku, cele dotyku ≥ 44 px, brak informacji tylko
kolorem, reduced motion.

## 14. Wydajność
LCP < 2,5 s, INP < 200 ms, CLS < 0,1 na mobile 4G; obrazy AVIF/WebP z `srcset`,
`fetchpriority="high"` dla hero, fonty subset latin-ext + `font-display: swap`,
JS minimalny, brak blokujących skryptów zewnętrznych przed zgodą.

## 15. Bezpieczeństwo (minimum)
Walidacja na serwerze, ceny/sumy/role liczone na serwerze, sekrety w env, nagłówki
bezpieczeństwa (CSP, HSTS, frame-ancestors, nosniff), ciasteczka HttpOnly/Secure/SameSite,
rate limit formularzy i logowania, ochrona CSRF, upload: typ z zawartości, limit rozmiaru,
poza web rootem.

## 16. Prawo i zgodność
<lista wymagań wyzwolonych z conditional-requirements: polityka prywatności, cookies,
regulamin, odstąpienie, Omnibus, GPSR, EAA, KSeF, …> — teksty prawne jako szkic do
weryfikacji przez prawnika.

## 17. Analityka
Narzędzie: <…> (po zgodzie). Zdarzenia: <form_submit, call_click, booking_start,
booking_complete, add_to_cart, purchase, …> z parametrami.

## 18. QA i definicja ukończenia
- [ ] Wszystkie sekcje i strony zgodne ze specyfikacją i kryteriami akceptacji.
- [ ] Sprawdzone 360 / 768 / 1280 / 1920 px, brak poziomego przewijania.
- [ ] Formularze i przepływy przetestowane end-to-end (płatności w sandboxie).
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95.
- [ ] Zero elementów z listy zakazów AI slop.
- [ ] Polskie znaki we wszystkich fontach i wagach.
- [ ] Lista placeholderów i instrukcja uruchomienia/edycji treści przekazana.

## 19. Poza zakresem
<czego nie robić w tym etapie>

## 20. Kolejność pracy i punkty kontrolne
1. Tokeny designu + komponenty globalne → pokaż.
2. Strona główna → pokaż.
3. <kolejne strony>
4. Backend/funkcje <…> → test.
5. SEO, dostępność, wydajność, QA → raport.

## 21. Założenia i pytania otwarte
- ZAŁOŻENIE: <…>
- PYTANIE DO KLIENTA: <…>
````

## Example of the expected detail (one section)

```markdown
#### Sekcja 1: Hero
- **Cel:** w 5 sekund powiedzieć, co robimy, gdzie i jak zamówić wycenę.
- **Położenie i układ:** pełna szerokość, wysokość min(88vh, 820px). Desktop: siatka
  12 kol., tekst w kol. 1–6 wyrównany do lewej, po prawej (kol. 7–12) suwak przed/po
  w proporcji 4:5 z zaokrągleniem --radius-lg. Tablet: suwak pod tekstem, 16:10.
  Mobile: nagłówek → tekst → 2 przyciski jeden pod drugim → suwak 4:5 → pasek ocen.
- **Treść (szkic):**
  - Nadtytuł (mały, --step--1, kolor --color-primary): „Gdańsk · Gdynia · Sopot”
  - Nagłówek (H1, --step-5): „Kostka jak nowa w jeden dzień”
  - Tekst: „Myjemy ciśnieniowo i impregnujemy kostkę brukową, tarasy i elewacje. Wycena w 2 godziny, gwarancja 12 miesięcy na impregnację.”
  - CTA primary: „Wyceń kostkę” → #wycena; CTA secondary: „Zadzwoń: [DO UZUPEŁNIENIA: numer]” → tel:
  - Pasek zaufania pod przyciskami: „[DO UZUPEŁNIENIA: ocena] ★ w Google · [liczba] opinii” (tylko jeśli prawdziwe; inaczej ukryć)
- **Komponenty:** Button primary/secondary, BeforeAfterSlider, RatingBadge.
- **Dane:** statyczne; ocena Google z backendu (cache 24 h) w opcji z backendem.
- **Interakcje i animacje:** nagłówek i tekst wchodzą opacity+translateY(12px) 400 ms
  ze staggerem 60 ms; suwak przeciągany myszą/palcem/klawiaturą (strzałki), przy
  pierwszym pojawieniu się automatycznie przesuwa się 50% → 65% → 50% w 1,2 s (raz);
  reduced motion: brak animacji.
- **Stany:** brak zdjęć → placeholder z opisem „[ZDJĘCIE: brudna kostka przy domu jednorodzinnym]”.
- **Dostępność:** suwak `role="slider"` z `aria-valuenow`, etykieta „Porównanie przed i po myciu”.
- **Kryteria akceptacji:** H1 widoczny bez przewijania na 360×740; LCP (zdjęcie „po”)
  < 2,5 s; oba CTA działają; suwak działa dotykiem i klawiaturą.
```
