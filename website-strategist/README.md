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

### Tryb B: rozmowa i prompt dla innego AI

1. **Rozmowa w rundach:** biznes i cel, pozycjonowanie i konkurencja, treści i marka,
   funkcje, ograniczenia. Po każdej rundzie podsumowuje, jak zrozumiał odpowiedzi.
2. **Analiza typu strony, a nie Twojej strony:** co ten typ musi mieć, co wyzwalają
   planowane funkcje, co mają bestsellery, jaka kolejność sekcji sprzedaje i dlaczego.
3. **Długi prompt (zwykle 3–8 tys. słów)**, w którym jest:
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
4. Cały prompt dostajesz **w czacie, gotowy do skopiowania**, a dodatkowo zapisany
   jako `PROMPT-<nazwa>.md`.

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
    └── build-prompt-template.md     # szablon promptu + przykład szczegółowości
```

> 💡 Prompt z trybu B możesz dać innemu AI albo od razu skillowi **website-maker**.
