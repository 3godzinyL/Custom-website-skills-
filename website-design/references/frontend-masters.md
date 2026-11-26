# Front-end masters and their rules

These are the people whose work defines how good front-end is built today. Their rules
are paraphrased (read the originals for depth). The last section merges them into one
checklist for designs that stay consistent on desktop and mobile.

## Contents
1. Adam Wathan & Steve Schoger — Refactoring UI
2. Josh W. Comeau — CSS mental models, shadows, whimsy
3. Emil Kowalski — UI animation craft
4. Rauno Freiberg & Vercel — Web Interface Guidelines
5. Andy Bell & Heydon Pickering — Every Layout, CUBE CSS
6. James Gilyead & Trys Mudford — Utopia fluid scales
7. Ahmad Shadeed — Defensive CSS
8. Adam Argyle & Una Kravets — modern CSS, Open Props
9. Jen Simmons — Intrinsic Web Design
10. Ethan Marcotte — Responsive Web Design
11. Brad Frost — Atomic Design
12. Sara Soueidan & Heydon Pickering — inclusive components
13. Lea Verou — colour on the web
14. Steve Krug — Don't Make Me Think
15. Addy Osmani / web.dev — performance
16. Motion and interaction specialists (Tompkins, Van Damme, Evans, Drasner, Coursey, studios)
17. Merged checklist

## 1. Adam Wathan & Steve Schoger — *Refactoring UI*
- Hierarchy is everything: use weight and colour, not only size; de-emphasize secondary
  content instead of shouting the primary.
- Start with too much white space, then remove.
- Limit choices: a fixed type scale, spacing scale, colour shades, shadows. Systems
  beat taste in the moment.
- Avoid ambiguous spacing: more space around groups than within them.
- Don't use grey text on coloured backgrounds; tint the text toward the background hue.
- Labels are a last resort: show data in a way that explains itself ("12 m²", not
  "Powierzchnia: 12").
- Separate visual hierarchy from document hierarchy (an H2 can be small).
- Fewer borders: separate with space, background shades or shadows.
- Shadows express elevation; combine a tight and a soft shadow.
- Give the interface a personality through font, colour and radius choices — deliberately.
- Design empty states; think beyond the database (don't just list fields).

## 2. Josh W. Comeau — CSS for JavaScript developers, blog
- Learn the layout algorithms (flow, flexbox, grid, positioned): a property means
  different things in each; most "CSS bugs" are algorithm misunderstandings.
- Use a modern CSS reset: `box-sizing: border-box`, no default margins, body line-height
  ~1.5, media `display: block; max-width: 100%`, form controls inherit fonts,
  `overflow-wrap: break-word` for text, `text-wrap: balance` for headings and
  `text-wrap: pretty` for paragraphs, `isolation: isolate` on the root.
- Shadows: one consistent light source, layered shadows, shadow colour tinted to the
  background hue instead of pure black.
- Fluid type with `clamp()` using `rem` so user zoom and font settings still work.
- Motion feels natural with springs/physics; add whimsy only where it delights without
  slowing people down.

## 3. Emil Kowalski — *Animations on the Web*, Sonner, Vaul
- Every animation needs a purpose; if a frequent action (e.g. keyboard shortcut) gets
  animated, make it near-instant or remove it.
- Keep UI animations short (~150–300 ms); use strong custom ease-out curves for
  entering elements.
- Never animate from `scale(0)`; start around 0.9–0.95 with opacity.
- Make animations origin-aware: popovers and menus grow from their trigger
  (`transform-origin`).
- Prefer interruptible transitions for interactive states over fixed keyframes.
- Animate `transform`, `opacity` (and carefully `filter`); avoid layout properties.
- Reduced motion means reduce: keep gentle opacity fades, drop movement.

## 4. Rauno Freiberg & Vercel — *Web Interface Guidelines*, "Invisible details"
- Everything works with the keyboard; `:focus-visible` rings are clear and fit the design.
- Hit targets are generous (≥ 24 px; 44 px on touch); expand with pseudo-elements if the
  visual element is small.
- Mobile inputs use font-size ≥ 16 px (prevents iOS zoom); don't block paste; correct
  `type`, `inputmode` and `autocomplete`.
- Enter submits forms; labels are clickable; errors appear next to fields and focus
  moves to the first error; don't pre-disable submit buttons.
- Loading states keep the label (spinner + text); skeletons mirror the final layout.
- URLs reflect state (filters, tabs, pagination) so it can be shared and restored.
- Optimistic UI rolls back on failure; destructive actions confirm or offer undo.
- Design every state: empty, sparse, dense, error, loading.
- Optical alignment over mathematical alignment; adjust icons and text by a pixel when
  they look off.
- Nested radii are concentric: inner radius = outer radius − padding.
- Layered shadows and crisp, semi-transparent borders; neutrals and shadows share the
  hue of the surface.
- Tabular numbers for comparison; curly quotes; non-breaking spaces between number and
  unit.
- Set `color-scheme` and `<meta name="theme-color">` to match the page background.

## 5. Andy Bell & Heydon Pickering — *Every Layout*; Andy Bell — CUBE CSS
- Let the browser do the work: intrinsic layouts that respond to content and container,
  with few or no media queries.
- Layout primitives: **Stack** (vertical rhythm), **Box**, **Center** (max-width +
  auto margins), **Cluster** (wrapping inline groups), **Sidebar** (sidebar that
  collapses by content width), **Switcher** (row → column at a threshold), **Cover**
  (vertically centred hero), **Grid** (auto-fill minmax), **Frame** (aspect ratio
  media), **Reel** (horizontal scroller), **Imposter** (overlay), **Icon** (icon sized to
  text).
- Measure: limit line length in `ch` (about 60–70ch).
- CUBE CSS: global styles and tokens first (Composition, Utility, Block, Exception);
  components only add what is specific to them. Be the browser's mentor, not its
  micromanager.

## 6. James Gilyead & Trys Mudford — Utopia (utopia.fyi)
- Define type and space scales at a minimum and a maximum viewport; interpolate between
  them with `clamp()` — no jumps at breakpoints.
- Space pairs (e.g. `--space-s-l`) let spacing grow faster than text on large screens.
- Designers and developers share the same scale names.

## 7. Ahmad Shadeed — *Defensive CSS*, container queries guides
- Assume content will be longer, shorter or missing: long Polish words and URLs
  (`overflow-wrap: anywhere` where needed), missing images (background colour, aspect
  ratio), translated labels.
- `flex-wrap: wrap` for groups; `min-width: 0` on flex/grid children that contain text;
  `minmax(0, 1fr)` in grids.
- `object-fit: cover` and fixed aspect ratios for images; `max-width: 100%`.
- Use `gap` for spacing between items; avoid fixed heights (`min-height` instead).
- `scrollbar-gutter: stable` to avoid layout shift; check sticky elements on short
  viewports (vertical media queries).
- Buttons with `min-width` and padding that survive short and long labels.

## 8. Adam Argyle & Una Kravets — modern CSS, Open Props
- Use the platform: container queries, `:has()`, cascade layers (`@layer`), nesting,
  `color-mix()`, OKLCH, View Transitions, scroll-driven animations, Popover API, anchor
  positioning — with progressive enhancement.
- "The new responsive": respond to the user (dark mode, reduced motion, contrast,
  data saving), the container, and the form factor — not only viewport width.
- Tokens as custom properties (Open Props) keep a system consistent across components.

## 9. Jen Simmons — Intrinsic Web Design
- Mix fixed, fluid (`fr`), and content-sized (`min-content`, `max-content`, `fit-content`)
  tracks in CSS Grid.
- Layouts contract and expand in stages; nest grid and flex contexts.
- Use `auto-fit`/`auto-fill` with `minmax()` to let content decide columns.

## 10. Ethan Marcotte — *Responsive Web Design*
- Fluid grids, flexible images, media queries — design for the continuum between
  breakpoints, not for a few devices.
- Content first: decide what matters on the smallest screen, then add.

## 11. Brad Frost — *Atomic Design*
- Build systems from atoms (tokens, buttons, inputs) → molecules (search field) →
  organisms (header) → templates → pages.
- A pattern library is the source of truth; pages are compositions of patterns.

## 12. Sara Soueidan & Heydon Pickering — inclusive components
- Focus indicators meet WCAG 2.2 focus appearance (clear contrast and size).
- Icons: decorative `aria-hidden="true"`; meaningful icons have accessible names.
- Cards with a single primary link (pseudo-element stretch), not nested links.
- Toggles, menus, tabs, disclosures follow established ARIA patterns; prefer native
  elements (`<button>`, `<details>`, `<dialog>`).

## 13. Lea Verou — colour on the web
- Define palettes in OKLCH/OKLab for perceptually even steps; derive tints/shades with
  `color-mix()` or lightness steps.
- Check contrast for every text/background pair you actually use.

## 14. Steve Krug — *Don't Make Me Think*
- Obvious beats clever; follow conventions (logo top-left links home, cart top-right).
- Clickable things look clickable; pages are scanned, not read — structure for
  scanning.

## 15. Addy Osmani / web.dev — performance
- Prioritize the LCP element (`fetchpriority="high"`, no lazy-loading above the fold).
- Subset and preload critical fonts; `font-display: swap`; limit families and weights.
- Responsive images with `srcset`/`sizes`, AVIF/WebP; reserve space (no CLS).
- Ship less JavaScript; INP suffers from long tasks.

## 16. Motion and interaction specialists
Details and code in `motion-system.md`.
- **Jhey Tompkins** — creative CSS first: scroll-driven animations, `@property`,
  playful details that degrade to a still state; prototype small, then compose.
- **Bramus Van Damme** — scroll-driven animations and View Transitions as progressive
  enhancement; scroll timelines run off the main thread, so prefer them to listeners.
- **Cassie Evans & Sarah Drasner** — SVG as the animation medium: line drawing, morphs,
  timelines; motion that explains (process, data, maps) instead of decorating.
- **Paco Coursey** — quiet precision: fast, keyboard-first interfaces (cmdk) where
  motion confirms, never performs.
- **Lynn Fisher** — the layout itself can be playful at every breakpoint; responsive
  design as a creative space, not only a constraint.
- **Product teams (Linear, Stripe, Vercel, Raycast, Apple product pages)** — show the
  real product moving; one cinematic moment per page; crisp micro-feedback everywhere
  else.
- **Studios (Lusion, Active Theory, Locomotive, darkroom.engineering, Basement,
  Immersive Garden, Resn)** — motion designed with the concept from day one, a signature
  moment people remember, performance budgets taken as seriously as visuals.

## 17. Merged checklist: consistent on desktop and mobile

System
1. All visual values come from tokens (colour roles, fluid type steps, fluid space,
   radii, shadows, motion).
2. One type scale and one space scale, fluid between 360 and 1440+ px (Utopia-style).
3. Layout primitives (Stack, Cluster, Sidebar, Switcher, Grid, Center) instead of
   one-off layouts.
4. Components have every state designed: default, hover, focus-visible, active,
   disabled, loading, error, empty.

Layout
5. Content-first ordering on mobile; reorder with grid/flex `order` only when reading
   order stays logical.
6. Container queries for components that live in different widths (cards in sidebar vs
   main).
7. Defensive CSS everywhere: wrap, `min-width: 0`, aspect ratios, no fixed heights.
8. Line length 60–70ch; generous but varied section spacing.
9. Concentric radii, one light source for shadows, consistent border style.

Interaction
10. Hit targets ≥ 44 px on touch; inputs ≥ 16 px; correct input types and autocomplete.
11. Visible focus; full keyboard support; skip link.
12. Hover is an enhancement: nothing important hidden behind hover
    (`@media (hover: hover)` for hover-only effects).
13. Motion short, purposeful, origin-aware, reduced-motion aware.
14. State in URL where it matters (filters, tabs).

Content and type
15. Polish characters in every font and weight; `text-wrap: balance` for headings.
16. Tabular numbers in prices and tables; non-breaking spaces (number + unit,
    single-letter words).
17. Real content lengths tested (long names, long words, short and long labels).

Quality
18. Contrast AA for every pair; no information by colour alone.
19. Performance budget: fonts subset, images responsive, minimal JS.
20. Test matrix from `responsive-system.md` passed with screenshots.
