# 🎨 Website Design

Art director i senior frontendowiec w jednym skillu. Robi tak, że strona **wygląda,
jakby zaprojektowało ją dobre studio dla Twojej branży**, i wdraża ten wygląd tak, że
**każda strona, każdy element i każdy ekran** są spójne, zarówno na komputerze, jak i na
telefonie.

## Główny tryb: redesign przez dema

Dajesz dostęp do strony i mówisz, że nie podoba Ci się wygląd. Skill:

1. **Czyta stronę i jej tematykę:** co sprzedaje, dla kogo, jaki nastrój pasuje, co
   trzeba zachować (logo, kolory marki) i co jest dziś najsłabsze. Do tego robi
   inwentaryzację stron, komponentów, stanów i stylów (skrypt `consistency-audit`).
2. **Przygotowuje 3–4 krótkie dema w HTML**, każde w innym stylu:
   - jedno bliskie obecnej marce, jedno najlepiej dopasowane do branży, jedno
     odważniejsze, opcjonalnie czwarte jako alternatywa,
   - **na prawdziwych treściach strony** (nagłówki, oferta, opinie, kontakt), a nie na
     lorem ipsum,
   - każde zawiera header, hero, najważniejszą sekcję, opinie, CTA, stopkę i pasek
     „System” z paletą, typografią, przyciskami i polem formularza,
   - działają na telefonie i komputerze, mają sprawdzony kontrast i polskie znaki,
3. **Sprawdza każde demo** na zrzutach (390 i 1440 px) i poprawia błędy.
4. **Otwiera na koniec stronę porównania**: wszystkie dema obok siebie z przełącznikiem
   Komputer / Telefon.
5. Wybierasz jedno albo łączysz kilka („kolory z 2, typografia z 3”).
6. **Podmienia cały front:** najpierw tokeny, potem style bazowe, komponenty, sekcje,
   a na końcu każdą stronę i każdy stan (hover, focus, błąd, pusty, ładowanie).
   Usuwa stare style i kolory wpisane na sztywno. Treści, formularze, skrypty, SEO
   i analityka zostają nietknięte.
7. **Weryfikuje wynik:** audyt spójności (cel: zero kolorów poza tokenami), testy na
   8 szerokościach ekranu, z klawiatury, z zoomem 200% i przy wyłączonych animacjach,
   do tego zrzuty przed i po każdej strony.

**Wspólny system z website-makerem:** oba skille używają tych samych nazw tokenów
i tych samych plików (`DESIGN-SYSTEM.md`, `tokens.css`), więc wybrany wygląd od razu
pasuje do strony budowanej przez makera, a późniejsze zmiany nic nie rozsypują.

## Pozostałe tryby

| Tryb | Co robi |
|---|---|
| **Kierunek dla nowej strony** | to samo z demami, ale na podstawie opisu albo `SITE-BRIEF.md` od strategista. Wynik trafia do website-makera |
| **Ocena** | ocena w 10 kryteriach, skan AI slopu, audyt spójności i poprawki z konkretnymi wartościami |

## Wiedza w środku

- **Zasady najlepszych frontendowców:** Refactoring UI (Wathan, Schoger), Josh Comeau,
  Emil Kowalski (animacje), Rauno Freiberg i Web Interface Guidelines Vercela, Every
  Layout i CUBE CSS (Andy Bell, Heydon Pickering), Utopia (płynna typografia), Defensive
  CSS (Ahmad Shadeed), nowoczesny CSS (Adam Argyle, Una Kravets), Intrinsic Web Design
  (Jen Simmons), Responsive Web Design (Ethan Marcotte), Atomic Design (Brad Frost),
  dostępne komponenty (Sara Soueidan), kolor (Lea Verou), Steve Krug, wydajność (web.dev).
  Na końcu jest z tego **jedna lista 20 zasad spójności na komputerze i telefonie**.
- **System responsywny:** płynna skala tekstu i odstępów, container queries, prymitywy
  layoutu (Stack, Cluster, Sidebar, Switcher, Grid, Frame, Reel), wzorce mobilne
  (menu, pasek akcji, formularze, tabele) i desktopowe, macierz testów.
- **Design według typu strony:** 17 typów (usługi lokalne, salony, klinika,
  restauracja, sklepy różnych branż, SaaS, portfolio, nieruchomości, hotel, fitness,
  B2B, NGO, blog). Przy każdym: co podkreślić, jaki hero, komponenty, zdjęcia, ile
  animacji, specyfika mobile i pułapki.
- **11 kierunków stylu** ze sprawdzonym kontrastem, ocena w 10 kryteriach,
  **18 objawów AI slopu** z poprawkami, gotowe animacje z obsługą `prefers-reduced-motion`.
- **MCP do pomocy:** Playwright i Chrome DevTools (zrzuty, wydajność), Figma (jeśli są
  projekty), shadcn, Context7. Skill je proponuje, ale nie instaluje samodzielnie.

## Narzędzia w zestawie

| Plik | Co robi |
|---|---|
| `scripts/consistency-audit.mjs` | znajduje kolory wpisane na sztywno, grupy prawie identycznych odcieni, fonty poza tokenami, rozmiary i odstępy spoza skali, rozrzut promieni, cieni, z-indexów i breakpointów, `!important`, style inline. Sprawdza też **kontrast par tokenów (WCAG)** i podpowiada, którym tokenem zastąpić dany kolor |
| `assets/demo-gallery.html` | strona porównania dem z przełącznikiem Komputer / Telefon |

Oba zostały przetestowane: audyt na przykładowych stylach i na prawdziwym CSS
(34 pliki), galeria w przeglądarce w obu trybach.

## Przykładowe polecenia

- „Nie podoba mi się wygląd mojej strony w `C:\projekty\strona`, zrób kilka dem”
- „Zrób 4 dema wyglądu dla sklepu z kawą i pokaż je obok siebie”
- „Strona wygląda jak z AI, oceń design i powiedz, co zmienić”
- „Wybieram demo 2, ale z kolorami z 3. Podmień cały front”

## Struktura

```
website-design/
├── SKILL.md
├── references/
│   ├── frontend-masters.md         # zasady najlepszych frontendowców + lista spójności
│   ├── responsive-system.md        # płynne skale, prymitywy layoutu, mobile/desktop, testy
│   ├── site-type-design.md         # co podkreślać w designie każdego typu strony
│   ├── demo-workflow.md            # jak zrobić i pokazać 3–4 dema
│   ├── migration-playbook.md       # podmiana całego frontu krok po kroku
│   ├── directions.md               # 11 kierunków stylu
│   ├── critique.md                 # ocena + skan AI slopu
│   ├── motion-recipes.md           # gotowe animacje
│   ├── inspiration.md              # styliści, studia, galerie, sklepy
│   ├── design-tokens-contract.md   # wspólne tokeny z website-maker
│   └── mcp-toolkit.md              # MCP do pracy nad designem
├── assets/demo-gallery.html
└── scripts/consistency-audit.mjs
```
