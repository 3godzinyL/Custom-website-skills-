# Handoff to website-maker: SITE-BRIEF.md

When the site will be built with the **website-maker** skill, produce `SITE-BRIEF.md`
in this format (in addition to, or instead of, the generic master prompt). The maker
reads it as its brief: it skips questions already answered, adopts the research and
pre-fills its four options. Write the brief in the user's language; keep the section
headings below unchanged so the maker can find them.

## How to prepare it

1. Finish the interview (`discovery-interview.md`) — every section below must be filled
   or marked `ZAŁOŻENIE:`.
2. Do the **light audit** (SKILL.md, Mode B step B2a): of the current site if there is
   one, otherwise of 3–5 competitors.
3. Do the niche analysis: inseparable + conditional requirements, bestsellers, trends
   (`trends-2026.md`), with evidence.
4. Recommend one of the maker's options (1–4) with a reason, and list what could move
   the project to the next option later.
5. Write section specs for the key pages at the same level of detail as the master
   prompt (`build-prompt-template.md` §7) — the maker builds faster and better from them.
6. Save as `SITE-BRIEF.md` in the project root (or give it in the chat), then tell the
   user: „Uruchom website-maker i wskaż ten plik” — or start it directly if both skills
   are available and the user agrees.

## Template

````markdown
# SITE-BRIEF — <nazwa strony>
Przygotowane przez: website-strategist · Data: <RRRR-MM-DD> · Wersja: 1

## 1. Biznes
- Firma, oferta, ceny/widełki:
- Odbiorca (kto, skąd, potrzeby, obawy):
- Rynek / obszar:
- Wyróżniki (konkretne, prawdziwe):
- Główna akcja na stronie / akcje dodatkowe:
- Mierniki sukcesu:

## 2. Typ strony i model
- Typ (wg website-maker site-types):
- Model biznesowy:
- Rekomendowana opcja website-maker: <1–4> — dlaczego:
- Co przenieść do kolejnej opcji później:

## 3. Lekki audyt
- Obecna strona (jeśli jest): 5–10 najważniejszych braków i mocnych stron
- Konkurencja (3–5): tabela funkcji i wnioski

## 4. Wymagania
### 4.1 Nieodłączne dla tego typu strony
### 4.2 Warunkowe (wyzwolone przez funkcje) — z uzasadnieniem
### 4.3 Uniwersalne (każda strona)
### 4.4 Życzenia klienta

## 5. Bestsellery i trendy (z dowodami)
| Funkcja / trend | Dowód (strony, badania) | Dla tych odbiorców, bo… | Opcja |
|---|---|---|---|

## 6. Propozycje spoza listy klienta
| Propozycja | Dlaczego | Opcja | Nakład |
|---|---|---|---|

## 7. Mapa strony
<strony, URL-e, kolejność sekcji na głównej z uzasadnieniem>

## 8. Specyfikacja kluczowych stron (sekcja po sekcji)
<jak w build-prompt-template §7: cel, położenie desktop/tablet/mobile, szkic treści, komponenty, dane, interakcje, stany, kryteria akceptacji>

## 9. Kierunek designu
- Koncept (2–3 zdania z biznesu):
- Proponowane 2–3 kierunki (nazwa, nastrój, kolory hex, fonty z polskimi znakami):
- Wzorce do nauki (strona → zasada):
- Zakazy (AI slop):
- Uwagi: website-design przygotuje dema HTML do wyboru

## 10. Funkcje i integracje
<formularze, kalkulatory, rezerwacje, płatności, panel, konta, integracje; przepływy i walidacja>

## 11. Treści i materiały
- Co dostarcza klient (teksty, zdjęcia — lista ujęć, logo, dane firmy):
- Co przygotuje AI (szkice tekstów):
- Opinie: prawdziwe źródło / placeholdery

## 12. Prawo, SEO, dostępność, wydajność
<wymagania wyzwolone + schema.org + lokalne SEO + WCAG 2.2 AA + Core Web Vitals>

## 13. Technologia i ograniczenia
<stack, hosting, domena, budżet, termin, kto edytuje treści>

## 14. Przydatne MCP przy budowie
<np. Playwright do kontroli wyglądu, Stripe w trybie testowym — z powodem>

## 15. Założenia i pytania otwarte
- ZAŁOŻENIE:
- PYTANIE:
````
