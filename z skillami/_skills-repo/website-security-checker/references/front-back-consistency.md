# Frontend ↔ backend consistency

Bugs and holes appear where the frontend and backend disagree. Check in code (diff of
routes vs calls, shared types) and on the live site (network and console while using
every feature).

## 1. Find the mismatches in code

`node scripts/map-routes.mjs <dir> --out routes.json` prints:
- **Calls without a route**: the frontend calls a path no backend route matches →
  broken feature, or the route lives elsewhere (proxy, other service) — verify.
- **Routes without a call**: backend routes no UI uses → admin/debug/legacy endpoints;
  each must be intentionally public or protected. These are high-value for Phase 2.
- **Routes without visible auth middleware**: heuristic lead; confirm by reading code.

Then compare, per feature:

| Aspect | Check | Typical bug |
|---|---|---|
| Field names | request body keys vs what the handler reads | `phoneNumber` vs `phone` → silently empty |
| Types | string vs number, `"10"` vs `10`, booleans as `"false"` | `"false"` is truthy |
| Required fields | front `required` vs backend validation | back accepts empty → bad data; back requires field the UI never sends → error |
| Validation rules | regex, lengths, ranges, allowed enums | front stricter → bypass by API; back stricter → user stuck with vague error |
| Enums/statuses | same list on both sides | new status in backend shown as blank in UI |
| Money | who computes price, totals, VAT, shipping, discounts | different rounding → amount shown ≠ amount charged |
| Dates/time zones | ISO strings, UTC vs local, date-only fields | booking shifted by a day, trial ends early |
| Pagination/sorting | param names, 0- vs 1-based, max limit | duplicated or missing items |
| Errors | error JSON shape, HTTP status codes | UI shows success on 4xx/5xx, or generic error for validation |
| Auth state | token expiry, refresh flow, 401 handling | UI looks logged in while API rejects; infinite redirect |
| Permissions | what UI hides vs what API enforces | hidden button but open endpoint; or button shown that always fails |
| Feature flags/plans | plan checks on both sides | premium API works on free plan |
| Uploads | allowed types/sizes on both sides | big files accepted by API, timeouts |
| i18n/encoding | UTF-8 everywhere, Polish characters | „ł” broken in e-mails or PDFs |
| Caching | API cache headers vs UI expectations | stale prices after admin change |
| Versions | deployed frontend calls old API version | half-migrated features |

## 2. Find the mismatches on the live site

While crawling every feature with network capture:
- Console errors and warnings on every page (JS exceptions, failed resources, CSP
  violations, mixed content).
- Requests with 4xx/5xx responses during normal use.
- Requests to other environments (`localhost`, `staging`, `test` hosts) from production.
- Response fields the UI doesn't use (data exposure) or fields the UI expects but gets
  `null`.
- Optimistic UI without rollback: the UI shows "saved" while the request failed.
- Double requests (double click, React strict mode in production, retries) creating
  duplicates.
- Slow endpoints (> 1 s) on critical paths.
- Forms: submit with server-invalid data via DevTools — does the UI show the server
  error clearly?

## 3. Code vs deployed site

When both are available, confirm the deployed version matches the code: same routes
respond, same headers, same bundle hashes or version endpoint, no endpoints live that
the code no longer has (old deployments, forgotten serverless functions).

## 4. Recording

```
| # | Funkcja | Front | Backend | Rozbieżność | Skutek | Problem # |
|---|---|---|---|---|---|---|
| M1 | Formularz wyceny | wysyła `area` jako tekst „120,5” | parseFloat → 120 | przecinek dziesiętny ucina część | zaniżona wycena | B3 |
```
