# Handoff to website-maker: SITE-BRIEF.md

When the site will be built with the **website-maker** skill, produce `SITE-BRIEF.md`
in this format (in addition to, or instead of, the generic master prompt). The maker
reads it as its brief: it skips questions already answered, adopts the radar and the
decisions, pre-fills its four options and never re-proposes rejected ideas. Write the
brief in the user's language; keep the section headings below unchanged so the maker
can find them.

## Division of work (so nothing is done twice)

| Skill | Owns | Does not do |
|---|---|---|
| **strategist** | the WHAT and WHY: category, keywords, leaders, pulse, category standard, ideas and decisions, direction, page architecture, section specs, content plan | universal basics, code, visual system |
| **website-maker** | the HOW: universal foundation (legal, contact, SEO basics, speed, accessibility, secure defaults), the four options, build, verification, launch | re-research the category, re-ask decided questions |
| **website-design** | the LOOK and MOTION: demos, design system, signature moment, redesign | features and content strategy |
| **website-security-checker** | the PROOF: audit before launch and after big changes | building features |

So §4.3 below only lists *deviations* from the maker's foundation (e.g. "dwa języki od
startu", "dostępność ponad AA, bo odbiorcy 60+"), never the whole foundation again.

## How to prepare it

1. Decode the idea and run the radar (`trend-radar.md`).
2. Run the idea board and the acceptance round (`idea-board.md`); fill the gaps with
   the discovery interview (`discovery-interview.md`). Every section below must be
   filled or marked `ZAŁOŻENIE:`.
3. Recommend one maker option (1–4) with a reason, and what could move the project to
   the next option later.
4. Write section specs for the key pages at the level of the master prompt
   (`build-prompt-template.md` §7) — the maker builds faster and better from them.
5. Save as `SITE-BRIEF.md` in the project root (or give it in the chat), then tell the
   user: „Uruchom website-maker i wskaż ten plik” — or start it directly if both skills
   are available and the user agrees.

## Template

````markdown
# SITE-BRIEF — <nazwa strony>
Przygotowane przez: website-strategist · Data: <RRRR-MM-DD> · Wersja: 2
Radar: <lekki / głęboki>, <n> źródeł, stan na <RRRR-MM-DD>

## 0. Teza i słowa kluczowe
- Teza strony (1 zdanie):
- Kategoria / podkategoria (PL + EN):
- Typ kategorii → co strona musi zrobić najpierw:
- Słowa kluczowe (top 10–20): fraza → intencja → miejsce na stronie

## 1. Biznes
- Firma, oferta, ceny/widełki:
- Odbiorca (kto, skąd, potrzeby, obawy) · kupujący vs użytkownik:
- Rynek / obszar:
- Wyróżniki (konkretne, prawdziwe):
- Główna akcja na stronie / akcje dodatkowe:
- Mierniki sukcesu:

## 2. Typ strony i model
- Typ (wg website-maker site-types):
- Model biznesowy:
- Rekomendowana opcja website-maker: <1–4> — dlaczego:
- Co przenieść do kolejnej opcji później:

## 3. Radar kategorii
### 3.1 Liderzy (dlaczego na liście)
### 3.2 Karty stron konkurencji (obietnica, kolejność sekcji, oferta, dowody, CTA, interakcje, najlepsze / słabe)
### 3.3 Macierz funkcji (✓ / ✗ / częściowo, % liderów)
### 3.4 Obecna strona klienta (jeśli jest): 5–10 braków i mocnych stron

## 4. Wymagania
### 4.1 Standard kategorii (z radaru, ≥ 60–70 % liderów)
### 4.2 Warunkowe (wyzwolone przez funkcje) — z uzasadnieniem
### 4.3 Odstępstwa od fundamentu makera (tylko różnice; resztę maker dodaje sam)
### 4.4 Życzenia klienta

## 5. Fala: sygnały i trendy (z dowodami)
| Sygnał / trend | Źródło, data | Status | Dla tych odbiorców, bo… | Jak wykorzystać | Opcja |
|---|---|---|---|---|---|

## 6. Decyzje właściciela
### 6.1 Zaakceptowane pomysły
| # | Pomysł | Typ | Opcja | Kryterium akceptacji |
### 6.2 Później (do zaproponowania na końcu budowy)
### 6.3 Odrzucone — nie proponować ponownie (z powodem, jeśli podany)
### 6.4 Wybrany kierunek
<nazwa, obietnica, co zmienia na stronie>
### 6.5 Kierunki rozwoju produktu (jeśli były) i decyzja

## 7. Mapa strony
<strony, URL-e, kolejność sekcji na głównej z uzasadnieniem z radaru i kierunku>

## 8. Specyfikacja kluczowych stron (sekcja po sekcji)
<jak w build-prompt-template §7: cel, położenie desktop/tablet/mobile, szkic treści, komponenty, dane, interakcje, stany, kryteria akceptacji>

## 9. Kierunek designu
- Koncept (2–3 zdania z biznesu i kierunku):
- Proponowane 2–3 kierunki wizualne (nazwa, nastrój, kolory hex, fonty z polskimi znakami):
- Kandydat na „signature moment” (jedna zapamiętywalna interakcja):
- Język designu liderów (od czego się odróżnić, co jest konwencją kategorii):
- Wzorce do nauki (strona → zasada):
- Zakazy (AI slop):
- Uwagi: website-design przygotuje dema HTML do wyboru

## 10. Funkcje i integracje
<formularze, kalkulatory, rezerwacje, płatności, panel, konta, integracje; przepływy i walidacja>

## 11. Treści i materiały
- Pytania odbiorców → FAQ, poradniki, strony porównań:
- Co dostarcza klient (teksty, zdjęcia — lista ujęć, logo, dane firmy):
- Co przygotuje AI (szkice tekstów):
- Opinie: prawdziwe źródło / placeholdery

## 12. Prawo, SEO, dostępność, wydajność
<wymagania wyzwolone + mapa słów kluczowych → strony + schema.org + lokalne SEO + odpowiedzi dla wyszukiwarek AI + WCAG 2.2 AA + Core Web Vitals>

## 13. Technologia i ograniczenia
<stack, hosting, domena, budżet, termin, kto edytuje treści>

## 14. Przydatne MCP przy budowie
<np. Playwright do kontroli wyglądu, Stripe w trybie testowym — z powodem>

## 15. Założenia i pytania otwarte
- ZAŁOŻENIE:
- PYTANIE:

## 16. Źródła
| # | Źródło (URL) | Co z niego wzięto | Data |
|---|---|---|---|
````
