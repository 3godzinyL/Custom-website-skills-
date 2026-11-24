# Skille do budowy stron 🧰

Cztery skille dla Claude (i innych AI), które **współpracują ze sobą** przy całym życiu
strony: od rozmowy o pomysł, przez projekt wyglądu i budowę, po rozwój
i bezpieczeństwo.

**Instrukcje są po angielsku**, bo modele wykonują je wtedy najdokładniej. **Rozmowa
i wyniki są po polsku:** skille rozumieją polskie polecenia (także pisane potocznie
albo dyktowane), odpowiadają po polsku i budują strony z polskimi treściami
i działającymi polskimi znakami. Uruchamiają się na polskie hasła, np. „zrób stronę”,
„sprawdź bezpieczeństwo”, „czego brakuje na mojej stronie”, „zmień wygląd strony”.

---

## Co jest w paczce

| Skill | W skrócie |
|---|---|
| 🛡️ [**website-security-checker**](website-security-checker/) | audyt bezpieczeństwa i jakości: mapa strony, **test każdego połączenia**, front oczami atakującego, sugerowane ataki, pełny przegląd kodu (bezpieczeństwo, logika, błędy), rozbieżności front↔backend, płatności i triale, **długi raport** |
| 🏗️ [**website-maker**](website-maker/) | analiza wymagań i bestsellerów branży, **4 opcje** do wyboru, dema wyglądu, budowa sekcja po sekcji, weryfikacja, checklista publikacji |
| 🧭 [**website-strategist**](website-strategist/) | audyt rozwoju na tle branży i trendów albo rozmowa, lekki audyt i **`SITE-BRIEF.md` dla makera** lub długi prompt dla innego AI |
| 🎨 [**website-design**](website-design/) | temat strony, potem **3–4 dema HTML** do porównania, wybór i **podmiana całego frontu**, spójnego na komputerze i telefonie |

## Jak współpracują

```
                ┌──────────── rozmowa, lekki audyt, trendy ────────────┐
 pomysł ──► 🧭 strategist ──► SITE-BRIEF.md ──► 🏗️ maker (4 opcje) ──► budowa ──► 🛡️ security ──► start
                                                     │      ▲
                                    wspólne tokeny ──┘      │ dema HTML, wybór wyglądu
                                                     🎨 design
 istniejąca strona ──► 🧭 audyt rozwoju ──► SITE-BRIEF ──► 🏗️ maker / 🎨 redesign ──► 🛡️ ponowny test
```

- **strategist → maker:** brief w stałym formacie. Maker nie pyta drugi raz o to samo
  i wypełnia z niego swoje 4 opcje.
- **design ↔ maker:** te same tokeny i pliki (`DESIGN-SYSTEM.md`, `tokens.css`), więc
  wybrany wygląd od razu pasuje do budowanej strony.
- **maker → security:** audyt przed publikacją przy opcjach z backendem i płatnościami.
- **po starcie → strategist:** audyt rozwoju na prawdziwych danych.

---

## 🛡️ Website Security Checker

Pracuje jak pentester i code reviewer w jednym, w stałej kolejności:

1. **Mapa strony**, czyli wszystko, co na niej jest.
2. **Każde połączenie**, niezależnie od liczby: endpointy, WebSockety, webhooki, crony
   i usługi zewnętrzne. Każde przechodzi macierz testów: logowanie, role, dostęp do
   cudzych danych, walidacja, injection, wycieki, CORS, CSRF, limity.
3. **Front oczami atakującego:** co odwiedzający zrobi w swojej przeglądarce.
4. **Sugerowane ataki** dobrane do tej strony.
5. **Bezpieczeństwo kodu**, a potem **pełny przegląd kodu**: błędy logiczne
   i zwykłe błędy (pieniądze na floatach, strefy czasowe, wyścigi, nieobsłużone błędy).
6. **Rozbieżności między frontem a backendem** w kodzie i na żywej stronie.
7. **Płatności, triale, subskrypcje i rabaty:** czy są podłączone, czy działają
   logicznie i czy są bezpieczne.
8. **Długi raport** z dowodami, gotowymi poprawkami, tabelą pokrycia i planem
   naprawy.

W zestawie są 3 skrypty Node bez instalowania paczek: pasywny skan strony, mapa tras
z kodu (wywołania bez tras, trasy bez wywołań) i macierz zapytań z perspektywy różnych
ról (wykrywa IDOR i otwarty panel admina). Skill proponuje też MCP (Playwright, Semgrep,
Supabase, Stripe, GitHub i inne), które oszczędzają tokeny.

## 🏗️ Website Maker

Analizuje wymagania z czterech źródeł: Twój opis, must-have każdej strony, must-have
typu strony (20 typów) i bestsellery branży. Może też wziąć gotowy `SITE-BRIEF.md`
od strategista. **Na górze pokazuje 🔥 Propozycje spoza Twojej listy**, a pod nimi
4 opcje: **Front**, **+ backend**, **+ panel admina i płatności**, **tryb ostateczny**.
Do każdej możesz coś dopisać. Potem przychodzi faza designu (dema HTML), budowa
sekcja po sekcji, sprawdzenie w przeglądarce i checklista publikacji. Postęp zapisuje
w `SITE-PLAN.md`, więc praca może trwać wiele sesji. Proponuje MCP przydatne przy
budowie.

## 🧭 Website Strategist

- **Audyt rozwoju:** ustala niszę, porównuje stronę z liderami i trendami, sprawdza
  wymagania nieodłączne i **warunkowe** („masz promocje, więc potrzebujesz najniższej
  ceny z 30 dni”). Wynik to plan z priorytetami ICE.
- **Rozmowa → brief:** pytania w rundach, **lekki audyt** (Twojej strony albo
  konkurencji), analiza typu strony z **trendami 2026** (sprawdzone, rosnące, moda),
  a na końcu **`SITE-BRIEF.md` dla website-makera** albo długi prompt sekcja po
  sekcji dla innego AI.
- Proponuje MCP do researchu (Firecrawl, Exa, Playwright, dane SEO, Google Analytics).

## 🎨 Website Design

Bierze tematykę strony i robi **3–4 dema HTML na prawdziwych treściach**: bliskie
obecnej marce, najlepiej dopasowane do branży i odważniejsze. **Otwiera je obok siebie**
z przełącznikiem Komputer / Telefon. Po wyborze **podmienia cały front** w kolejności:
tokeny, komponenty, sekcje, każda strona i każdy stan. Na koniec sprawdza spójność
skryptem i robi zrzuty przed i po. Korzysta z zasad najlepszych frontendowców
(Refactoring UI, Josh Comeau, Emil Kowalski, Rauno Freiberg i Vercel, Every Layout,
Utopia, Defensive CSS…), ma system responsywny, wskazówki dla 17 typów stron,
11 kierunków stylu i skan AI slopu.

---

## MCP: pomocnicze narzędzia

Każdy skill wie, kiedy MCP przyspieszy pracę i zaoszczędzi tokeny. Przykłady:
Supabase MCP sprawdza RLS wszystkich tabel w jednym wywołaniu, Playwright robi zrzuty
na telefonie i komputerze, a Semgrep skanuje całe repo. Skill **proponuje** wtedy
konkretne MCP w jednej wiadomości: z uzasadnieniem, komendą instalacji i bezpieczną
konfiguracją (tylko odczyt, klucze testowe). **Nic nie instaluje samodzielnie.** Gdy
odmówisz, pracuje innymi metodami.

## Instalacja

**Claude Code.** Skopiuj foldery skilli do jednego z miejsc:
- `~/.claude/skills/` (wszystkie projekty), na Windows `C:\Users\<Ty>\.claude\skills\`
- `.claude/skills/` w konkretnym projekcie

```powershell
Copy-Item -Recurse website-* "$env:USERPROFILE\.claude\skills\"
```

**Claude.ai / aplikacja Claude.** Spakuj każdy folder skilla osobno do ZIP-a (w środku
ma być folder z `SKILL.md`) i dodaj go w *Settings → Capabilities → Skills*. MCP
dodajesz w *Settings → Connectors*.

**Inne AI.** Wklej treść `SKILL.md` jako instrukcję, a pliki z `references/` dołącz
wtedy, gdy AI ich potrzebuje.

Po instalacji wystarczy pisać normalnie po polsku. Możesz też wywołać skill po nazwie,
np. `/website-design`.

## Wymagania

- **Node.js 18+** dla skryptów i budowy stron
- Opcjonalnie: dostęp do internetu (research, testy na żywo), narzędzie przeglądarki
  albo Playwright MCP (zrzuty i sprawdzanie wyglądu)

## Struktura

```
skille/
├── README.md
├── website-security-checker/   SKILL.md · README.md · references/ (11) · scripts/ (3)
├── website-maker/              SKILL.md · README.md · references/ (8)
├── website-strategist/         SKILL.md · README.md · references/ (8)
└── website-design/             SKILL.md · README.md · references/ (11) · assets/ · scripts/
```

> ⚠️ Website Security Checker używaj tylko na stronach, które są Twoje albo na których
> masz zgodę na test. Listy prawne (RODO, Omnibus, KSeF…) to checklisty do budowy,
> a nie porada prawna.
