# SITE-BRIEF — Ogarnij (landing page startupu z AI + lista oczekujących)
Przygotowane przez: website-strategist · Data: 2026-11-24 · Wersja: 1

> Źródło zadania: karta „3. Landing page własnego startupu — strona fikcyjnej aplikacji
> wykorzystującej AI. Prezentacja produktu, funkcjonalności, wizualizacje aplikacji
> i zapis na listę oczekujących. Poziom: średni.” + zrzut inspiracji (FlyTask: ciemne tło,
> dwa telefony z interfejsem, duży nagłówek „Seamless task and time mastery in your grasp”).
> Właściciel nie podał pomysłu — strategist dobrał go sam. Wywiad zastąpiono jawnymi
> założeniami (sekcja 15).

---

## 1. Biznes

- **Firma, oferta, ceny/widełki:**
  **Ogarnij** — mobilny planer dnia sterowany głosem po polsku. Mówisz przez 30–60 s
  wszystko, co masz na głowie („jutro oddać raport, zadzwonić do mamy, siłownia, kupić
  prezent dla Oli, w piątek dentysta 16:30”), a aplikacja:
  1. wyciąga z tego zadania, terminy, osoby i szacuje czas,
  2. dzieli duże zadania na pierwsze małe kroki,
  3. układa realny plan dnia wokół kalendarza i Twoich godzin energii,
  4. gdy dzień się sypie (spotkanie się przeciąga) — przelicza plan i mówi, co wypada,
  5. wieczorem robi krótkie, uczciwe domknięcie dnia i przenosi resztę na jutro.
  Faza: przed startem — strona zbiera listę oczekujących na zamkniętą betę.
  Cennik **planowany** (ZAŁOŻENIE): Darmowy (3 nagrania dziennie, 1 kalendarz),
  Plus 19 zł/mies. lub 149 zł/rok (bez limitu, wszystkie kalendarze, plan B, widżety),
  Duet 29 zł/mies. (2 osoby, wspólne zadania domowe).
- **Odbiorca:** osoby 20–40 lat w Polsce, które mają za dużo równoległych spraw
  i za mało struktury: studenci w sesji, freelancerzy z kilkoma klientami, pracujący
  zdalnie rodzice, osoby, którym „plan rozsypuje się do południa” (w tym osoby
  z trudnościami z koncentracją — bez obietnic medycznych). Obawy: „kolejna apka, którą
  porzucę po tygodniu”, „AI źle mnie zrozumie”, „co dzieje się z moim głosem”, „ile to
  będzie kosztować po becie”.
- **Rynek / obszar:** Polska (język polski, ceny w zł, serwery w UE); później CEE.
- **Wyróżniki (konkretne):**
  - polski głos jako główne wejście, nie dodatek (liderzy kategorii są anglojęzyczni),
  - „Plan B” — automatyczne przestawianie dnia z widocznym „co wypada”,
  - planowanie wg energii, nie tylko wg wolnych slotów,
  - prywatność: nagranie kasowane po transkrypcji, dane w UE,
  - cena w złotówkach na poziomie ~1/3 typowych narzędzi z USA.
- **Główna akcja:** zapis na listę oczekujących (e-mail).
  **Akcje dodatkowe:** polecenie znajomemu (awans w kolejce), wypróbowanie demo
  w przeglądarce, ankieta 1-pytaniowa po zapisie („Jak dziś planujesz dzień?”).
- **Mierniki sukcesu:** konwersja odwiedziny → zapis ≥ 8 %; potwierdzenie double opt-in
  ≥ 70 %; ≥ 20 % zapisanych poleca min. 1 osobę; uruchomienia demo ≥ 25 % odwiedzin.

## 2. Typ strony i model

- **Typ:** SaaS / aplikacja / startup (site-types §9) — landing pre-launch z waitlistą.
- **Model biznesowy:** freemium + subskrypcja; strona na tym etapie = generowanie leadów
  (waitlista) i walidacja popytu.
- **Rekomendowana opcja website-maker: 2 (Front + backend)** — dlaczego:
  waitlista bez backendu to tylko formularz zewnętrzny; potrzebujemy zapisu w bazie,
  double opt-in, unikalnej pozycji w kolejce, linku polecającego z licznikiem, rate
  limitu i ochrony przed spamem. To dokładnie zakres opcji 2. Opcja 1 nie obsłuży
  kolejki i poleceń, opcja 3 (płatności) nie ma sensu przed startem produktu.
- **Co przenieść do kolejnej opcji później:** prosty panel właściciela z rolami
  i eksportem (opcja 3), przedsprzedaż „cena założycielska” z BLIK/Stripe (opcja 3),
  wersja EN, blog/poradnik planowania, A/B testy nagłówka (opcja 4).

## 3. Lekki audyt

- **Obecna strona:** brak (nowy produkt).
- **Konkurencja (research: wbudowana wyszukiwarka + wiedza własna; bez MCP; ceny
  w źródłach są niespójne — traktować orientacyjnie):**

| Funkcja | Tiimo | Motion | Reclaim | Sunsama | Ogarnij (plan) |
|---|---|---|---|---|---|
| Język polski / głos po polsku | nie | nie | nie | nie | **tak, główne wejście** |
| „Brain dump” → zadania | tak (AI grupuje) | częściowo | nie | ręcznie | tak, głosem |
| Rozbijanie zadań na kroki | tak | nie | nie | nie | tak |
| Automatyczne przestawianie dnia | nie | **tak (mocne)** | tak (bloki) | nie (rytuał ręczny) | tak + „co wypada” |
| Planowanie wg energii | wizualnie | nie | częściowo (nawyki) | nie | tak |
| Rytuał domknięcia dnia | nie | nie | nie | **tak** | tak (krótki) |
| Cena | ~8–12 USD/mies. | ~19–34 USD/mies. | darmowy + ~10 USD | ~16–25 USD | 19 zł/mies. (plan) |
| Strona: interaktywne demo | nie | wideo | nie | wideo | **tak, w przeglądarce** |

  **Wnioski:** wszyscy liderzy pokazują prawdziwy interfejs (zrzuty / wideo), cennik
  i FAQ — to minimum. Nikt nie obsługuje polskiego głosu i nikt nie daje zagrać
  w produkt bez instalacji. Słabe miejsca do pobicia: abstrakcyjne obietnice („AI that
  plans your day”), brak wyjaśnienia, co dzieje się z danymi, cena w USD.
  Źródła: [Tiimo w App Store](https://apps.apple.com/app/tiimo/id1480220328),
  [Tiimo pricing (lifestack)](https://lifestack.ai/blog/tiimo-pricing),
  [Sunsama vs Motion (Morgen)](https://www.morgen.so/blog-posts/sunsama-vs-motion),
  [Motion vs Reclaim (Morgen)](https://morgen.so/blog-posts/motion-vs-reclaim),
  [Motion vs Akiflow vs Sunsama 2026 (DEV)](https://dev.to/pickuma/motion-vs-akiflow-vs-sunsama-ai-calendar-planners-compared-in-2026-525h).

## 4. Wymagania

### 4.1 Nieodłączne dla tego typu strony
- Propozycja wartości nad zgięciem: co to jest, dla kogo, co zrobić (zapis).
- Prawdziwe wizualizacje produktu (makiety ekranów zbudowane w HTML/CSS, nie stock).
- Funkcje opisane rezultatem („wiesz, co zrobić teraz”), nie technologią.
- Cennik (tu: planowany, wyraźnie oznaczony).
- Prywatność i bezpieczeństwo danych — osobna sekcja + strona polityki.
- FAQ odpowiadające na obawy; kontakt (e-mail).
- Mapa drogowa zamiast changelogu (produkt przed startem).
- Dowód społeczny: **tylko prawdziwy** — licznik zapisów z bazy (pokazywany od progu,
  np. ≥ 100), bez zmyślonych logotypów i opinii.

### 4.2 Warunkowe (wyzwolone przez funkcje) — z uzasadnieniem
- **Zbiera e-maile** → polityka prywatności, klauzula informacyjna przy formularzu,
  zgoda marketingowa niezaznaczona domyślnie (RODO).
- **Wysyła wiadomości (waitlista = mailing)** → double opt-in, link wypisu w każdej
  wiadomości, tożsamość nadawcy.
- **Prezentuje produkt AI** → jawna informacja, co robi AI i jakie ma granice
  (AI Act art. 50 — transparentność); demo w przeglądarce oznaczone jako symulacja.
- **Program poleceń** → krótki regulamin listy oczekujących i poleceń (jak liczona jest
  kolejka, brak nagród pieniężnych, zakaz fałszywych kont).
- **Analityka** → bez ciasteczek marketingowych; narzędzie bezciasteczkowe (Plausible/
  Umami) albo baner z równymi „Akceptuj / Odrzuć”.
- **Przyszła subskrypcja** → już w cenniku: „anulujesz jednym kliknięciem”, cykl
  rozliczeń, przypomnienie przed odnowieniem.

### 4.3 Uniwersalne (każda strona)
Nagłówek z ≤ 7 pozycjami i CTA, menu mobilne, stopka z danymi i linkami prawnymi,
strona 404, HTTPS, Core Web Vitals, WCAG 2.2 AA, SEO (title/description, OG, sitemap,
robots, canonical, schema.org), polskie znaki we wszystkich fontach, nagłówki
bezpieczeństwa, brak sekretów we froncie, walidacja i rate limit formularza.

### 4.4 Życzenia klienta
- Strona w duchu inspiracji: ciemna, dwa telefony z interfejsem, duży wyrazisty nagłówek.
- Prezentacja produktu, funkcjonalności, wizualizacje aplikacji, zapis na listę oczekujących.
- Poziom „średni” — jedna mocna strona główna + strony prawne/potwierdzenia, bez platformy.
- Pomysł ma „mieć ręce i nogi” — realny problem, realny rynek, wiarygodny model.

## 5. Bestsellery i trendy (z dowodami)

| Funkcja / trend | Dowód (strony, badania) | Dla tych odbiorców, bo… | Opcja |
|---|---|---|---|
| Interaktywne demo produktu (Sprawdzone, SaaS) | niche-benchmarks SaaS: „interactive demo/tour” jako wyróżnik; liderzy kategorii mają tylko wideo | „kolejna apka” — obawę rozbraja zagranie w produkt w 10 s bez instalacji | 1–2 |
| Waitlista z kolejką i poleceniami (Sprawdzone pre-launch) | standard startupów pre-launch (Robinhood, Superhuman — mechanika kolejki) | młoda, sieciowa grupa; polecenia = darmowy zasięg | 2 |
| Prawdziwy UI zamiast stocku (Sprawdzone) | trends-2026 §4 „real photography/authentic”; typowa luka SaaS „fake-looking screenshots” | zaufanie do nowego produktu AI | 1 |
| Jawność AI i prywatność głosu (Rosnące, obowiązek) | AI Act art. 50; conditional-requirements: AI disclosure | głos to dane wrażliwe w odczuciu użytkownika | 1 |
| Typografia wiodąca, layout redakcyjny (Sprawdzone) | trends-2026 §4 | odróżnia od szablonów „AI SaaS” | 1 |
| Animacje sterowane przewijaniem, natywne (Rosnące) | trends-2026 §4 (scroll-driven, View Transitions) | pokazanie przestawiania planu jako sekwencji | 1 |
| Analityka bez ciasteczek (Rosnące) | trends-2026 §5 | mniej tarcia, spójne z obietnicą prywatności | 2 |
| GEO — jasne odpowiedzi FAQ + schema (Rosnące, ważne) | trends-2026 §1 | pytania „jaki planer po polsku” w AI-wyszukiwarkach | 1 |
| Bento grid, fioletowe gradienty, świecące bloby (**Ryzyko mody**) | trends-2026 §4 — znaki AI slopu | inspiracja jest fioletowa — bierzemy kontrast i telefony, nie poświatę | — |

## 6. Propozycje spoza listy klienta

| Propozycja | Dlaczego | Opcja | Nakład |
|---|---|---|---|
| „Wypróbuj na sucho” — demo w przeglądarce: wpisujesz/dyktujesz chaos, dostajesz plan | najmocniejszy argument dla nieznanej apki; liderzy go nie mają | 1 | średni |
| Pozycja w kolejce + link polecający (+5 miejsc za potwierdzone polecenie) | wiralność bez budżetu; mierzalne | 2 | średni |
| Ankieta po zapisie (1 pytanie: „Jak dziś planujesz?”) | walidacja segmentów przed betą | 2 | mały |
| Licznik zapisów z bazy (pokazywany od progu) | prawdziwy dowód społeczny zamiast zmyślonego | 2 | mały |
| Sekcja „Co robi AI, a czego nie robi” | AI Act + obawa „źle mnie zrozumie” | 1 | mały |
| Tryb „dyktuj” w demo (Web Speech API, gdy przeglądarka wspiera) | pokazuje sedno produktu — głos | 1 | mały |
| Prosty podgląd listy dla właściciela (hasło, tabela, eksport CSV) | bez tego dane z waitlisty są „w pliku” | 2→3 | mały |
| Ekran OG 1200×630 z telefonem i hasłem | udostępnienia linku polecającego wyglądają dobrze | 1 | mały |

## 7. Mapa strony

| URL | Strona | Cel |
|---|---|---|
| `/` | Strona główna (landing) | zapis na listę |
| `/dziekujemy` | Po zapisie: „sprawdź skrzynkę”, ankieta 1 pyt. | potwierdzenie |
| `/potwierdz?token=…` | Potwierdzenie e-maila → pozycja w kolejce + link polecający | aktywacja + polecenia |
| `/kolejka?id=…` (ZAŁOŻENIE: przez tajny token) | Moja pozycja, liczba poleceń | powrót, polecenia |
| `/prywatnosc` | Polityka prywatności (szkic) | RODO |
| `/zasady-listy` | Zasady listy oczekujących i poleceń | jasność |
| `/404` | Nie znaleziono | powrót |

**Kolejność sekcji na głównej (z uzasadnieniem):**
1. Hero z formularzem — konwersja możliwa od razu (część osób przychodzi z polecenia,
   już przekonana).
2. Problem — nazwanie bólu w języku odbiorcy, zanim padną funkcje.
3. Jak to działa (3 kroki z telefonami) — rozbraja „nie wiem, co to robi”.
4. Demo „Wypróbuj na sucho” — dowód zamiast obietnicy, w środku strony, gdy ciekawość
   jest największa.
5. Funkcje (rezultaty) — szczegóły dla analitycznych.
6. Plan B — największy wyróżnik dostaje własną scenę.
7. Dla kogo — trzy sytuacje życiowe; czytelnik znajduje siebie.
8. Prywatność i AI — obawa nr 2, zaraz przed ceną.
9. Cennik (planowany) — obawa nr 3.
10. Mapa drogowa — „kiedy dostanę”.
11. FAQ.
12. Końcowe CTA z formularzem.
13. Stopka.

## 8. Specyfikacja kluczowych stron (sekcja po sekcji)

### Strona główna (`/`)
Cel: zapis na listę · Główna akcja: „Zapisz mnie na betę” ·
Title: „Ogarnij — planer dnia, który rozumie polski głos” (≤ 60 zn.) ·
Meta description: „Powiedz, co masz na głowie. Ogarnij zamieni to w plan dnia
i przestawi go, gdy coś się przeciągnie. Zapisz się na zamkniętą betę.” ·
Schema: SoftwareApplication (applicationCategory: ProductivityApplication,
offers: planowane — bez `aggregateRating`), Organization, FAQPage.

#### Sekcja 0: Nagłówek
- **Cel:** orientacja + CTA zawsze pod ręką.
- **Położenie:** desktop: kontener 1200 px, logo lewo, menu środek („Jak działa”, „Demo”,
  „Funkcje”, „Prywatność”, „Cennik”, „FAQ”), CTA prawo „Zapisz się”. Po przewinięciu
  > 80 px: tło nieprzezroczyste + cienka linia dolna, wysokość 72 → 60 px.
  Mobile: logo + przycisk „Zapisz się” (mały) + hamburger; menu pełnoekranowe z dużymi
  pozycjami i CTA na dole.
- **Dostępność:** skip link „Przejdź do treści”; `aria-expanded` na hamburgerze;
  Escape zamyka menu; fokus uwięziony w otwartym menu.
- **Kryteria:** wszystkie kotwice przewijają płynnie (bez scroll-jackingu) i uwzględniają
  wysokość nagłówka (`scroll-margin-top`).

#### Sekcja 1: Hero
- **Cel:** w 5 sekund: co to jest, czym się różni, jak dołączyć.
- **Położenie i układ:** min(92vh, 860 px). Desktop: 12 kol.; tekst kol. 1–6 do lewej,
  kol. 7–12 dwa telefony (przedni prosto, tylny przesunięty w górę i obrócony −6°),
  jak w inspiracji. Tablet: telefony pod tekstem, obok siebie. Mobile: nadtytuł →
  H1 → tekst → formularz (pole + przycisk pod spodem, pełna szerokość) → mikrocopy →
  jeden telefon (drugi ukryty).
- **Treść (szkic):**
  - Nadtytuł: „Zamknięta beta · wiosna 2027 · Android i iPhone”
  - H1: „Powiedz, co masz na głowie. **Ogarnij** ułoży z tego dzień.”
  - Tekst: „Nagrywasz minutę chaosu po polsku. Dostajesz plan z godzinami, pierwszymi
    krokami i zapasem na nieprzewidziane. Kiedy spotkanie się przeciągnie, plan
    przestawi się sam.”
  - Formularz: pole „Twój e-mail” + przycisk „Zapisz mnie na betę”.
  - Mikrocopy: „Jeden e-mail z potwierdzeniem, potem tylko wieści o becie. Wypisujesz
    się jednym kliknięciem.”
  - Link drugorzędny: „Najpierw zobacz, jak działa ↓” → #demo
  - Licznik (tylko gdy zapisów ≥ 100, z backendu): „Na liście jest już 1 284 osób.”
- **Komponenty:** WaitlistForm (inline), PhoneMockup ×2, Badge-less nadtytuł.
- **Dane:** licznik z `GET /api/waitlist/stats` (cache 60 s).
- **Interakcje i animacje:** przedni telefon odtwarza pętlę 9 s: fala głosu z napisem
  „Słucham…” → transkrypcja pojawia się słowo po słowie → zadania wysuwają się jako
  karty → karty wskakują na oś dnia (08:00–18:00). Tylny telefon: statyczny widok
  „Domknięcie dnia”. Pętla zatrzymuje się, gdy hero poza ekranem; reduced motion:
  stan końcowy bez animacji.
- **Stany formularza:** pusty; błąd walidacji pod polem („Wpisz pełny adres, np.
  ola@poczta.pl”); wysyłanie (przycisk z wskaźnikiem, zablokowany); sukces → przejście
  na `/dziekujemy`; już zapisany → „Ten adres jest już na liście. Wysłaliśmy ponownie
  link potwierdzający.”; błąd serwera / limit → komunikat w `role="alert"`.
- **Dostępność:** etykieta pola widoczna dla czytników (`<label>`), animowane telefony
  `aria-hidden`, a obok niewidoczny opis „Podgląd aplikacji: nagranie głosowe zamienia się
  w plan dnia”.
- **Kryteria:** H1 + formularz widoczne bez przewijania na 360×740 i 1280×720;
  LCP < 2,5 s (H1 tekstem, nie obrazem); CLS 0 przy ładowaniu fontów.

#### Sekcja 2: Problem
- **Cel:** nazwać ból.
- **Układ:** wąska kolumna (max 760 px), duża typografia, trzy krótkie akapity jako
  „lista z głowy” przekreślana po kolei przy przewijaniu.
- **Treść:**
  - H2: „Lista rośnie. Dzień się nie rozciąga.”
  - „Masz zadania w notatkach, w mailach, na karteczkach i w głowie o 23:40.”
  - „Planujesz ambitnie o 8:00. O 11:00 jedno spotkanie się przeciąga i cały plan
    przestaje mieć sens.”
  - „Wieczorem zostaje poczucie, że nic nie zrobiłeś — choć zrobiłeś sporo.”
    (ZAŁOŻENIE: zamienić na formę bezosobową, jeśli copy ma być neutralne płciowo:
    „…że dzień przeleciał bez efektu — choć efekt był.”)
- **Bez statystyk** (nie mamy prawdziwych źródeł).
- **Kryteria:** przekreślanie przez `animation-timeline: view()` z fallbackiem
  IntersectionObserver; reduced motion: tekst bez przekreśleń.

#### Sekcja 3: Jak to działa
- **Cel:** zrozumienie w 3 krokach.
- **Układ:** desktop: 3 kolumny, każda = telefon z jednym ekranem + numer + krótki tekst;
  numery duże, typograficzne. Mobile: pionowo, telefon nad tekstem; poziomy przewijany
  karuzelą **nie** (zwykła kolumna).
- **Treść:**
  1. „Powiedz.” — „Przytrzymaj przycisk i mów, jak do przyjaciela. Bez formułek,
     możesz się poprawiać w trakcie.”
  2. „Ogarnij rozkłada.” — „Zadania, terminy, osoby i czas trwania. Duże rzeczy
     dostają pierwszy 10-minutowy krok.”
  3. „Dzień sam się układa.” — „Ciężkie zadania w Twoich godzinach energii, przerwy
     między spotkaniami, zapas na niespodzianki.”
- **Kryteria:** każdy ekran telefonu to HTML/CSS (nie obraz), czytelny w 360 px.

#### Sekcja 4: Demo „Wypróbuj na sucho” (`#demo`)
- **Cel:** dowód działania bez instalacji.
- **Układ:** desktop: 2 kolumny — lewa: pole tekstowe (wstępnie wypełnione przykładem)
  + przyciski „Dyktuj” (jeśli Web Speech API) i „Ułóż mój dzień”; prawa: telefon z wynikiem
  (lista zadań z czasem + oś dnia). Mobile: pole → przyciski → telefon.
- **Treść:**
  - H2: „Wypróbuj na sucho”
  - Opis: „Wpisz albo podyktuj, co masz dziś do zrobienia. To demo działa
    w przeglądarce bez AI — rozpoznaje proste wzorce, żeby pokazać, jak wygląda wynik.
    Nic nie jest wysyłane.”
  - Przykład w polu: „rano siłownia, o 10 call z klientem godzinę, dokończyć prezentację
    na piątek, zadzwonić do mamy, kupić prezent dla Oli, wieczorem pranie”
  - Przycisk: „Ułóż mój dzień”; po wyniku: „Podoba się? Zapisz się na betę” → #zapisz
- **Logika (front, deterministyczna):** podział na zadania po przecinkach/„i”/nowych
  liniach; godziny („o 10”, „10:30”), pory („rano”, „wieczorem”), czas trwania
  („godzinę”, „30 min”), terminy („na piątek”) → etykieta; zadania „duże” (prezentacja,
  raport, projekt) dostają podkrok „Pierwsze 10 min: …”; układ na osi 8:00–20:00
  z przerwami 10 min; zadania stałe najpierw, reszta w wolne sloty.
- **Stany:** puste pole → przycisk nieaktywny + podpowiedź; > 20 zadań → „Na jeden dzień
  to za dużo — 8 trafi na jutro” (pokazuje wartość „Plan B”); brak Web Speech → przycisk
  „Dyktuj” ukryty.
- **Dostępność:** wynik w `aria-live="polite"`; oś dnia jako lista `<ol>` z godzinami.
- **Kryteria:** przykład daje sensowny plan (≥ 6 pozycji, poprawne 10:00–11:00 call);
  działa offline; zero wywołań sieciowych w demo.

#### Sekcja 5: Funkcje (rezultaty)
- **Układ:** naprzemienne rzędy (tekst | ekran, ekran | tekst), nie siatka identycznych
  kart. 5 rzędów.
- **Treść:**
  1. „Zrzut z głowy w minutę” — głos → zadania, terminy, osoby.
  2. „Pierwszy krok zamiast wielkiego zadania” — „Napisać pracę” → „Otwórz plik i wpisz
     3 nagłówki (10 min)”.
  3. „Plan według energii” — ustawiasz godziny, w których myślisz najlepiej; tam trafia
     najtrudniejsza praca.
  4. „Twój kalendarz, nie nowy” — Google Calendar i Outlook (w becie), Apple — później.
  5. „Domknięcie dnia w 2 minuty” — co zrobione, co przechodzi, bez czerwonych liczników
     zaległości.

#### Sekcja 6: Plan B (wyróżnik)
- **Układ:** pełna szerokość, ciemniejsze tło sekcji; duża oś dnia (desktop poziomo,
  mobile pionowo). Przy przewinięciu: blok „Spotkanie 10:00–11:00” wydłuża się do 12:00,
  kolejne bloki przesuwają się, a jeden („Zakupy”) zjeżdża do strefy „Jutro” z etykietą
  „przeniesione — nie było miejsca”.
- **Treść:** H2: „Dzień się posypał? Plan nie.” · „Ogarnij przelicza resztę dnia
  i mówi wprost, co się nie zmieści. Ty decydujesz: przenieść, skrócić czy odpuścić.”
- **Kryteria:** animacja tylko transform/opacity; przycisk „Odtwórz ponownie”;
  reduced motion: dwa stany statyczne „przed / po” obok siebie.

#### Sekcja 7: Dla kogo
- Trzy sytuacje (nie avatary stockowe — typograficzne karty z cytatem‑scenariuszem
  oznaczonym jako przykład):
  - „Sesja i praca na pół etatu” — student/ka.
  - „Czterech klientów, zero szefa” — freelancer.
  - „Praca zdalna i odbiór z przedszkola o 16:00” — rodzic.
- Każda: problem → jak pomaga Ogarnij (2 zdania).

#### Sekcja 8: Prywatność i AI
- **Treść:** H2: „Twój głos zostaje Twój.” Lista faktów-założeń (ZAŁOŻENIE produktu):
  nagranie kasowane po transkrypcji; transkrypcje i zadania na serwerach w UE;
  nie trenujemy modeli na Twoich danych; eksport i usunięcie konta w ustawieniach.
  Podsekcja „Co robi AI, a czego nie”: robi — rozumie mowę, proponuje plan i kroki;
  nie robi — nie wysyła nic w Twoim imieniu, nie zmienia kalendarza bez akceptacji,
  może się pomylić, więc każdą propozycję możesz poprawić.
- **Kryteria:** link do `/prywatnosc`.

#### Sekcja 9: Cennik (planowany)
- **Układ:** 3 plany w rzędzie (mobile: pionowo, Plus pierwszy), przełącznik
  miesięcznie/rocznie. Plus wyróżniony obrysem, nie kolorem całej karty.
- **Treść:** nad planami: „Cennik po becie — może się jeszcze zmienić. Osoby z listy
  dostaną 3 miesiące Plus za darmo.” (ZAŁOŻENIE oferty).
  Darmowy 0 zł · Plus 19 zł/mies. lub 149 zł/rok · Duet 29 zł/mies.
  Pod spodem: „Anulujesz w aplikacji jednym kliknięciem. Przypomnimy 7 dni przed
  odnowieniem.”
- **CTA w każdej karcie:** „Zapisz się na betę” (bez płatności).

#### Sekcja 10: Mapa drogowa
- Oś pozioma (mobile pionowa): „Teraz: zapisy” → „Zima 2027: testy z 200 osobami” →
  „Wiosna 2027: zamknięta beta Android + iPhone” → „Lato 2027: Outlook, widżety,
  Duet” — wszystkie daty jako ZAŁOŻENIE.

#### Sekcja 11: FAQ (akordeon `<details>`)
Min. 8 pytań: Kiedy dostanę dostęp? · Ile to będzie kosztować? · Czy działa bez
internetu? · Co z moimi nagraniami? · Czy AI może się pomylić? · Czy działa
z Google Calendar? · Czy to aplikacja dla osób z ADHD? (odp.: projektujemy z myślą
o osobach, którym trudno utrzymać plan; to nie jest narzędzie medyczne) · Jak działa
kolejka i polecenia? · Jak się wypisać?

#### Sekcja 12: Końcowe CTA (`#zapisz`)
- H2: „Dołącz, zanim dzień znowu Cię wyprzedzi.” · formularz jak w hero + zgoda
  marketingowa (niezaznaczona, opcjonalna: „Chcę też dostawać porady o planowaniu
  raz w miesiącu”) + klauzula informacyjna (skrót + link).

#### Sekcja 13: Stopka
Logo + jedno zdanie, linki: Prywatność, Zasady listy, Kontakt (e-mail
`[DO UZUPEŁNIENIA: kontakt@…]`), dane firmy `[DO UZUPEŁNIENIA: nazwa, NIP, adres]`,
„© 2026 Ogarnij. Projekt fikcyjny — strona demonstracyjna.” (ZAŁOŻENIE: to fikcyjny
startup, więc stopka mówi to wprost).

### Strona `/potwierdz` + `/kolejka`
- Po kliknięciu linku: „Gotowe, jesteś na liście.” + duża liczba „Twoje miejsce: 412”
  + link polecający z przyciskiem „Kopiuj” i „Udostępnij” (Web Share API) + licznik
  poleceń + zasada: „Każda osoba, która potwierdzi zapis z Twojego linku, przesuwa Cię
  o 5 miejsc.”
- Token nieważny/wygasły → komunikat i formularz ponownego wysłania.
- **Kryteria:** pozycja liczona na serwerze; polecenie liczy się dopiero po potwierdzeniu
  e-maila poleconej osoby; nie można polecić samego siebie (ten sam e-mail/token).

## 9. Kierunek designu
- **Koncept:** „Z chaosu w oś czasu.” Strona sama robi to, co produkt — nieuporządkowane
  słowa (głos, notatki) układają się w czystą, rytmiczną oś dnia. Ciemne tło jak
  w inspiracji, ale z jednym zdecydowanym kolorem akcji zamiast fioletowej poświaty.
- **Proponowane kierunki (website-design zrobi z nich dema HTML):**
  1. **„Nocny plan” (najbliżej inspiracji)** — tło #0F0E17, powierzchnie #1A1925,
     tekst #F4F1EA, akcent koralowy #FF6B4A (CTA), drugi akcent miętowy #7FE0C2 (oś
     czasu/„zrobione”). Nagłówki: Bricolage Grotesque 700–800; tekst: Manrope 400–600.
  2. **„Papierowy terminarz”** — jasne tło #F4EFE6, atrament #18171C, czerwień
     #E5482F, linie siatki jak w kalendarzu; nagłówki Instrument Serif, tekst Geist/
     Manrope; telefony w ciemnym motywie jako kontrast.
  3. **„Śliwka bez poświaty”** — głęboka śliwka #1C1027, magenta #FF3D8B, kremowy
     #FFF4E8; bezpośredni ukłon w stronę FlyTask, ale płaskie bloki kolorów, zero blobów
     i gradientowego tekstu. Nagłówki Space Grotesk 700, tekst Manrope.
- **Wzorce do nauki:** Linear (rytm sekcji, precyzyjne makiety UI w HTML), Things 3
  (spokój i czytelność listy zadań), Arc/The Browser Company (osobowość copy),
  Cron/Notion Calendar (estetyka osi dnia).
- **Zakazy (AI slop):** fioletowo-niebieskie gradienty, świecące bloby, glassmorphism,
  gradientowy tekst, emoji jako ikony, trzy identyczne karty z ikoną w kółku, bento
  dla samego bento, plakietki nad każdym nagłówkiem, ludzie z laptopami (stock/AI),
  zmyślone loga „as seen in”, zmyślone opinie i liczby, fade-up na każdym elemencie.
- **Uwagi:** website-design przygotuje dema HTML do wyboru (Komputer/Telefon).

## 10. Funkcje i integracje
- **Waitlista (backend Node):**
  `POST /api/waitlist` {email, ref?, consentMarketing, honeypot} → walidacja
  (format, długość ≤ 254, domeny jednorazowe — opcjonalnie), normalizacja (lowercase,
  trim), rate limit 5/10 min/IP, honeypot, zapis `pending` + token potwierdzenia
  (losowy 32 B, ważny 72 h) → e-mail potwierdzający (w dev: zapis do `outbox/`
  i log w konsoli). Odpowiedź zawsze tej samej postaci (bez ujawniania, czy e-mail
  istniał — poza komunikatem „wysłaliśmy ponownie”).
  `GET /potwierdz?token=` → status `confirmed`, przydzielenie kodu polecającego,
  zaliczenie polecenia osobie polecającej.
  `GET /api/waitlist/me?key=` → pozycja, liczba poleceń (klucz prywatny z e-maila).
  `GET /api/waitlist/stats` → liczba potwierdzonych (zaokrąglona do 10, gdy < 100 → null).
  `POST /api/survey` → odpowiedź na 1 pytanie (powiązana z kluczem).
- **Pozycja:** kolejność potwierdzenia − 5 × potwierdzone polecenia (min. 1), liczona
  na serwerze.
- **Wypis:** link w e-mailu → `unsubscribed`.
- **Podgląd właściciela (propozycja):** `/admin` za hasłem z env (Basic/session),
  tabela, filtr statusu, eksport CSV.
- **Analityka:** zdarzenia `waitlist_submit`, `waitlist_confirm`, `demo_run`,
  `demo_dictate`, `referral_copy`, `pricing_toggle` — narzędzie bezciasteczkowe.

## 11. Treści i materiały
- **Co dostarcza klient:** nazwa firmy/dane do stopki (lub zgoda na „projekt fikcyjny”),
  e-mail kontaktowy, ewentualnie logo (inaczej: logotyp typograficzny).
- **Co przygotuje AI:** wszystkie teksty (szkice powyżej), makiety ekranów aplikacji
  w HTML/CSS, ikonografia z jednego zestawu (Lucide), grafika OG.
- **Opinie:** brak — produkt przed startem. Żadnych opinii ani logotypów. Zamiast tego
  prawdziwy licznik zapisów od progu.
- **Zdjęcia:** niepotrzebne (UI jako wizualizacja). Opcjonalnie później: 3 zdjęcia
  prawdziwych osób z testów (poziomo, naturalne światło, telefon w dłoni).

## 12. Prawo, SEO, dostępność, wydajność
- Polityka prywatności (szkic do weryfikacji), klauzula przy formularzu, double opt-in,
  zasady listy/poleceń, informacja o AI, brak ciasteczek marketingowych.
- Schema: SoftwareApplication + Organization + FAQPage; OG 1200×630; sitemap, robots,
  canonical; `lang="pl"`.
- WCAG 2.2 AA: kontrast ≥ 4,5:1 dla tekstu (szczególnie koral na ciemnym — sprawdzić;
  tekst na przycisku koralowym ciemny #0F0E17), fokus widoczny, cele ≥ 44 px,
  reduced motion.
- Wydajność: fonty self-hosted subset latin-ext + `font-display: swap`, brak obrazów
  w LCP, JS < 60 kB (bez frameworka), animacje CSS.

## 13. Technologia i ograniczenia
- Stack: **Node.js 22 (wbudowany `node:http` lub Express) + SQLite (`node:sqlite`,
  wbudowany w Node 22.13)**, statyczny front HTML/CSS/vanilla JS, bez kroku budowania.
- Hosting: dowolny VPS/Render/Fly; lokalnie `npm start`.
- Budżet/termin: projekt demonstracyjny — liczy się jakość i kompletność.
- Edycja treści: w plikach HTML (opcja 2 nie wymaga CMS dla jednej strony).
- Folder projektu: `C:\Users\huber\Desktop\skill test\z skillami` (test porównawczy
  „z skillami” vs „bez skilli”).

## 14. Przydatne MCP przy budowie
- **Playwright MCP** — zrzuty 360/768/1280/1920 i klikanie przepływu zapisu
  (alternatywa: lokalny Chrome/Edge headless, jeśli MCP niedostępny).
- Nic więcej nie jest potrzebne (brak płatności, brak Supabase).

## 15. Założenia i pytania otwarte
- ZAŁOŻENIE: pomysł „Ogarnij” dobrany przez strategist (kategoria jak w inspiracji —
  zadania i czas, ale z polskim głosem jako przewagą).
- ZAŁOŻENIE: to strona fikcyjnego startupu — stopka mówi to wprost; dane firmy jako
  placeholdery.
- ZAŁOŻENIE: cennik, daty bety i bonus „3 miesiące Plus” są projektowe, oznaczone jako
  „może się zmienić”.
- ZAŁOŻENIE: e-maile w trybie deweloperskim zapisywane do `outbox/` (bez prawdziwej
  wysyłki SMTP); konfiguracja SMTP przez env opcjonalnie.
- ZAŁOŻENIE: copy zwraca się na „Ty”, neutralnie płciowo tam, gdzie się da.
- PYTANIE: czy wolisz inną nazwę lub inny pomysł? (np. „Wyceniacz” — kosztorys głosem
  dla fachowców — gdyby kategoria planera była zbyt bliska inspiracji).
- PYTANIE: który kierunek designu (1–3) — rozstrzygną dema website-design.
