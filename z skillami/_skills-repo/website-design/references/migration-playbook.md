# Migration playbook: redesigning the whole front consistently

Goal: after the redesign every page, component and state belongs to the new system;
content, functions, SEO and analytics keep working.

## 1. Inventory (before touching anything)

- Pages and templates (list URLs/files), shared partials (header, footer, layouts).
- Components and their states; JS behaviours tied to classes/ids (menus, sliders, forms,
  analytics selectors, tests) — record selectors that must not break.
- Style sources: CSS files, inline styles, `style=""` attributes, component styles,
  Tailwind classes, third-party widget styles.
- Current values: `node scripts/consistency-audit.mjs <styles-dir> --html <pages-dir>`
  → colours, font families, font sizes, spacings, radii, shadows, z-indexes, breakpoints,
  `!important` count. This shows how much was ad hoc.
- Baseline screenshots of every page at 390 and 1440 px.
- Commit or copy the current state first (git branch/commit or a backup folder) so the
  change is reviewable and reversible.

## 2. Map old → new

Build a mapping table and apply it systematically:

| Old value / pattern | New token / component | Note |
|---|---|---|
| `#333`, `#222`, `rgb(34,34,34)` | `--color-text` | merge near-duplicates |
| `#999` on white | `--color-text-muted` (darker) | old value failed contrast |
| 13px, 14px, 15px body sizes | `--step-0` | one body size |
| 6px, 8px, 10px radii | `--radius-sm/md` | concentric rules |
| `.btn`, `.button`, `.cta-link` | `.btn` + variants | one button component |

## 3. Order of work

1. **Tokens** file per contract; include it first in the cascade (`@layer tokens` if
   using layers).
2. **Base layer**: reset, body, headings, links, lists, forms, media, focus styles,
   selection, `color-scheme`.
3. **Layout primitives** (`responsive-system.md`) and the container/grid.
4. **Components**: header/nav (desktop + mobile), footer, buttons, forms, cards, badges,
   tables, alerts/toasts, modals, pagination, breadcrumbs, review blocks, product cards,
   galleries/sliders, accordions, tabs — each with all states.
5. **Sections**: hero, offer, trust, process, gallery, CTA bands, FAQ — using components.
6. **Pages**: apply sections and templates page by page; special pages too (404, search
   results, cart, checkout, account, legal pages, thank-you pages, e-mails if in scope).
7. **Cleanup**: remove old styles, unused classes, inline styles, duplicate rules,
   unnecessary `!important`; one icon set (replace mixed icons).

## 4. Rules while migrating

- Never change content, URLs, form field names, IDs/classes used by JS or analytics
  without updating their users; keep SEO markup (titles, headings, schema, alt).
- Semantic HTML improvements are welcome (buttons instead of clickable divs, labels for
  inputs) when they don't break behaviour.
- No new hardcoded values: if something needs a new value, add a token with a reason.
- Third-party widgets (booking, chat, payment iframes): theme them via their options;
  where impossible, frame them so they don't clash.
- Keep diffs reviewable: one layer or component group per step.

## 5. Verification

- `node scripts/consistency-audit.mjs <styles-dir> --tokens <tokens.css> --html <pages-dir>`
  → zero hardcoded colours outside tokens, font families only from tokens, sizes on the
  scale; list and justify any exceptions.
- After screenshots of every page at 390 and 1440 px next to the baseline; check the
  full test matrix (`responsive-system.md`) on key pages.
- Functional pass: menus, forms (submit + errors), sliders, modals, cart/checkout,
  search, filters, language switch, analytics events still fire.
- Accessibility: contrast, focus, keyboard, headings order, reduced motion.
- Performance: fonts subset/preloaded, no layout shift from new fonts or images.
- Anti-slop scan and rubric score (`critique.md`) — the score should improve in every
  criterion that was weak.

## 6. Handoff

- `DESIGN-SYSTEM.md` updated (decisions log).
- Before/after screenshots (or a short list with paths).
- How to build a new page in the system (which components, which tokens).
- Anything left in the old style, with the reason and a suggestion.
