# Report template

Write the report in the user's language (default Polish). Use this structure.

```markdown
# Raport bezpieczeństwa — <domena / projekt>

Data: <RRRR-MM-DD> · Tryb: <white-box / black-box / grey-box> · Środowisko: <produkcja / staging / lokalnie>
Zakres: <domeny, subdomeny, repozytorium> · Poza zakresem: <co i dlaczego>

## 1. Podsumowanie dla właściciela
Ogólny poziom ryzyka: <Krytyczny / Wysoki / Średni / Niski>
<3–5 zdań bez żargonu: co jest najgroźniejsze i co się stanie, jeśli tego nie naprawić.>

**Do naprawy najpierw:**
1. <problem> — <skutek dla biznesu w jednym zdaniu>
2. ...

**Co jest zrobione dobrze:** <konkretne rzeczy, np. płatności przez stronę operatora, HTTPS z HSTS>

## 2. Mapa strony (inwentaryzacja)
<tabela z fazy 1>

## 3. Znalezione problemy
| # | Ważność | Problem | Miejsce | Status |
|---|---|---|---|---|
| 1 | Krytyczne | ... | ... | Otwarte |

### [1] <Tytuł problemu> — <Ważność>
- **Gdzie:** <URL / endpoint / plik:linia>
- **Kategoria:** <np. Kontrola dostępu (OWASP A01)>
- **Na czym polega:** <opis techniczny, 2–4 zdania>
- **Skutek dla biznesu:** <prostym językiem>
- **Dowód:** <fragment żądania/odpowiedzi, zrzut, z zamaskowanymi danymi>
- **Jak odtworzyć (bezpiecznie):** <kroki>
- **Jak naprawić:** <konkretna zmiana + fragment kodu/konfiguracji dla ich technologii>
- **Jak sprawdzić naprawę:** <test do powtórzenia>

## 4. Pokrycie testów
| Obszar | Status | Uwagi |
|---|---|---|
| Nagłówki i TLS | Sprawdzone | |
| Kontrola dostępu między użytkownikami | Nie sprawdzone | brak dwóch kont testowych |

## 5. Plan naprawy
- **Dziś:** ...
- **W tym tygodniu:** ...
- **Później / utrzymanie:** aktualizacje, monitoring, kopie zapasowe, cykliczny audyt

## 6. Załączniki
<wynik passive-scan, lista endpointów, wersje komponentów>
```

## Severity guide

Judge by exploitability on this site × impact on this business.

| Ważność | Typical examples |
|---|---|
| **Krytyczne** | price/total tampering accepted; order marked paid without verified webhook; secret/service key in frontend (Stripe secret, Supabase service_role, DB password, AI API key with billing); BaaS tables readable/writable by anyone; admin API without auth; SQL/command/template injection; exposed `.env`/`.git`/DB dump; stored XSS firing in admin panel |
| **Wysokie** | IDOR exposing other customers' orders/invoices/personal data; stored XSS for visitors; account takeover via reset flow; CORS reflecting origin with credentials; no brute-force protection on admin login; upload allowing executable/HTML files on the same origin; known exploited CVE in CMS plugin |
| **Średnie** | reflected/DOM XSS needing user interaction; CSRF on non-critical actions; missing rate limit on forms (spam, mail bombing); account enumeration; verbose stack traces; missing SPF/DMARC; marketing cookies before consent; private pages cached by CDN |
| **Niskie** | missing secondary headers (Permissions-Policy, Referrer-Policy) on low-risk pages; version disclosure; minor info leaks; weak but non-exploitable configs |
| **Informacyjne** | hardening suggestions, good practices, things to monitor |

Rules:
- One root cause = one finding (list all affected places inside it).
- Do not inflate: a scanner warning without a realistic attack path is Low/Info.
- Do not deflate: anything that loses money or exposes customer data is at least High.
- Mark findings you could not fully confirm as "Do potwierdzenia" and say what is needed
  to confirm them.
