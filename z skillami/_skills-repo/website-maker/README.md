# 🏗️ Website Maker

Skill, który z krótkiego opisu („potrzebuję strony dla firmy, która myje kostkę”)
robi **przemyślaną, dobrze zaprojektowaną stronę albo sklep**. Najpierw analizuje
wymagania, potem daje do wyboru 4 warianty i dopiero po wyborze projektuje i buduje.

## Jak działa

### Część A: wymagania i propozycja

1. **Czyta opis.** Wyciąga biznes, ofertę, odbiorcę, cel strony i to, co już masz.
   Pyta tylko o brakujące rzeczy, najwyżej o 5 naraz.
2. **Analizuje wymagania z czterech źródeł:**
   - to, o co prosisz,
   - to, co musi mieć **każda** profesjonalna strona (nawigacja, kontakt, SEO, szybkość,
     dostępność, RODO, cookies),
   - to, co musi mieć **ten typ** strony (w zestawie 20 typów: usługi lokalne, salony,
     restauracje, sklepy różnych branż, SaaS, portfolio, nieruchomości, hotele, siłownie,
     B2B, NGO i inne),
   - **bestsellery i mainstream:** jeśli ma dostęp do internetu, przegląda 5–10 liderów
     z Twojej branży i regionu i spisuje, co mają wszyscy, a czym wyróżniają się najlepsi.
3. **Pokazuje propozycję:**
   - **na samej górze: 🔥 Propozycje spoza Twojej listy**, czyli funkcje, których nie było
     w opisie, a które mają najlepsze strony tego typu. Każda ma uzasadnienie, wskazaną
     opcję i szacowany nakład pracy,
   - fundament, który ma każda opcja,
   - **4 opcje, każda bardziej rozbudowana:**

| Opcja | Co to jest |
|---|---|
| **1 — Front** | dopracowany front: header, hero, oferta, opinie, galeria, FAQ, kontakt, animacje, ikony, SEO |
| **2 — Front + backend** | serwer i baza: treści i ceny z backendu, zapisywane formularze, kalkulator lub rezerwacje, blog, newsletter |
| **3 — Panel + płatności** | panel admina z rolami, BLIK, Przelewy24, PayU, Stripe, checkout, zamówienia, faktury, rabaty, konta klientów |
| **4 — Tryb ostateczny** | wszystko, co ma lider branży: wiele języków, wyszukiwarka, lojalność, subskrypcje, asystent AI, integracje (Allegro, InPost, KSeF), automatyzacje, PWA, monitoring |

   Wybierasz numer i możesz go dowolnie zmienić, np. „2 + płatności BLIK” albo
   „3 bez kont klientów”.

### Część B: design i budowa

4. **Najpierw system designu.** Koncept wzięty z Twojego biznesu (materiał, miejsce,
   rzemiosło), a nie z szablonu „nowoczesny i czysty”. Do tego tokeny (kolory ze
   sprawdzonym kontrastem, typografia z polskimi znakami, odstępy, ruch) i komplet
   komponentów.
5. **Treści po polsku.** Konkretne, bez fraz w stylu „kompleksowe rozwiązania”.
   **Nie wymyśla opinii, liczb ani logotypów.** Miejsca do uzupełnienia są wyraźnie
   oznaczone i trafiają na listę.
6. **Budowa sekcja po sekcji.** Mobile-first, semantyczny HTML, animacje z sensem
   i z obsługą `prefers-reduced-motion`. Domyślnie Node.js albo Twoja technologia.
7. **Sprawdzenie:** 4 szerokości ekranu, zrzuty w przeglądarce (jeśli jest narzędzie),
   dostępność, Core Web Vitals, SEO, działające formularze i płatności w sandboxie,
   a na koniec przegląd pod kątem AI slopu.

## Współpraca z innymi skillami

| Skąd → dokąd | Jak to działa |
|---|---|
| 🧭 **strategist → maker** | strategist po rozmowie i lekkim audycie przygotowuje `SITE-BRIEF.md`: wymagania, trendy z dowodami, propozycje, rekomendowaną opcję i specyfikację kluczowych stron. Maker czyta go jako brief, nie pyta drugi raz o to samo i wypełnia z niego 4 opcje. Bez briefu może użyć strategista do researchu rynku |
| 🎨 **design ↔ maker** | wspólne tokeny i pliki (`DESIGN-SYSTEM.md`, `tokens.css`). W fazie designu maker korzysta z dem HTML ze skilla design, a bez niego robi 2–3 dema sam. Wybrany wygląd od razu pasuje do budowanej strony |
| 🛡️ **maker → security** | przy opcjach 2–4 audyt bezpieczeństwa przed publikacją |
| 🧭 **maker → strategist** | miesiąc po starcie audyt rozwoju na prawdziwych danych |

## Co jeszcze potrafi

- **`SITE-PLAN.md`, czyli pamięć projektu:** zakres, mapa strony z postępem, decyzje,
  lista placeholderów i otwarte pytania. Dzięki temu budowa może trwać kilka sesji
  i nic się nie gubi.
- **MCP do budowy:** po wyborze opcji proponuje w jednej wiadomości narzędzia, które
  przyspieszą pracę i zaoszczędzą tokeny. Playwright pozwala samemu obejrzeć stronę na
  telefonie i komputerze, Context7 daje aktualną dokumentację frameworków, Stripe
  i Supabase są dostępne w trybie testowym, do tego Figma, shadcn, Vercel i Netlify.
  Nic nie instaluje samodzielnie.
- **Pakiet treści dla właściciela:** lista tekstów i danych do dostarczenia oraz
  **lista zdjęć do zrobienia** (co, w jakim kadrze, ile sztuk).
- **Checklista publikacji:** domena, SSL, przekierowania 301 ze starej strony, Search
  Console, Google Business Profile, analityka ze zgodą, kopie zapasowe, 2FA, SPF/DMARC,
  przełączenie płatności na produkcję i monitoring.

## Plusy

- **Nie zapomina o niczym ważnym.** Must-have dla każdej strony i dla każdego typu jest
  wpisany na stałe.
- **Podpowiada więcej, niż prosisz.** Propozycje spoza listy pochodzą z liderów branży,
  a nie z wyobraźni.
- **Zero AI slopu.** Lista zakazanych wzorców obejmuje fioletowe gradienty, emoji jako
  ikony, trzy identyczne karty, szare teksty i frazy w stylu „Odkryj”, „Pasja
  i profesjonalizm”, a obok niej są wzorce, które warto stosować zamiast nich.
- **Wzorce od najlepszych:** Dieter Rams, Refactoring UI, Laws of UX, Baymard, Emil
  Kowalski (animacje), sklepy Apple, Bellroy, Aesop, Teenage Engineering, Glossier,
  Our Place i inne, z opisem, czego się od każdego uczyć.
- **Polski rynek:** BLIK, P24, PayU, InPost, Omnibus, GPSR, KSeF, Europejski Akt
  o Dostępności, regulamin i 14 dni na odstąpienie.
- **Uczciwość:** żadnych fałszywych opinii ani statystyk.

## Przykładowe polecenia

- „Zrób stronę dla firmy myjącej kostkę brukową w Trójmieście”
- „Potrzebuję sklepu z kawą speciality, mam logo i zdjęcia”
- „Stwórz stronę dla salonu fryzjerskiego z rezerwacjami”
- „Landing page dla mojej aplikacji do nauki angielskiego”

## Struktura

```
website-maker/
├── SKILL.md                      # instrukcje dla AI (po angielsku)
└── references/
    ├── requirements.md           # pytania, must-have każdej strony, prawo PL/UE, research rynku
    ├── site-types.md             # 20 typów stron: must-have + trendy
    ├── tiers.md                  # 4 opcje szczegółowo, technologie, przykłady
    ├── design-playbook.md        # proces designu, anty-slop, typografia, kolor, ruch, QA
    ├── inspiration.md            # styliści, studia, galerie, najlepsze sklepy
    ├── design-tokens-contract.md # wspólne tokeny z website-design
    ├── mcp-toolkit.md            # MCP przydatne przy budowie
    └── launch-checklist.md       # checklista publikacji
```

> 💡 Przy opcjach 2–4 przed publikacją warto puścić **website-security-checker**.
