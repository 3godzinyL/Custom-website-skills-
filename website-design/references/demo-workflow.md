# Demo workflow: 3–4 HTML design demos

The demos let the owner *see* options instead of imagining them from descriptions. They
must be honest previews of what the real site will look like: real content, real
structure, real responsiveness.

## 1. Choose the directions

- 3 demos by default, 4 when the brand is undecided or the audience is broad.
- Make them genuinely different on at least three axes: typography voice, palette,
  layout character, imagery treatment, motion character.
- Recommended spread:
  1. **Bliski obecnej marki**: keeps logo colours/feel, fixes hierarchy and consistency.
  2. **Najlepsze dopasowanie do branży**: the direction `site-type-design.md` points to.
  3. **Odważniejszy**: a confident, memorable take that still fits the audience.
  4. (optional) **Alternatywa**: e.g. light vs dark, editorial vs industrial.
- Start from `directions.md` but adapt palette, fonts and details to the concept of
  this business. Check contrast of every text/background pair.

## 2. What every demo contains (same order in all)

1. Header with logo (real or text), navigation with real page names, primary CTA;
   mobile menu button that opens a working menu.
2. Hero with the site's real headline (or an improved draft clearly based on it),
   supporting line, CTAs, real image (from the site's assets) or a styled placeholder.
3. The most important content section (services with prices, product grid, menu,
   rooms…) with real items.
4. Trust block: reviews (real ones from the site, or marked placeholders), rating,
   logos only if real.
5. A secondary section that shows layout rhythm (process steps, gallery, about).
6. CTA band.
7. Footer with real contact data.
8. **Component strip** (small, at the end, titled „System”): palette swatches with hex,
   type scale sample with „Zażółć gęślą jaźń”, buttons (primary/secondary/ghost incl.
   hover/focus), a form field with error state, a card, a badge.

Keep each demo short (one screen of each section, not full pages) — about 300–700 lines
of HTML/CSS.

## 3. Technical rules

- One self-contained file per demo: inline `<style>`, optional small inline `<script>`
  (menu toggle, slider), Google Fonts via the CSS2 API `<link>` with `display=swap`
  (it serves the latin-ext subset automatically through `unicode-range` when the font
  supports Polish). Demos only: the production site self-hosts its fonts (privacy —
  website-maker `secure-defaults.md` §8); note the font files to download in
  `DESIGN-SYSTEM.md`.
- Tokens at the top as CSS custom properties using the contract names
  (`design-tokens-contract.md`), so the chosen demo's tokens can be copied straight into
  the project.
- Images: reference the site's own images by relative path or URL if available;
  otherwise placeholders with a short description of the intended photo
  (`[ZDJĘCIE: ekipa przy myciu kostki, poziomo]`) on a tinted background.
- Responsive: fluid type/space, layout primitives, works at 360 and 1440 px without
  horizontal scroll.
- Accessibility: semantic landmarks, alt texts, visible focus, `prefers-reduced-motion`.
- Motion: each demo has its own **motion personality** (`motion-system.md` §2) and one
  **signature moment** tied to the concept (§3) — a different one per demo, so the
  owner chooses the feel as well as the look. Plus consistent micro-feedback on buttons
  and links. Everything has a reduced-motion version; nothing delays the headline.
- Name files `design-demos/demo-1-<slug>.html` … and add a `<meta name="description">`
  with the direction's one-line idea (the gallery reads titles from `<title>`).

## 4. The comparison page

Copy `assets/demo-gallery.html` to `design-demos/index.html` and fill its `DEMOS` array
(file, name, one-line idea, palette hex values, fonts). It shows all demos side by side
in iframes with a Desktop / Telefon toggle and a "Otwórz pełny podgląd" link.

## 5. Check before showing

For each demo, at 390 and 1440 px (screenshots via browser tool or Playwright MCP):
- nothing overflows; text readable; contrast fine; Polish characters render;
- the hero headline is visible without scrolling on mobile;
- the menu opens and closes; focus is visible;
- the signature moment runs smoothly, pauses if it loops, and has a reduced-motion
  version (check with DevTools → Rendering → `prefers-reduced-motion`);
- the craft pass (`craft-pass.md`) is clean;
- no anti-slop hits (`critique.md`).
Fix, re-check, then open the gallery for the user.

## 6. Present

Open `design-demos/index.html` for the user (Windows `start "" design-demos\index.html`,
macOS `open`, Linux `xdg-open`). In the chat, for each demo: name, idea (1 line),
palette, fonts, motion personality and signature moment, who it suits, what it changes
vs the current site. Then ask:
„Który kierunek wybierasz? Możesz też połączyć, np. kolory z 2 i typografię z 3.”

## 7. After the choice

- Mixed choice → build one refined demo `demo-final.html` and confirm.
- Write `DESIGN-SYSTEM.md` and the token file from the chosen demo (contract format).
- Keep the demo folder; it documents the decision (add it to `.gitignore` only if the
  user wants).
