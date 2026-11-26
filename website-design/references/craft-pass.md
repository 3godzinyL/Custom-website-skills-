# Craft pass: the last 10 % that separates a studio site from a template

Run this pass on every demo before showing it, and on the finished redesign before
handoff. Each item takes minutes; together they decide whether the site looks
"designed" or "generated". Fix what fails, note what is deliberately different.

## Typography
1. Two families at most (often one variable family is enough); weights used are a
   deliberate set (e.g. 400 / 600 / 800), not whatever looked fine.
2. Display sizes have tighter tracking (−0.01 to −0.03 em) and tight leading (1.0–1.15);
   all-caps labels have positive tracking (+0.04 to +0.08 em).
3. `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs; no single word
   alone on the last line of a heading.
4. Polish: non-breaking space after single-letter words (a, i, o, u, w, z) and between
   number and unit (`25 zł`, `3 dni`); „polskie cudzysłowy”; em dash with spaces.
5. Tabular numbers (`font-variant-numeric: tabular-nums`) in prices, tables, counters
   and timers.
6. Line length 55–75 characters for body text; no full-width paragraphs on desktop.
7. Font loading: `latin-ext` subset, `font-display: swap`, critical weight preloaded,
   fallback font metrics adjusted (`size-adjust`, `ascent-override`) so nothing jumps.

## Layout and rhythm
8. One grid; things that look aligned *are* aligned; icons and text optically centred
   (nudge by 1 px when the math is right but the eye says no).
9. Section spacing follows the scale with deliberate variation (tight group → generous
   break), not the same padding everywhere.
10. At least one full-bleed or off-grid moment per page to break the template feel;
    never more than the concept can carry.
11. Anchored sections have `scroll-margin-top` equal to the sticky header height.
12. `scrollbar-gutter: stable` where layout would shift when a scrollbar appears.

## Colour and surfaces
13. Neutrals are tinted toward the brand hue (no dead grey); text on colour is tinted
    toward that colour, not grey.
14. The accent covers a small share of the surface — CTAs, highlights, one signature
    element.
15. Shadows share one light source and are layered (tight + soft), tinted to the
    background; dark themes use borders and lighter surfaces instead of shadows.
16. `::selection`, `accent-color` (checkboxes, radios, range), `caret-color` and
    `color-scheme` match the design; `<meta name="theme-color">` matches the header.

## Images and media
17. One treatment for all photos (crop ratios, radius, colour grade, borders).
18. Art direction for mobile: `<picture>` with a different crop where the subject would
    be lost; `aspect-ratio` reserved for every image (no layout shift).
19. LCP image: `fetchpriority="high"`, not lazy; the rest lazy with proper `sizes`.
20. No stock-looking or AI-generated images of people, results, products or reviews;
    marked placeholders until real photos arrive.

## Components and states
21. Every interactive element has default, hover, focus-visible, active, disabled and
    loading states; the focus ring is designed (offset, colour, radius), never removed.
22. Buttons keep their label while loading (spinner + text); press feedback
    (`scale(.97)` or a 1 px shift) within 100 ms.
23. Forms: labels always visible, errors next to the field in plain language, focus on
    the first error, success state designed, correct `type`, `inputmode`,
    `autocomplete`, 16 px+ font on mobile.
24. Empty, loading (skeletons that mirror the final layout) and error states designed
    for every list, search and dashboard.
25. Concentric radii: inner radius = outer radius − padding.

## Interaction and motion
26. The signature moment works, has a reduced-motion version, and does not delay the
    headline.
27. Secondary motion is consistent in duration and curve across the page; nothing
    replays on scroll-up.
28. Hover effects only under `@media (hover: hover)`; nothing important hidden behind
    hover; touch targets ≥ 44 px.
29. Popovers and menus grow from their trigger; drawers from their edge; exits faster
    than entrances.
30. Smooth scrolling respects `prefers-reduced-motion`; in-page links land below the
    sticky header.

## Responsive and robustness
31. Checked at 360, 390, 768, 1024, 1280, 1440 and 1920 px, phone landscape, and 200 %
    zoom: no horizontal scroll, no overlapping, no clipped text.
32. Long Polish words, long names, two-line buttons and missing images don't break the
    layout (`min-width: 0`, `overflow-wrap`, flex-wrap).
33. Mobile is designed: thumb-reach primary action, reordered content where it helps,
    a menu that feels native.

## Details people notice subconsciously
34. Favicon set (SVG + PNG + apple-touch-icon), Open Graph image in the site's design.
35. A designed 404 page with a way back.
36. Cursor is a pointer only on clickable things; text cursor on text.
37. Copy uses the site's voice in microcopy (buttons, errors, empty states), not
    generic phrases.
38. No console errors, no 404s for assets, no layout shift when fonts load.

## Before showing
39. Look at the page at 100 % zoom on a real phone or device emulation, then at desktop
    width, side by side with the best competitor from the brief: does it look at least
    as considered?
40. Run the anti-slop scan in `critique.md`; one AI tell is enough to fix before
    showing.
