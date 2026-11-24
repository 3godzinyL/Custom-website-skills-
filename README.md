# Skille do budowy stron 🧰

Cztery skille dla Claude (i innych AI), które pomagają przy stronie na każdym etapie:
od pomysłu, przez projekt i budowę, po rozwój i bezpieczeństwo.

**Instrukcje są po angielsku**, bo modele wykonują je wtedy najdokładniej. **Rozmowa
i wyniki są po polsku:** skille rozumieją polskie polecenia (także pisane potocznie
albo dyktowane), odpowiadają po polsku i budują strony z polskimi treściami
i działającymi polskimi znakami. Uruchamiają się też na polskie hasła, np. „zrób
stronę”, „sprawdź bezpieczeństwo”, „czego brakuje na mojej stronie”.

---

## Co jest w paczce

| Skill | W skrócie | Kiedy użyć |
|---|---|---|
| 🛡️ [**website-security-checker**](website-security-checker/) | robi mapę całej strony i sprawdza bezpieczeństwo wszystkiego, co na niej znalazł | przed publikacją, po zmianach, przy sklepie i płatnościach |
| 🏗️ [**website-maker**](website-maker/) | analizuje wymagania, proponuje 4 coraz większe warianty, a po wyborze projektuje i buduje stronę | gdy chcesz nową stronę albo sklep |
| 🧭 [**website-strategist**](website-strategist/) | robi audyt rozwoju na tle branży albo po rozmowie pisze długi prompt dla innego AI | gdy pytasz „czego brakuje?” albo potrzebujesz briefu |
| 🎨 [**website-design**](website-design/) *(v0.1, roboczy)* | kierunek wizualny, ocena designu, redesign | gdy chodzi o wygląd, kolory, fonty i animacje |

---

## 🛡️ Website Security Checker

**Najpierw sprawdza, co jest na stronie, a dopiero potem to testuje.** Skill robi
inwentaryzację: serwer, hosting, front, API, formularze, logowanie, sklep, płatności,
webhooki, CMS, skrypty zewnętrzne, subdomeny, chatboty. Potem dobiera testy do tego,
co znalazł: XSS, injection, wycieki danych i kluczy, dostęp do cudzych zamówień (IDOR),
podmianę ceny w koszyku, weryfikację płatności (Przelewy24, PayU, Tpay, Stripe, BLIK),
czy treści i ceny pochodzą z backendu, Supabase/Firebase, CORS, CSRF, nagłówki,
ciasteczka, SPF/DMARC, RODO i AI.

**Plusy:**
- trafia w funkcje, które strona naprawdę ma, zamiast przechodzić listę na ślepo,
- wyłapuje typowe błędy stron „robionych z AI”,
- w zestawie pasywny skaner w czystym Node (`passive-scan.mjs`), bez instalacji,
- działa bezpiecznie: bez DoS, prawdziwych zamówień i pobierania cudzych danych,
- raport po polsku z podsumowaniem dla właściciela, gotowymi poprawkami w kodzie
  i tabelą tego, co sprawdzono, a czego nie.

## 🏗️ Website Maker

**Od opisu do gotowej strony, w której nie brakuje niczego ważnego.** Skill analizuje
to, o co prosisz, must-have każdej strony, must-have Twojego typu strony (20 typów)
i to, co mają liderzy branży. Na samej górze pokazuje **🔥 Propozycje spoza Twojej
listy**, a pod nimi **4 opcje**:

1. **Front:** header, oferta, opinie, galeria, FAQ, kontakt, animacje, ikony, SEO
2. **Front + backend:** treści i ceny z serwera, zapisywane formularze, kalkulator, blog
3. **Panel admina + płatności:** BLIK, P24, PayU, Stripe, zamówienia, faktury, rabaty
4. **Tryb ostateczny:** wszystko, co ma lider branży, np. wiele języków, AI, integracje, automatyzacje, PWA

Wybierasz numer, np. „2 + BLIK”. Skill przygotowuje spójny system designu z konceptem
wziętym z Twojego biznesu i buduje stronę sekcja po sekcji.

**Plusy:**
- nie zapomina o rzeczach obowiązkowych, takich jak RODO, Omnibus, regulamin czy
  dostępność,
- działa przeciw AI slopowi: ma listę zakazanych wzorców i fraz, także polskich,
- korzysta ze wzorców od najlepszych (Rams, Refactoring UI, Baymard, Apple, Aesop,
  Bellroy…),
- nie wymyśla opinii ani liczb, a placeholdery są oznaczone,
- przed oddaniem sprawdza: 4 szerokości ekranu, dostępność, Core Web Vitals,
  działające formularze.

## 🧭 Website Strategist

**Strateg, który najpierw rozumie Twoją branżę, a potem ocenia stronę.**

- **Tryb A, audyt rozwoju.** Spisuje wszystko, co jest na stronie, ustala niszę
  i model biznesowy, porównuje stronę z liderami i bestsellerami, sprawdza wymagania
  nieodłączne i **warunkowe** (np. „masz promocje, więc potrzebujesz najniższej ceny
  z 30 dni”). Dostajesz ocenę 10 obszarów, braki, szanse, szybkie wygrane i plan
  z priorytetami.
- **Tryb B, rozmowa i prompt.** Rozmawiacie w rundach o tym, czego potrzebujesz.
  Skill analizuje, co musi mieć ten typ strony, i pisze **bardzo długi prompt** dla
  innego AI: design z wartościami, mapę strony, specyfikację sekcja po sekcji
  (położenie na każdym ekranie, teksty, animacje, kryteria akceptacji), funkcje,
  SEO, prawo i QA.

**Plusy:** każda rada ma uzasadnienie (konkurencja, badania, zasada UX). Ma ponad
25 reguł warunkowych i 15 nisz w zestawie, a prompt jest na poziomie specyfikacji
agencyjnej.

## 🎨 Website Design (v0.1)

**Art director w jednym skillu.** Proponuje 3 różne kierunki wizualne, przygotowuje
tokeny, komponenty i animacje, ocenia design w 10 kryteriach ze skanem AI slopu
i robi redesign bez ruszania treści.

**Plusy:** 11 kierunków stylu ze sprawdzonym kontrastem, gotowe animacje
z `prefers-reduced-motion`, polska typografia. To wersja robocza, którą łatwo
rozbudować.

---

## Jak skille współpracują

```
 pomysł ──► 🧭 strategist (rozmowa → prompt) ──► 🏗️ maker (4 opcje → budowa) ──► 🛡️ security-checker
                                                     ▲                               │
                                         🎨 design ──┘                               ▼
 istniejąca strona ──► 🧭 strategist (audyt rozwoju) ──► poprawki ──► 🛡️ ponowny test
```

---

## Instalacja

**Claude Code.** Skopiuj foldery skilli do jednego z miejsc:
- `~/.claude/skills/` (wszystkie projekty), na Windows `C:\Users\<Ty>\.claude\skills\`
- `.claude/skills/` w konkretnym projekcie

```powershell
Copy-Item -Recurse website-* "$env:USERPROFILE\.claude\skills\"
```

**Claude.ai / aplikacja Claude.** Spakuj każdy folder skilla osobno do ZIP-a (w środku
ma być folder z `SKILL.md`) i dodaj go w *Settings → Capabilities → Skills*.

**Inne AI (ChatGPT, Gemini, Codex itd.).** Wklej treść `SKILL.md` jako instrukcję
systemową albo pierwszą wiadomość. Pliki z `references/` dołącz jako załączniki albo
wklej, gdy AI ich potrzebuje.

Po instalacji wystarczy pisać normalnie po polsku, np. *„Sprawdź bezpieczeństwo mojej
strony https://…”*. Skill uruchomi się sam. Możesz też wywołać go po nazwie, np.
`/website-maker`.

## Wymagania

- Do budowy stron i skanera: **Node.js 18+**
- Opcjonalnie: dostęp do internetu (research konkurencji, trendy, testy na żywo)
  i narzędzie przeglądarki (zrzuty ekranu, sprawdzanie wyglądu)

## Struktura repozytorium

```
skille/
├── README.md
├── website-security-checker/   SKILL.md · README.md · references/ · scripts/passive-scan.mjs
├── website-maker/              SKILL.md · README.md · references/
├── website-strategist/         SKILL.md · README.md · references/
└── website-design/             SKILL.md · README.md · references/
```

> ⚠️ Website Security Checker używaj tylko na stronach, które są Twoje albo na których
> masz zgodę na test. Listy prawne (RODO, Omnibus, KSeF…) to checklisty do budowy,
> a nie porada prawna.
