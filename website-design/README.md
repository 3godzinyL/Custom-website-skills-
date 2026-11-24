# 🎨 Website Design · wersja robocza v0.1

Skill tylko od **wyglądu i ruchu strony**. Pracuje jak art director: tworzy spójny,
charakterystyczny kierunek wizualny, ocenia istniejący design i robi redesign bez
ruszania treści i funkcji.

> 🚧 **Wersja robocza.** Działa, ale jest punktem wyjścia do dalszego rozwoju. Lista
> pomysłów jest na dole.

## Trzy tryby

| Tryb | Co robi |
|---|---|
| **Kierunek** | z opisu firmy wyciąga koncept, proponuje 3 naprawdę różne kierunki (paleta w hex, fonty z polskimi znakami, układ, ruch, wzorce) i poleca jeden. Po wyborze tworzy tokeny, komponenty, rytm sekcji, specyfikację ruchu i stronę podglądu `design-preview.html` |
| **Ocena** | patrzy na prawdziwy wygląd (zrzuty mobile i desktop), wystawia ocenę w 10 kryteriach, skanuje AI slop i daje poprawki z konkretnymi wartościami, od tych o największym wpływie |
| **Redesign** | wprowadza tokeny, potem komponenty, potem sekcje. Nie gubi treści ani funkcji i pokazuje zrzuty przed i po |

## Plusy

- **11 kierunków stylu** z paletami, w których **kontrast jest sprawdzony**: Editorial Calm,
  Swiss Precision, Industrial Trade, Warm Craft, Premium Tech, Bold Brand, Luxury
  Minimal, Nature, Clinical Clear, Dark Studio, Retro-Modern. Każdy ma opis, do jakiej
  branży pasuje, a do jakiej nie.
- **Skan AI slopu:** 18 typowych objawów, a przy każdym gotowa poprawka.
- **Gotowe animacje:** reveal, scroll-driven, przyciski, suwak przed/po dostępny
  z klawiatury, header kompaktujący się przy przewijaniu, FAQ, View Transitions,
  liczniki. Każda z obsługą `prefers-reduced-motion`.
- **Polska typografia:** fonty z ą ć ę ł ń ó ś ź ż, test „Zażółć gęślą jaźń”, twarde
  spacje i polskie cudzysłowy.
- **Wzorce od najlepszych:** Rams, Vignelli, Refactoring UI, Emil Kowalski, Josh
  Comeau, Apple, Aesop, Bellroy, Teenage Engineering, Nothing, Linear, Stripe.

## Przykładowe polecenia

- „Zaprojektuj wygląd strony dla piekarni rzemieślniczej w Krakowie”
- „Moja strona wygląda jak z AI, oceń design i powiedz, co zmienić”
- „Zrób redesign strony w folderze `public/` w stylu premium, nie ruszaj treści”
- „Dobierz kolory i czcionki do sklepu z biżuterią”

## Struktura

```
website-design/
├── SKILL.md                    # instrukcje dla AI (po angielsku)
└── references/
    ├── directions.md           # 11 kierunków stylu
    ├── critique.md             # ocena w 10 kryteriach + skan AI slopu
    ├── motion-recipes.md       # gotowe animacje CSS/JS
    └── inspiration.md          # styliści, studia, galerie, najlepsze sklepy
```

## Pomysły na kolejne wersje

- [ ] Własne zapisane kierunki stylu (np. styl Twojej marki, wielokrotnego użytku)
- [ ] Eksport tokenów do Figmy / Tailwind / JSON (Design Tokens format)
- [ ] Generowanie moodboardu (kolaż zdjęć referencyjnych + paleta)
- [ ] Biblioteka gotowych sekcji (hero, opinie, cennik, FAQ) w kilku kierunkach
- [ ] Automatyczna ocena ze zrzutów w kilku szerokościach + porównanie przed/po
- [ ] Warianty A/B designu dla tej samej sekcji
