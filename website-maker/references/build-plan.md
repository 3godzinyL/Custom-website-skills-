# Build plan: order of work that survives interruptions

Long builds get interrupted: usage limits, closed terminals, a new session tomorrow.
In a side-by-side test, the build without a plan finished a complete backend (68
endpoints) and then ran out of usage before the user interface existed — after login
the user saw a blank page and the admin panel returned an error. The work was real,
but nothing could be shown. This file prevents that.

## 1. Principles

1. **Vertical slices, not layers.** Build one complete flow end to end (page → form →
   API → database → e-mail → admin view) before starting the next. Never "all backend
   first, then all frontend".
2. **Something visible early.** The home page (or the main screen) works in the browser
   within the first slice, with real copy and the chosen design.
3. **Contracts before code.** Write the data model and the API contract (route, method,
   input, output, errors, who may call it) in `SITE-PLAN.md` before building a slice —
   the front and the back then cannot drift apart.
4. **Definition of done per slice**: works in the browser at 390 and 1440 px, all
   states (empty, loading, error, success), server-side validation and authorisation,
   test or scripted check, `SITE-PLAN.md` updated.
5. **Always resumable.** `SITE-PLAN.md` ends with a `Następny krok` line that a new
   session can execute without reading the conversation.

## 2. Slice order by option

| Option | Slices in order |
|---|---|
| 1 Front | ① home page complete (all sections, mobile) → ② remaining pages → ③ SEO, legal pages, 404 → ④ performance and accessibility pass |
| 2 + backend | ① home page + the main form saved, e-mailed and visible in a simple list → ② remaining pages with content from the backend → ③ blog/newsletter/bookings → ④ analytics, limits, backups |
| 3 + panel and payments | ① as option 2 slice ① → ② admin login with roles + the list of what slice ① collects → ③ checkout in sandbox end to end (order → webhook → paid → e-mail → panel) → ④ discounts, refunds, invoices → ⑤ the rest of the panel |
| 4 Ultimate | option 3 slices first, then each extra (languages, PWA, A/B tests, integrations) as its own slice with its own done criteria |

Accepted ideas from the SITE-BRIEF are scheduled into the slice they belong to, not left
for the end.

## 3. Checkpoints with the user

- After the design choice (demos).
- After slice ①: "tak to działa — idę dalej?" with screenshots or a local URL.
- Before payments go into a slice: confirm provider, prices, legal texts.
- At the end: handoff with the list of what was verified.

If the user is away, keep going slice by slice; never skip the definition of done to
"save time".

## 4. SITE-PLAN.md sections that make resuming possible

```markdown
## Plan budowy (wycinki)
| # | Wycinek | Zawiera | Status | Sprawdzone |
|---|---|---|---|---|
| 1 | Główna + zapis na listę | … | gotowe / w toku / czeka | 390/1440 px, walidacja, e-mail, test |

## Kontrakt API
| Metoda i ścieżka | Kto może | Wejście | Wyjście | Błędy |
|---|---|---|---|---|

## Model danych
<tabele/kolekcje, pola, relacje, co jest danymi osobowymi i jak długo je trzymamy>

## Następny krok
<jedno konkretne zadanie, np. „Wycinek 3: webhook Stripe w trybie testowym — trasa /api/webhooks/stripe, weryfikacja podpisu, test z `stripe trigger`”>
```

## 5. When time or budget is short

Cut scope inside the current slice (fewer fields, simpler UI) before cutting the slice
itself, and never leave a flow half-wired in a way that looks finished (a form that
shows "dziękujemy" but saves nothing is worse than no form). Record every cut in
`SITE-PLAN.md` under "Świadomie pominięte".
