# Design token contract (shared by website-maker and website-design)

Both skills read and write the same files with the same token names, so a design chosen
in `website-design` drops straight into a site built by `website-maker`, and a redesign
never has to rename anything. Keep this file identical in both skills.

## Files in the project

| File | Purpose | Written by |
|---|---|---|
| `DESIGN-SYSTEM.md` | concept, chosen direction, palette with contrast pairs, fonts, rules, component list, do/don't, decisions log | design (or maker if design skill absent) |
| `styles/tokens.css` (or the project's equivalent, e.g. `public/css/tokens.css`, `src/styles/tokens.css`) | all tokens as CSS custom properties on `:root` | both |
| `SITE-PLAN.md` | maker's scope, sitemap, progress, placeholders | maker |
| `SITE-BRIEF.md` | strategist's handoff for the maker | strategist |

If the project already has a token file or a Tailwind config, map these names onto it
instead of creating a second system (Tailwind: expose them in `theme.extend` via
`var(--…)`).

## Required tokens

```css
:root {
  /* colour roles */
  --color-bg; --color-surface; --color-surface-2;
  --color-text; --color-text-muted; --color-border;
  --color-primary; --color-primary-hover; --color-primary-contrast;
  --color-accent; --color-dark; --color-on-dark;
  --color-success; --color-warning; --color-error; --color-focus;

  /* typography */
  --font-heading; --font-body; --font-mono;
  --step--1; --step-0; --step-1; --step-2; --step-3; --step-4; --step-5;   /* fluid clamp() scale */
  --leading-tight; --leading-body;  /* e.g. 1.1 and 1.6 */
  --tracking-tight; --tracking-wide;

  /* space (fluid or fixed) */
  --space-1 … --space-10;           /* 4 8 12 16 24 32 48 64 96 128 px or fluid equivalents */
  --section-y;                      /* default vertical section padding */
  --container; --gutter;

  /* shape and depth */
  --radius-sm; --radius-md; --radius-lg; --radius-pill;
  --shadow-1; --shadow-2;
  --border-width;

  /* motion */
  --ease-out; --ease-in-out; --dur-fast; --dur-base; --dur-slow;

  /* layers */
  --z-header; --z-overlay; --z-modal; --z-toast;
}
```

Optional: `--color-*-rgb` channels for alpha use, dark-mode overrides under
`[data-theme="dark"]` and `@media (prefers-color-scheme: dark)`.

## Rules

- Components use tokens only — no raw hex, px font sizes or one-off shadows. The
  `website-design` skill's `scripts/consistency-audit.mjs` checks this.
- Contrast pairs listed in `DESIGN-SYSTEM.md` are checked (WCAG AA) before use.
- New tokens are added to the contract section of `DESIGN-SYSTEM.md` with a reason.
- Fonts declared once (in tokens), loaded with `latin-ext` subset and `font-display: swap`.
- Breakpoints (for media and container queries): 480, 768, 1024, 1280, 1536 px.

## DESIGN-SYSTEM.md skeleton

```markdown
# Design system — <site>
## Koncept
## Kierunek (wybrane demo: <n> + zmiany)
## Kolory (rola · hex · para kontrastu · wynik)
## Typografia (fonty, skala, zasady polskiej typografii)
## Odstępy, siatka, promienie, cienie
## Ruch (co, czas, krzywa, reduced motion)
## Ikony i zdjęcia
## Komponenty (lista + stany)
## Rytm sekcji strony głównej
## Zakazy (AI slop i inne)
## Dziennik decyzji
```
