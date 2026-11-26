# 🎨 Website Design

Art director i senior frontendowiec w jednym skillu. Robi tak, że strona **wygląda
i porusza się, jakby zaprojektowało ją dobre studio dla Twojej branży**, i wdraża to
tak, że **każda strona, każdy element i każdy ekran** są spójne, na komputerze i na
telefonie.

## Główny tryb: redesign przez dema

1. **Czyta stronę i jej tematykę:** co sprzedaje, dla kogo, jaki nastrój pasuje, jak
   wyglądają liderzy tej kategorii (z briefu strategista albo z szybkiego przeglądu), co
   trzeba zachować i co jest dziś najsłabsze. Robi inwentaryzację stylów skryptem
   `consistency-audit`.
2. **Przygotowuje 3–4 krótkie dema w HTML**, każde w innym stylu, na prawdziwych
   treściach. Każde demo ma też **własny charakter ruchu** (np. spokojny i redakcyjny
   albo precyzyjny i techniczny) i **jeden „signature moment”**: zapamiętywalną
   interakcję, która pokazuje produkt albo efekt, np. przewijany przepływ aplikacji
   w hero, suwak przed/po, cenę przeliczaną przy przesuwaniu. Wybierasz więc nie tylko
   wygląd, ale i to, jak strona „się czuje”.
3. **Przegląd detali przed pokazaniem** (40 punktów): typografia, rytm, kolor, zdjęcia,
   stany, interakcje, ruch, responsywność, szczegóły, które ludzie zauważają
   podświadomie. Plus skan AI slopu.
4. **Otwiera stronę porównania:** dema obok siebie z przełącznikiem Komputer / Telefon.
5. Wybierasz jedno albo łączysz („kolory z 2, typografia z 3, ruch z 1”).
6. **Podmienia cały front:** tokeny → style bazowe → komponenty → sekcje → każda strona
   i każdy stan → warstwa ruchu → sprzątanie → przegląd detali. Treści, formularze,
   skrypty, SEO i analityka zostają nietknięte.
7. **Weryfikuje wynik:** audyt spójności (cel: zero wartości poza tokenami), 8 szerokości
   ekranu, klawiatura, zoom 200%, wyłączone animacje, wydajność animacji na telefonie,
   zrzuty przed i po.

## Ruch jak u najlepszych frontendowców

`motion-system.md` to poziom ponad gotowymi przepisami:
- **Jak pracują najlepsi** (Emil Kowalski, Rauno Freiberg, Paco Coursey, Josh Comeau,
  Jhey Tompkins, Bramus Van Damme, Cassie Evans, Sarah Drasner, Lynn Fisher, studia
  Lusion, Active Theory, Locomotive, darkroom): ruch projektowany przed kodem, najpierw
  prototyp najważniejszego momentu, przegląd klatka po klatce, czas zależny od tego,
  jak często ktoś widzi animację, animacje przerywalne i „rosnące” z miejsca, z którego
  je wywołano.
- **Język ruchu:** charakter w trzech słowach → czasy, odległości, krzywe; trzy warstwy
  (signature moment, odsłanianie sekcji i przejścia, mikroreakcje); zasady choreografii.
- **Nowoczesny CSS z kodem:** `@starting-style` (wejście okien i menu bez JS),
  animacja do `height: auto`, animacje sterowane przewijaniem (pasek postępu,
  zrzut ekranu „osiadający” na miejscu, karty układające się w stos), View Transitions
  (zdjęcie z listy płynnie przechodzi w zdjęcie produktu), odsłanianie przez
  `clip-path`, rysowanie linii SVG, marquee z pauzą, efekty tylko tam, gdzie jest
  kursor.
- **JavaScript, który się opłaca:** FLIP (np. produkt „lecący” do koszyka), dostępne
  dzielenie nagłówka na słowa, magnetyczny przycisk, pętla prawdziwego interfejsu
  produktu w hero, pauza wszystkiego, czego nie widać.
- **Bank pomysłów dla 10 typów stron** i zasady wyboru bibliotek (GSAP, Motion, Lenis,
  Rive, Three.js).
- **Bramki:** wydajność (60 fps na średnim telefonie, zero przesunięć układu) i
  dostępność (`prefers-reduced-motion`, pauza ruchu dłuższego niż 5 s, nic nie miga).

## Pozostałe tryby

| Tryb | Co robi |
|---|---|
| **Kierunek dla nowej strony** | to samo z demami, na podstawie opisu albo `SITE-BRIEF.md` (z kierunkiem i kandydatem na signature moment). Wynik trafia do website-makera |
| **Ocena** | ocena w 10 kryteriach, skan AI slopu, przegląd detali, audyt spójności i poprawki z konkretnymi wartościami |

## Wiedza w środku

- **Zasady najlepszych frontendowców:** Refactoring UI, Josh Comeau, Emil Kowalski,
  Rauno Freiberg i Web Interface Guidelines Vercela, Every Layout i CUBE CSS, Utopia,
  Defensive CSS, Adam Argyle i Una Kravets, Jen Simmons, Ethan Marcotte, Brad Frost,
  Sara Soueidan, Lea Verou, Steve Krug, web.dev, a teraz także specjaliści od ruchu
  i interakcji oraz zespoły produktowe (Linear, Stripe, Vercel, Raycast, Apple).
- **System responsywny**, **design według 17 typów stron**, **11 kierunków stylu**,
  **18 objawów AI slopu**, gotowe animacje z obsługą `prefers-reduced-motion`.
- **Wspólny system z website-makerem:** te same tokeny (także ruchu) i pliki
  (`DESIGN-SYSTEM.md`, `tokens.css`).

## Narzędzia w zestawie

| Plik | Co robi |
|---|---|
| `scripts/consistency-audit.mjs` | kolory wpisane na sztywno, prawie identyczne odcienie, fonty poza tokenami, rozmiary i odstępy spoza skali, rozrzut promieni, cieni, z-indexów i breakpointów, `!important`, style inline, **kontrast par tokenów (WCAG)** z podpowiedzią tokenu |
| `assets/demo-gallery.html` | strona porównania dem z przełącznikiem Komputer / Telefon |

## Przykładowe polecenia

- „Nie podoba mi się wygląd mojej strony w `C:\projekty\strona`, zrób kilka dem”
- „Zrób 4 dema wyglądu dla sklepu z kawą i pokaż je obok siebie”
- „Dodaj animacje, ale żeby było jak u Linear, a nie jak z szablonu”
- „Strona wygląda jak z AI, oceń design i powiedz, co zmienić”
- „Wybieram demo 2, ale z ruchem z 1. Podmień cały front”

## Struktura

```
website-design/
├── SKILL.md
├── references/
│   ├── frontend-masters.md         # zasady najlepszych frontendowców i specjalistów od ruchu
│   ├── motion-system.md            # język ruchu, signature moment, nowoczesny CSS/JS z kodem, bramki
│   ├── craft-pass.md               # 40-punktowy przegląd detali
│   ├── responsive-system.md        # płynne skale, prymitywy layoutu, mobile/desktop, testy
│   ├── site-type-design.md         # co podkreślać w designie każdego typu strony
│   ├── demo-workflow.md            # jak zrobić i pokazać 3–4 dema
│   ├── migration-playbook.md       # podmiana całego frontu krok po kroku
│   ├── directions.md               # 11 kierunków stylu
│   ├── critique.md                 # ocena + skan AI slopu
│   ├── motion-recipes.md           # podstawowe animacje
│   ├── inspiration.md              # styliści, studia, galerie, sklepy
│   ├── design-tokens-contract.md   # wspólne tokeny z website-maker
│   └── mcp-toolkit.md              # MCP do pracy nad designem
├── assets/demo-gallery.html
└── scripts/consistency-audit.mjs
```
