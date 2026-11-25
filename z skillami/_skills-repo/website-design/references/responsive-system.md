# Responsive system

One design that works from a 360 px phone to a 1920 px monitor, built as a system.

## 1. Fluid type and space (Utopia-style)

Define min (360 px) and max (1440 px) viewport values and interpolate with `clamp()`.
Use `rem` inside `clamp()` so browser zoom and font settings keep working.

```css
:root {
  /* type: ratio ~1.2 at 360px → ~1.25 at 1440px */
  --step--1: clamp(0.83rem, 0.81rem + 0.12vw, 0.9rem);
  --step-0:  clamp(1rem, 0.96rem + 0.19vw, 1.125rem);
  --step-1:  clamp(1.2rem, 1.13rem + 0.32vw, 1.41rem);
  --step-2:  clamp(1.44rem, 1.33rem + 0.52vw, 1.76rem);
  --step-3:  clamp(1.73rem, 1.55rem + 0.8vw, 2.2rem);
  --step-4:  clamp(2.07rem, 1.8rem + 1.2vw, 2.75rem);
  --step-5:  clamp(2.49rem, 2.07rem + 1.86vw, 3.75rem);
  /* space */
  --space-3xs: clamp(0.25rem, 0.23rem + 0.09vw, 0.31rem);
  --space-2xs: clamp(0.5rem, 0.48rem + 0.09vw, 0.56rem);
  --space-xs:  clamp(0.75rem, 0.71rem + 0.19vw, 0.88rem);
  --space-s:   clamp(1rem, 0.96rem + 0.19vw, 1.13rem);
  --space-m:   clamp(1.5rem, 1.44rem + 0.28vw, 1.69rem);
  --space-l:   clamp(2rem, 1.93rem + 0.37vw, 2.25rem);
  --space-xl:  clamp(3rem, 2.89rem + 0.56vw, 3.38rem);
  --space-2xl: clamp(4rem, 3.85rem + 0.74vw, 4.5rem);
  --space-3xl: clamp(6rem, 5.78rem + 1.11vw, 6.75rem);
  /* pair that grows faster: section padding */
  --section-y: clamp(3rem, 1.8rem + 5.3vw, 7rem);
}
```
Map these to the contract names (`--space-1…10`) if the project uses those; keep one
system.

## 2. Breakpoints and queries

- Breakpoints (contract): 480, 768, 1024, 1280, 1536 px — use only when a layout really
  changes; most sizing is fluid.
- **Container queries** for components placed in different widths:
  ```css
  .card-list { container-type: inline-size; }
  @container (min-width: 36rem) { .card { grid-template-columns: 2fr 3fr; } }
  ```
- Preference queries: `prefers-reduced-motion`, `prefers-color-scheme`,
  `prefers-contrast`, `(hover: hover) and (pointer: fine)` for hover effects,
  `(pointer: coarse)` for larger targets.
- Short viewports: `@media (max-height: 600px)` for sticky headers/hero heights.

## 3. Layout primitives (minimal CSS)

```css
.stack > * + * { margin-block-start: var(--stack-gap, var(--space-s)); }
.cluster { display: flex; flex-wrap: wrap; gap: var(--cluster-gap, var(--space-xs)); align-items: center; }
.center { box-sizing: content-box; max-inline-size: var(--container, 75rem); margin-inline: auto; padding-inline: var(--gutter, var(--space-s)); }
.grid-auto { display: grid; gap: var(--space-m); grid-template-columns: repeat(auto-fill, minmax(min(var(--min, 16rem), 100%), 1fr)); }
.sidebar { display: flex; flex-wrap: wrap; gap: var(--space-l); }
.sidebar > :first-child { flex-basis: var(--side, 18rem); flex-grow: 1; }
.sidebar > :last-child { flex-basis: 0; flex-grow: 999; min-inline-size: 55%; }
.switcher { display: flex; flex-wrap: wrap; gap: var(--space-m); }
.switcher > * { flex-grow: 1; flex-basis: calc((var(--threshold, 40rem) - 100%) * 999); }
.frame { aspect-ratio: var(--ratio, 4 / 3); overflow: hidden; }
.frame > img, .frame > video { inline-size: 100%; block-size: 100%; object-fit: cover; }
.reel { display: flex; gap: var(--space-s); overflow-x: auto; scroll-snap-type: x mandatory; }
.reel > * { flex: 0 0 auto; scroll-snap-align: start; }
```

## 4. Mobile patterns that feel designed

- **Navigation**: full-screen or sheet menu with large targets, current page marked,
  primary CTA and phone inside; close button reachable; focus trapped while open;
  body scroll locked.
- **Sticky action bar** (local services, shops, bookings): 1–2 actions at the bottom,
  respects `env(safe-area-inset-bottom)`; hidden when the keyboard is open.
- **Hero**: headline visible without scrolling on 360×740; image after the text or as a
  cropped background with enough contrast; no 100vh traps — use `svh`/`dvh`.
- **Tables** → stacked cards or horizontal scroll with a visible hint; keep prices
  aligned.
- **Carousels**: native scroll-snap reels, swipeable, with visible next item; avoid
  autoplay.
- **Forms**: single column, labels above, large inputs (≥ 16 px font), correct keyboards
  (`inputmode`), sticky submit on long forms.
- **Images**: art direction with `<picture>` when the crop must change for mobile.

## 5. Desktop patterns that don't look like a stretched phone

- Use the width: split layouts, asymmetric grids, sidebars, larger imagery; keep text
  measure ≤ 70ch.
- Max container width (~1200–1320 px) with full-bleed sections for rhythm.
- Hover states and richer motion where pointers are fine; never required for function.

## 6. Test matrix

Check with screenshots (Playwright/Chrome DevTools MCP or the browser tool):

| Width × height | Device class |
|---|---|
| 360 × 740 | small Android |
| 390 × 844 | iPhone |
| 430 × 932 | large phone |
| 768 × 1024 | tablet portrait |
| 1024 × 768 | tablet landscape / small laptop |
| 1280 × 800 | laptop |
| 1440 × 900 | desktop |
| 1920 × 1080 | large desktop |

Plus: landscape phone (740 × 360), browser zoom 200 %, long-content test (long names,
long Polish words, 3-line buttons), keyboard-only pass, reduced motion on, dark OS
theme (if dark mode exists).
