# 🧭 Website Strategist

Skill-strateg z nawykiem dziennikarza. Z jednego zdania („strona dla mojej aplikacji
do planowania dnia”) albo z przykładowej strony **dochodzi do tego, o czym naprawdę
jest strona**, sprawdza, **co jest teraz na topie w tej kategorii** i jak wyglądają
strony liderów, a potem pokazuje Ci pomysły i kierunki **do zaakceptowania**. Dopiero
z Twoimi decyzjami pisze `SITE-BRIEF.md` dla website-makera (albo długi prompt dla
innego AI). Nie zajmuje się zabezpieczeniami. Od tego jest website-security-checker.

## Radar kategorii — jak dochodzi do wniosków

| Krok | Co robi |
|---|---|
| **1. Rozszyfrowanie pomysłu** | teza strony w jednym zdaniu, kategoria po polsku i po angielsku (prowadzą do innych źródeł), kupujący i użytkownik, rynek, model biznesowy, **typ kategorii**: nowa (trzeba pokazać problem i demo), zatłoczona (trzeba pokazać różnicę), usługa lokalna (obszar, cena, dowody), sklep, wysokie zaufanie |
| **2. Mapa słów kluczowych** | cztery kręgi: nazwa kategorii, ból klienta, rozwiązanie, porównania („najlepszy…”, „alternatywa dla…”, „cennik”, „opinie”, miasto). Podpowiedzi Google, „Ludzie pytają też”, Google Trends, fora. Każda fraza ma przypisane miejsce na stronie |
| **3. Liderzy** | 5–10 stron: liderzy rynku (G2, App Store, Trustpilot, Allegro, Mapy Google), **szybko rosnący** (Product Hunt, informacje o inwestycjach), najlepiej zaprojektowane w kategorii (Awwwards, Godly, Land-book). Przy każdej: dlaczego jest na liście |
| **4. Puls — co się teraz dzieje** | newsy z ostatnich 3–6 miesięcy: premiery, zmiany cen i funkcji liderów, prawo (AI Act, EAA, Omnibus, KSeF), zmiany platform (Google AI Mode, BLIK), wpadki konkurencji. Każdy sygnał: źródło, data, status (sprawdzone / rosnące / moda / gaśnie) i decyzja: **wykorzystać / odpowiedzieć na obawę / unikać** |
| **5. Rozbiórka stron konkurencji** | prawdziwe strony liderów (główna, cennik, produkt, rejestracja), na komputerze i telefonie: obietnica w hero, kolejność sekcji, oferta i ceny, dowody, CTA, interakcje, treści, język designu, co robią najlepiej i gdzie są słabi. Do tego macierz funkcji i **opinie 1–3★ o liderach**, czyli najtańsze źródło przewag |
| **6. Wnioski** | **standard kategorii** (to, co ma 60–70% liderów: bez tego strona traci zaufanie), **wyróżniki** najlepszych, **luki**, których nikt nie zajął, **pytania odbiorców** (do FAQ i poradników), konwencje kategorii |

Każde twierdzenie ma źródło i datę. Liczby nie są zmyślane; szacunki są oznaczone.
Bez dostępu do internetu skill to mówi i oznacza wnioski jako „do weryfikacji”.

## Tablica pomysłów i kierunki — decydujesz Ty

Po radarze dostajesz jedną wiadomość:

- **W pakiecie:** standard kategorii, który i tak trafi na stronę (możesz coś skreślić),
- **Pomysły do decyzji** (do ~15): z 10 perspektyw (dowód, „wypróbuj przed zakupem”,
  jasne ceny, szybkość, zaufanie, treści i wyszukiwarki AI, społeczność,
  personalizacja, powroty klientów, „signature moment”). Każdy ma dowód, typ
  (Standard / Fala / Wyróżnik / Odważne), opcję makera, nakład i wpływ. 3–5 oznaczonych
  ★ jako rekomendowane,
- **2–3 kierunki strony**, np. „premium ekspert”, „najszybciej i najprościej”, „lokalny
  bohater”. Przy każdym: kogo wygrywa, kogo traci, co zmienia na stronie i przykład
  z radaru. Jeśli radar pokaże szansę dla samego produktu (nowy segment, inny model
  cen), dostajesz też **kierunki rozwoju produktu**,
- najwyżej 5 pytań, na które radar nie odpowiedział.

Odpisujesz np. „TAK 1, 2, 5; NIE 3; MOŻE 6; kierunek B” albo „bierz rekomendowane”.

## Połączenie z website-makerem

`SITE-BRIEF.md` (wersja 2) zawiera tezę i słowa kluczowe, radar ze źródłami, standard
kategorii, puls, **Twoje decyzje** (zaakceptowane / później / odrzucone), wybrany
kierunek, mapę strony, specyfikację kluczowych stron sekcja po sekcji, kierunek
designu z kandydatem na „signature moment” i plan treści z pytań odbiorców.

Maker traktuje decyzje jako wiążące: **odrzuconych pomysłów nie proponuje ponownie**,
a jego „🔥 Propozycje” zawierają tylko nowe rzeczy. Podział pracy jest jasny: strategist
odpowiada za *co i dlaczego*, maker za *jak* i za fundament każdej strony (prawo,
kontakt, podstawy SEO, szybkość, dostępność, bezpieczne ustawienia), design za wygląd
i ruch, security za dowód przed startem. Dlatego brief nie powtarza fundamentu makera.

## Tryb A: audyt rozwoju istniejącej strony

Inwentaryzacja strony, dokładne określenie niszy, radar kategorii z Twoją stroną jako
jedną z kolumn macierzy, wymagania nieodłączne i warunkowe (ponad 25 reguł typu
„pokazujesz promocje → potrzebna najniższa cena z 30 dni”), analiza braków w 11
obszarach, tablica pomysłów z priorytetami ICE i raport „Teraz / Następnie / Później”.

## MCP do researchu

Firecrawl albo Exa (wiele stron konkurencji naraz), Playwright (zrzuty na telefonie
i komputerze), Chrome DevTools (wydajność), DataForSEO, Ahrefs albo Semrush
(prawdziwe dane o wyszukiwaniach), Google Analytics (ruch na Twojej stronie). Głęboki
radar z 10–15 stronami jest z nimi dużo tańszy w tokenach. Skill je proponuje, ale nic
nie instaluje sam.

## Przykładowe polecenia

- „Mam pomysł na aplikację do planowania dnia głosem, przygotuj radar i brief strony”
- „Zrób stronę w stylu https://… dla mojej firmy sprzątającej — co musi na niej być?”
- „Co jest teraz na topie w sklepach z kosmetykami naturalnymi i co dodać do mojego?”
- „Przeanalizuj moją stronę https://… i powiedz, czego brakuje, żeby sprzedawała lepiej”
- „Napisz prompt dla innego AI na stronę szkoły tańca”

## Struktura

```
website-strategist/
├── SKILL.md                         # instrukcje dla AI (po angielsku)
└── references/
    ├── trend-radar.md               # radar: teza, słowa kluczowe, liderzy, puls, rozbiórka, wnioski
    ├── idea-board.md                # 10 perspektyw, karty pomysłów, kierunki, runda akceptacji
    ├── maker-handoff.md             # SITE-BRIEF.md v2 + podział pracy między skillami
    ├── audit-method.md              # inwentaryzacja, ocena, ICE, szablon raportu
    ├── niche-benchmarks.md          # 15 nisz: punkt wyjścia dla radaru
    ├── conditional-requirements.md  # reguły „jeśli X, to musi być Y”
    ├── discovery-interview.md       # pytania, których research nie zastąpi
    ├── trends-2026.md               # trendy bazowe (radar je potwierdza albo zmienia)
    ├── build-prompt-template.md     # szablon promptu dla innego AI
    └── mcp-toolkit.md               # MCP do researchu i analityki
```
