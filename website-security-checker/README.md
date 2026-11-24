# 🛡️ Website Security Checker

Skill, który robi **pełny audyt bezpieczeństwa strony**: najpierw dokładnie sprawdza,
z czego strona się składa, a dopiero potem testuje to, co faktycznie na niej jest.

## Jak działa

1. **Zakres i zasady.** Ustala, co testujemy (domena, subdomeny, repozytorium), w jakim
   trybie (sam adres, kod źródłowy czy konta testowe) i potwierdza, że strona jest Twoja
   albo masz zgodę na test.
2. **Mapa strony.** Spisuje serwer, hosting, CDN, framework frontu, wszystkie endpointy
   API, formularze, logowanie i role, sklep, płatności, webhooki, upload plików, skrypty
   zewnętrzne, e-maile, subdomeny i chatboty AI. Mapę dostajesz przed testami, bo często
   wychodzą na niej funkcje, o których już nikt nie pamiętał.
3. **Plan testów z mapy.** Każdy znaleziony element dostaje pasujące testy: każde pole
   formularza → XSS i walidacja, każdy endpoint → kontrola dostępu, każda cena → czy liczy
   ją serwer.
4. **Testy.** Sprawdza między innymi:
   - XSS (odbity, zapisany, DOM), także ten, który odpala się w panelu admina,
   - SQL/NoSQL/command/template injection,
   - IDOR, czyli dostęp do cudzych zamówień, faktur i profili,
   - wycieki danych i kluczy (Stripe, OpenAI, Supabase `service_role`, `.env`, `.git`, source mapy),
   - **sklep:** podmianę ceny, ilości i rabatu, kody rabatowe, wyścigi o ostatnią sztukę,
   - **płatności:** webhooki Przelewy24, PayU, Tpay, Stripe i BLIK (podpis, kwota, idempotencja),
   - **CMS:** czy treści i ceny pochodzą z backendu, czy front da się oszukać, WordPress, WooCommerce, PrestaShop, Shopify,
   - Supabase RLS i reguły Firebase,
   - CORS, CSRF, open redirect, clickjacking, nagłówki, ciasteczka, TLS,
   - rate limit formularzy, spam i wstrzykiwanie nagłówków w e-mailach,
   - SPF, DKIM i DMARC (czy ktoś może wysyłać maile „od” Twojego sklepu),
   - RODO od strony technicznej (np. czy piksele ładują się przed zgodą),
   - chatboty AI: prompt injection, wyciek klucza, koszty.
5. **Raport po polsku.** Zaczyna się od podsumowania dla właściciela bez żargonu. Dalej
   każdy problem ma ważność, dowód, skutek dla biznesu („ktoś kupi produkt za 1 zł”),
   gotową poprawkę w kodzie i sposób sprawdzenia, że poprawka działa. Na końcu jest
   **tabela pokrycia**, czyli co sprawdzono, a czego nie i dlaczego.
6. **Naprawa i ponowny test.** Jeśli chcesz, poprawia kod i jeszcze raz uruchamia test,
   który wykrył problem.

## Plusy

- **Najpierw mapa, potem testy.** Nie przepuszcza strony przez listę na ślepo, więc testy
  trafiają w funkcje, które strona naprawdę ma.
- Wyłapuje typowe błędy stron **robionych szybko albo z AI**: klucze w bundlu, wyłączone
  RLS, ceny liczone w przeglądarce, panel admina ukryty tylko w menu.
- **Polski rynek:** Przelewy24, PayU, Tpay, BLIK, InPost, KSeF, RODO.
- **Bezpieczny tryb:** bez DoS, bez masowego brute force, bez prawdziwych zamówień i bez
  pobierania cudzych danych. Klucze w raporcie są zamaskowane.
- Uczciwy raport: ważność odpowiada realnemu ryzyku, a to, czego nie sprawdzono, jest
  wypisane wprost.

## Skaner w zestawie

`scripts/passive-scan.mjs` to szybki, pasywny skaner w czystym Node 18+, bez instalowania
paczek. Używa tylko GET/HEAD/OPTIONS i wysyła najwyżej 120 zapytań, z przerwą między nimi.

```bash
node scripts/passive-scan.mjs https://twojastrona.pl --out scan.json
```

Sprawdza HTTPS, nagłówki, ciasteczka, CORS, odsłonięte pliki (`.env`, `.git`, kopie
zapasowe, source mapy), technologię, klucze w plikach JS, endpointy API i formularze.
Jego wynik to **tropy do potwierdzenia**, a nie gotowe wyniki. Skill potwierdza każdy
trop ręcznie.

## Przykładowe polecenia

- „Sprawdź bezpieczeństwo mojej strony https://czystakosteczka.pl”
- „Zrób audyt bezpieczeństwa sklepu w folderze `C:\projekty\sklep`, mam konto testowe”
- „Czy ktoś może zmienić cenę w koszyku w moim sklepie?”
- „Przetestuj formularz kontaktowy i panel admina na XSS”

## Struktura

```
website-security-checker/
├── SKILL.md                     # instrukcje dla AI (po angielsku)
├── references/
│   ├── recon.md                 # rozpoznanie i inwentaryzacja
│   ├── checks.md                # katalog testów (OWASP Top 10:2025)
│   ├── ecommerce-cms.md         # sklepy, płatności, CMS, Supabase/Firebase
│   └── report-template.md       # szablon raportu i skala ważności
└── scripts/
    └── passive-scan.mjs         # pasywny skaner Node
```

> ⚠️ Używaj tylko na stronach, które są Twoje albo na których masz zgodę na test.
