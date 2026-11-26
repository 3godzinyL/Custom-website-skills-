# Report template (long audit)

The report is the product of the audit. Write it in the user's language (default
Polish), complete and long: every endpoint, every scenario, every finding, every gap.
Do not reduce it to highlights. If it gets very large, split it into
`RAPORT-BEZPIECZENSTWA-<domena>-<data>.md` (sections 1–12) and
`ZALACZNIKI-<domena>-<data>.md` (section 13). In the chat give: section 1, the findings
table from section 4, the top findings in full, and the file paths.

Create the file in Phase 0 with the header and the `Stan audytu` block, then fill the
sections as the phases finish. Sections not reached yet stay as `(w toku)`.

````markdown
# Raport z audytu bezpieczeństwa i jakości — <domena / projekt>

> **Stan audytu** (aktualizowany po każdej fazie)
> Ukończone fazy: 0, 1, 1b, 1c … · Następny krok: <faza i konkretne zadanie>
> Serwery testowe: <porty, katalogi danych — zatrzymane: tak/nie>
> Pytania do właściciela: <…>

Data: <RRRR-MM-DD> · Wersja: <commit / data wdrożenia> · Tryb: <white / black / grey-box>
Środowiska: <produkcja / staging / lokalnie> · Konta testowe: <role>
Zakres: <domeny, subdomeny, repo, API> · Poza zakresem: <co i dlaczego>
Narzędzia: <passive-scan, map-routes, endpoint-matrix, MCP: …, npm audit, Semgrep …>

## 1. Podsumowanie dla właściciela
Ogólny poziom ryzyka: <Krytyczny / Wysoki / Średni / Niski>
Liczba problemów: Krytyczne <n> · Wysokie <n> · Średnie <n> · Niskie <n> · Informacyjne <n>
Błędy logiczne i funkcjonalne: <n> · Rozbieżności front↔back: <n>

<5–10 zdań bez żargonu: co grozi biznesowi (pieniądze, dane klientów, reputacja), co działa dobrze, co zrobić najpierw.>

**Napraw najpierw:**
1. <problem> — <skutek dla biznesu>
2. …

**Co jest zrobione dobrze:** <konkretnie>

## 1b. Szybki triaż (20 najczęstszych wpadek)
| # | Sprawdzenie | Wynik | Problem # |
|---|---|---|---|
| T1 | Sekrety we froncie | OK / Trafienie / N/D / Nie sprawdzono (powód) | |
| … | … | … | |
| T20 | Kopie zapasowe i odtwarzanie | … | |

## 2. Zakres i metoda
<fazy 0–8b, co wykonano w każdej, ile żądań, jakie konta, jakie konfiguracje (dev / produkcja / produkcja bez klucza / za proxy), jakie ograniczenia>

## 3. Mapa strony (inwentaryzacja)
<tabela z fazy 1 + architektura w 3–6 zdaniach: jak płyną dane między frontem, backendem, bazą i usługami zewnętrznymi>

## 4. Wszystkie problemy
| # | Ważność | Typ | Problem | Miejsce | Dowód | Status |
|---|---|---|---|---|---|---|
| S1 | Krytyczne | Bezpieczeństwo | … | … | Potwierdzone | Otwarte |
| B1 | Średnie | Błąd logiczny | … | … | Potwierdzone | Otwarte |
| M1 | Niskie | Rozbieżność front↔back | … | … | Do potwierdzenia | Otwarte |

Typy: Bezpieczeństwo (S) · Błąd logiczny/kodu (B) · Rozbieżność front↔back (M) · Przepływ biznesowy (F) · Konfiguracja (C)
Dowód: **Potwierdzone** (odtworzone: żądanie i odpowiedź albo linia kodu + uruchomienie) · **Do potwierdzenia** (rozumowanie; w szczegółach: czego brakuje do potwierdzenia)

## 5. Połączenia i endpointy
Podsumowanie: <n> połączeń w katalogu · <n> przetestowanych w pełni · <n> wzorcem · <n> nietestowanych (powód).
Najważniejsze wnioski: <…>
(pełny katalog z wynikami → Załącznik A)

## 6. Front oczami atakującego
<wyniki z frontend-attack-surface: co dało się zrobić w przeglądarce, co serwer zablokował>

## 7. Scenariusze ataków
| # | Scenariusz | Atakujący | Wynik | Problem # |
|---|---|---|---|---|

## 8. Przegląd kodu
### 8.1 Bezpieczeństwo kodu
### 8.2 Błędy logiczne i ogólne
### 8.3 Testy, typy, lint, zależności (wyniki uruchomień)

## 9. Zgodność frontu i backendu
| # | Funkcja | Front | Backend | Rozbieżność | Skutek | Problem # |
|---|---|---|---|---|---|---|

## 10. Płatności, triale, subskrypcje i inne przepływy
| Przepływ | Podłączone | Logiczne | Bezpieczne | Jak sprawdzono | Problemy |
|---|---|---|---|---|---|

## 10b. Konfiguracja produkcyjna i drugie przejście
| Konfiguracja / próba | Oczekiwane | Wynik | Problem # |
|---|---|---|---|
| Produkcja, wszystkie klucze | debug wył., HTTPS, HSTS, Secure | | |
| Produkcja bez klucza płatności / maila / AI | funkcja wyłączona, nic „na niby” | | |
| Za proxy, fałszywy `X-Forwarded-For` | limit nadal działa | | |
| `Host: evil.example` | linki i canonical bez zmian | | |
| Zniekształcone dane wejściowe | 4xx, bez zapisu stosu | | |
| Nadużycie zwykłych funkcji | <maile, kody, zdarzenia, wyścigi> | | |

## 11. Szczegóły problemów
### [S1] <Tytuł> — <Ważność>
- **Gdzie:** <URL / endpoint / plik:linia>
- **Typ i kategoria:** <np. Bezpieczeństwo · Kontrola dostępu (OWASP A01)>
- **Na czym polega:** <2–5 zdań technicznie>
- **Skutek dla biznesu:** <prosto: co się stanie, komu, ile może kosztować>
- **Dowód:** <żądanie/odpowiedź, zrzut, fragment kodu — dane zamaskowane>
- **Jak odtworzyć (bezpiecznie):** <kroki>
- **Jak naprawić:** <konkretny kod/konfiguracja w technologii projektu>
- **Jak sprawdzić naprawę:** <test do powtórzenia, najlepiej automatyczny>
- **Powiązane:** <inne problemy z tą samą przyczyną>

<powtórz dla każdego problemu, od najważniejszego>

## 12. Pokrycie, plan naprawy i ponowny test
### 12.1 Pokrycie
| Obszar | Status | Uwagi |
|---|---|---|
| Inwentaryzacja | Pełna | |
| Połączenia (<n>) | <n>/<n> | <wzorcem: …> |
| Kontrola dostępu między użytkownikami | Częściowa | brak drugiego konta admina |
| Przegląd kodu | <pliki/moduły> | <co pominięto> |
| Przepływy płatności | Sandbox | produkcji nie testowano |

### 12.2 Plan naprawy
- **Dziś:** …
- **W tym tygodniu:** …
- **W tym miesiącu:** …
- **Stale:** aktualizacje, monitoring, kopie zapasowe, testy automatyczne dla znalezionych błędów, audyt po większych zmianach

### 12.3 Plan ponownego testu
<lista testów do powtórzenia po poprawkach, kto i jak>

## 13. Załączniki
- A. Pełny katalog połączeń z wynikiem dla każdego wiersza
- B. Wynik passive-scan
- C. Mapa tras z map-routes (trasy bez wywołań, wywołania bez tras)
- D. Wyniki endpoint-matrix
- E. Wersje komponentów i wyniki audytu zależności
- F. Lista sprawdzonych nagłówków, ciasteczek, rekordów DNS
````

## Severity guide

Judge exploitability on this site × impact on this business.

| Ważność | Typical examples |
|---|---|
| **Krytyczne** | price/total tampering accepted; order paid without verified webhook; secret/service key in frontend (Stripe secret, Supabase service_role, DB password, AI key with billing); BaaS tables readable/writable by anyone; admin API without auth; SQL/command/template injection; exposed `.env`/`.git`/DB dump; stored XSS in admin panel; logic bug that charges wrong amounts at scale |
| **Wysokie** | IDOR exposing other customers' orders/invoices/personal data; stored XSS for visitors; account takeover via reset; CORS reflecting origin with credentials; no brute-force protection on admin login; trial/coupon abuse with real revenue impact; access kept after cancellation/refund; known exploited CVE in a plugin |
| **Średnie** | reflected/DOM XSS needing interaction; CSRF on non-critical actions; missing rate limits on forms; account enumeration; verbose errors; missing SPF/DMARC; pixels before consent; private pages cached; front↔back mismatch causing wrong data or broken flow for some users |
| **Niskie** | missing secondary headers on low-risk pages; version disclosure; cosmetic mismatches; minor info leaks |
| **Informacyjne** | hardening, good practices, tests worth adding, monitoring ideas |

Rules:
- One root cause = one finding (list all affected places inside it).
- Don't inflate scanner noise; don't deflate anything that loses money or exposes data.
- Unconfirmed findings are marked "Do potwierdzenia" with what is needed to confirm.
- Never claim full coverage when something was sampled or skipped.
