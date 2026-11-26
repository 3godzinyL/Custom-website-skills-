# 🏗️ Website Maker

Skill, który z krótkiego opisu („potrzebuję strony dla firmy, która myje kostkę”)
albo z `SITE-BRIEF.md` od strategista robi **przemyślaną, dobrze zaprojektowaną
i bezpieczną stronę albo sklep**. Najpierw analizuje wymagania, potem daje do wyboru
4 warianty, a po wyborze planuje budowę tak, żeby coś działającego było widać od
pierwszego etapu.

## Jak działa

### Część A: wymagania i propozycja

1. **Czyta opis albo brief.** Z `SITE-BRIEF.md` bierze radar kategorii, standard
   kategorii, kierunek i **Twoje decyzje**: zaakceptowane pomysły wchodzą do zakresu,
   „później” czekają na koniec, **odrzuconych nie proponuje ponownie**. Bez briefu pyta
   tylko o brakujące rzeczy, najwyżej o 5 naraz.
2. **Analizuje wymagania z czterech źródeł:** Twoje życzenia, fundament każdej strony
   (nawigacja, kontakt, SEO, szybkość, dostępność, RODO, cookies, a przy backendzie
   bezpieczne ustawienia), wymagania tego typu strony (20 typów) i liderzy branży.
3. **Pokazuje propozycję:** na górze **🔥 Propozycje spoza Twojej listy** (tylko nowe
   rzeczy, których brief nie rozstrzygnął), potem fundament i **4 opcje**:

| Opcja | Co to jest |
|---|---|
| **1 — Front** | dopracowany front: header, hero, oferta, opinie, galeria, FAQ, kontakt, animacje, ikony, SEO |
| **2 — Front + backend** | serwer i baza: treści i ceny z backendu, zapisywane formularze, kalkulator lub rezerwacje, blog, newsletter |
| **3 — Panel + płatności** | panel admina z rolami, BLIK, Przelewy24, PayU, Stripe, checkout, zamówienia, faktury, rabaty, konta klientów |
| **4 — Tryb ostateczny** | wszystko, co ma lider branży: wiele języków, wyszukiwarka, lojalność, subskrypcje, asystent AI, integracje (Allegro, InPost, KSeF), automatyzacje, PWA, monitoring |

   Wybierasz numer i możesz go zmienić, np. „2 + płatności BLIK” albo „3 bez kont
   klientów”.

### Część B: plan, design i budowa

4. **Plan budowy w pionowych wycinkach.** Najpierw jeden kompletny przepływ (strona
   główna → formularz → API → baza → e-mail → widok w panelu), widoczny w przeglądarce,
   potem kolejne. Nigdy „cały backend, a front później”. Przed kodem powstaje model
   danych i kontrakt API, więc front i backend się nie rozjeżdżają. Każdy wycinek ma
   definicję ukończenia.
5. **Szkielet bezpieczny od pierwszego commita:** `.gitignore` dla `.env`, `data/`, baz
   i logów, sprawdzenie konfiguracji przy starcie (w produkcji brak klucza płatności
   wyłącza płatności, a nie włącza sandboxa), nagłówki, limity, obsługa błędów.
6. **Design:** dema HTML ze skilla design (każde z własnym charakterem ruchu
   i „signature moment”) albo 2–3 dema zrobione przez makera. Potem tokeny, komponenty
   i zasady ruchu.
7. **Treści po polsku.** Konkretne, ze słów kluczowych i pytań odbiorców z briefu.
   **Nie wymyśla opinii, liczb ani logotypów.** Miejsca do uzupełnienia są oznaczone.
8. **Budowa wycinek po wycinku** z bezpiecznymi ustawieniami domyślnymi: walidacja
   i uprawnienia na serwerze, ceny liczone przez serwer, płatność tylko z podpisanego
   webhooka, jednorazowe kody rezerwowane atomowo, limity na IP i na konto, e-maile
   tylko na potwierdzone adresy.
9. **Sprawdzenie:** 4 szerokości ekranu, zrzuty w przeglądarce, dostępność, Core Web
   Vitals, SEO, działające formularze i płatności w sandboxie, przegląd AI slopu, a przy
   opcjach 2–4 **samokontrola bezpieczeństwa w 10 krokach** przed pełnym audytem.

## Dlaczego plan i bezpieczne ustawienia

Oba wynikają z testu porównawczego. Wersja „bez skilli” zbudowała kompletny backend
(68 endpointów), po czym skończył się limit i **nie było interfejsu**: po zalogowaniu
pusta strona, panel admina z błędem. Plan w wycinkach sprawia, że przerwanie w dowolnym
momencie zostawia działający kawałek produktu. Plik `secure-defaults.md` powstał z 51
problemów znalezionych w obu testach (np. płatności „na niby” bez klucza Stripe,
podgląd danych osobowych w roli tylko do odczytu, kod 2FA działający dwa razy,
obejście limitów przez `X-Forwarded-For`, zgoda zapisana z tekstu „false”, formularz
logowania bez `method="post"`, plik z hasłem admina w repozytorium).

## Współpraca z innymi skillami

| Skąd → dokąd | Jak to działa |
|---|---|
| 🧭 **strategist → maker** | `SITE-BRIEF.md` z radarem, decyzjami i specyfikacją stron. Maker nie powtarza researchu ani pytań, a decyzje traktuje jako wiążące |
| 🎨 **design ↔ maker** | wspólne tokeny i pliki (`DESIGN-SYSTEM.md`, `tokens.css`), także tokeny ruchu |
| 🛡️ **maker → security** | samokontrola przy budowie, pełny audyt przed publikacją (opcje 2–4) |
| 🧭 **maker → strategist** | miesiąc po starcie audyt rozwoju na prawdziwych danych |

## Co jeszcze potrafi

- **`SITE-PLAN.md`, czyli pamięć projektu:** wycinki ze statusami, kontrakt API, model
  danych, decyzje, placeholdery, wyniki samokontroli i zawsze aktualna linia
  **„Następny krok”**. Nowa sesja zaczyna dokładnie tam, gdzie skończyła poprzednia.
- **MCP do budowy:** Playwright (podgląd na telefonie i komputerze), Context7 (aktualna
  dokumentacja frameworków), Stripe i Supabase w trybie testowym, Figma, shadcn, Vercel,
  Netlify. Proponuje, nie instaluje.
- **Pakiet treści dla właściciela** z listą zdjęć do zrobienia.
- **Checklista publikacji:** domena, SSL, przekierowania 301, Search Console, Google
  Business Profile, analityka ze zgodą, kopie, 2FA, SPF/DMARC, **higiena repozytorium**,
  tryb produkcyjny, przełączenie płatności na produkcję.

## Przykładowe polecenia

- „Zrób stronę dla firmy myjącej kostkę brukową w Trójmieście”
- „Mam SITE-BRIEF.md od strategista, buduj opcję 3”
- „Potrzebuję sklepu z kawą speciality, mam logo i zdjęcia”
- „Stwórz stronę dla salonu fryzjerskiego z rezerwacjami”
- „Landing page z listą oczekujących dla mojej aplikacji”

## Struktura

```
website-maker/
├── SKILL.md                      # instrukcje dla AI (po angielsku)
└── references/
    ├── requirements.md           # pytania, must-have każdej strony, prawo PL/UE, research rynku
    ├── site-types.md             # 20 typów stron: must-have + trendy
    ├── tiers.md                  # 4 opcje szczegółowo, technologie, przykłady
    ├── build-plan.md             # wycinki, kontrakty, definicja ukończenia, wznawianie pracy
    ├── secure-defaults.md        # bezpieczne ustawienia z prawdziwych audytów + samokontrola
    ├── design-playbook.md        # proces designu, anty-slop, typografia, kolor, ruch, QA
    ├── inspiration.md            # styliści, studia, galerie, najlepsze sklepy
    ├── design-tokens-contract.md # wspólne tokeny z website-design
    ├── mcp-toolkit.md            # MCP przydatne przy budowie
    └── launch-checklist.md       # checklista publikacji
```
