# 🧭 Website Strategist

Skill-strateg: mówi, **czego brakuje stronie, żeby wygrywała w swojej branży**, albo po
rozmowie pisze **bardzo dokładny prompt, z którym inne AI zbuduje stronę**.
Nie zajmuje się zabezpieczeniami. Od tego jest website-security-checker.

## Dwa tryby

### Tryb A: audyt rozwoju istniejącej strony

1. **Spisuje wszystko, co jest na stronie:** strony, sekcje, oferta, opinie, ścieżka
   do kontaktu lub zakupu, treści, SEO, wersja mobilna, integracje, analityka.
2. **Ustala dokładnie, w jakiej branży i podniszy działa strona**, jaki ma model
   biznesowy, rynek, odbiorcę i poziom cen. Rekomendacje dla fotografa ślubnego premium
   i dla wypożyczalni fotobudki różnią się, choć obie branże „robią zdjęcia”.
3. **Porównuje z liderami:** przegląda 5–10 najlepszych stron w branży i regionie
   (konkurencja lokalna, bestsellery w e-commerce, wzorce zagraniczne) i składa
   z tego macierz funkcji.
4. **Sprawdza wymagania nieodłączne i warunkowe.** Nieodłączne to rzeczy, bez których
   strona tego typu traci klientów. Warunkowe wynikają z tego, co strona robi, np.
   „pokazujesz promocje → potrzebna najniższa cena z 30 dni (Omnibus)”,
   „przyjmujesz rezerwacje → polityka odwołań i przypomnienia”.
5. **Raport po polsku:** ocena 10 obszarów na tle branży, tabela porównania
   z liderami, braki krytyczne, słabe elementy, szanse i trendy (tylko te, które mają
   uzasadnienie), szybkie wygrane i plan „Teraz / Następnie / Później” z priorytetami
   ICE.

### Tryb B: rozmowa, lekki audyt i prompt albo brief dla website-makera

1. **Rozmowa w rundach:** biznes i cel, pozycjonowanie i konkurencja, treści i marka,
   funkcje, ograniczenia. Po każdej rundzie podsumowuje, jak zrozumiał odpowiedzi.
   Na początku pyta, czy wynik ma być dla website-makera, dla innego AI, czy dla obu.
2. **Lekki audyt:** jeśli masz już stronę, wypisuje jej 5–10 największych braków
   i mocnych stron. Jeśli nie masz, porównuje 3–5 stron konkurencji w krótkiej tabeli
   (co mają wszyscy, czym wyróżniają się najlepsi, gdzie mają słabe punkty).
3. **Analiza typu strony, a nie Twojej strony:** co ten typ musi mieć, co wyzwalają
   planowane funkcje, co mają bestsellery, **co jest teraz w trendach** (z oceną:
   sprawdzone, rosnące albo chwilowa moda), jaka kolejność sekcji sprzedaje i dlaczego.
4. **`SITE-BRIEF.md` dla website-makera.** Ma stały układ, który maker rozumie:
   biznes, rekomendowana opcja 1–4 z uzasadnieniem, lekki audyt, wymagania, trendy
   z dowodami, propozycje spoza listy, mapa strony, specyfikacja kluczowych stron
   sekcja po sekcji, kierunek designu (z którego skill design zrobi dema), funkcje,
   lista treści i zdjęć, prawo, SEO, MCP przydatne przy budowie, założenia. Potem
   wystarczy napisać: „Uruchom website-maker i wskaż SITE-BRIEF.md”.
5. **Albo długi prompt dla dowolnego AI (zwykle 3–8 tys. słów)**, w którym jest:
   - rola i zasady pracy dla AI wykonawcy,
   - kierunek designu z kolorami w hex, parami kontrastu, fontami z polskimi znakami,
     skalą odstępów i zasadami ruchu,
   - lista zakazów AI slopu,
   - mapa strony, header, menu mobile i stopka,
   - **specyfikacja sekcja po sekcji**: położenie na desktopie, tablecie i telefonie,
     szkic tekstów po polsku, komponenty, animacje, stany i kryteria akceptacji,
   - funkcje, model danych, integracje, SEO, dostępność, wydajność, minimum
     bezpieczeństwa, prawo, analityka,
   - checklista QA, kolejność pracy z punktami kontrolnymi, założenia i pytania otwarte.
6. Cały dokument dostajesz **w czacie, gotowy do skopiowania**, a dodatkowo zapisany
   jako `SITE-BRIEF.md` albo `PROMPT-<nazwa>.md`.

### MCP do researchu

Gdy analiza wymaga faktów, skill proponuje narzędzia: Firecrawl albo Exa (przejrzenie
wielu stron konkurencji), Playwright (zrzuty na telefonie i komputerze), Chrome
DevTools (wydajność), DataForSEO, Ahrefs albo Semrush (prawdziwe dane o wyszukiwaniach)
i Google Analytics (ruch na Twojej stronie). Nic nie instaluje samodzielnie. Bez tych
narzędzi korzysta z wbudowanego wyszukiwania i mówi, na jak dużej próbce oparł analizę.

## Plusy

- **Najpierw rozumie branżę, potem ocenia.** Każda rada jest dopasowana do niszy
  i rynku.
- **Rady mają uzasadnienie:** konkurencję, badania (Baymard, NN/g, Google) albo zasadę
  UX. Nie podaje zmyślonych statystyk z blogów o trendach.
- **Reguły warunkowe:** ponad 25 zasad typu „jeśli strona robi X, musi mieć Y”, w tym
  polskie i unijne prawo (RODO, Omnibus, GPSR, EAA, KSeF, prawo konsumenckie).
- **15 nisz w zestawie:** must-have, wyróżniki, trendy, dźwignie wzrostu, KPI
  i typowe braki.
- **Prompt na poziomie specyfikacji agencyjnej.** Inne AI nie musi o nic dopytywać,
  bo położenie, teksty i kryteria akceptacji są rozpisane.
- **Priorytety ICE:** wiesz, co zrobić dziś, a co za kwartał.

## Przykładowe polecenia

- „Przeanalizuj moją stronę https://… i powiedz, czego brakuje, żeby sprzedawała lepiej”
- „Co dodać do mojego sklepu z kosmetykami, żeby dogonić konkurencję?”
- „Porozmawiajmy o stronie dla mojej szkoły tańca, a potem napisz prompt dla AI”
- „Przygotuj brief strony dla gabinetu fizjoterapii”

## Struktura

```
website-strategist/
├── SKILL.md                         # instrukcje dla AI (po angielsku)
└── references/
    ├── audit-method.md              # inwentaryzacja, ocena, ICE, szablon raportu
    ├── niche-benchmarks.md          # 15 nisz: must-have, wyróżniki, trendy, KPI
    ├── conditional-requirements.md  # reguły „jeśli X, to musi być Y”
    ├── discovery-interview.md       # pytania do rozmowy w rundach
    ├── trends-2026.md               # trendy według obszarów: sprawdzone / rosnące / moda
    ├── maker-handoff.md             # format SITE-BRIEF.md dla website-maker
    ├── build-prompt-template.md     # szablon promptu + przykład szczegółowości
    └── mcp-toolkit.md               # MCP do researchu i analityki
```

> 💡 `SITE-BRIEF.md` z trybu B przekazujesz skillowi **website-maker**, a prompt
> dowolnemu AI.
