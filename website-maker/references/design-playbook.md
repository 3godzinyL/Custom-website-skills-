# Design playbook

Goal: a site that looks designed by a careful human studio for *this* business —
coherent, specific, fast — and nothing like a default AI template.

## Contents
1. Process
2. Anti-AI-slop rules (visual and copy)
3. Typography
4. Colour
5. Layout, spacing and rhythm
6. Key components
7. Imagery and icons
8. Motion
9. Design tokens template
10. QA checklist

## 1. Process

1. **Concept from the business.** Find one idea in the business itself: its material
   (stone, wood, coffee, fabric), place (port city, mountains, old town), craft
   (precision, care, speed), audience (families, B2B buyers, young drivers). Write it
   as 2–3 sentences. Example: "Czysta kostka: kontrast brudu i czystości. Grafit i
   kremowy kamień, ceglasty akcent jak mokra cegła, zdjęcia przed/po jako główny
   bohater, typografia mocna jak szyld firmowy."
2. **Direction.** Choose a typographic voice, a palette, a layout character
   (editorial, grid-precise, bold blocks, airy minimal) and a motion character
   (calm, snappy, playful) that all express the concept. If unsure, sketch 2–3
   directions in words and let the user pick.
3. **Tokens** → **components** → **sections** → **pages**. Never style a page
   directly with ad-hoc values; everything comes from tokens, so the site stays
   coherent.
4. **Review** against the anti-slop list and the QA checklist; fix, then present.

## 2. Anti-AI-slop rules

AI slop is design and copy that look generated: default choices nobody decided on.
People notice it immediately and trust the business less. Avoid these unless the
concept truly calls for one (and then use it deliberately, once).

### Visual tells
- Purple/blue/pink gradients, glowing blobs, aurora backgrounds, mesh gradients as
  filler.
- Glassmorphism everywhere; neon accents on dark backgrounds by default.
- Gradient text on headings; shiny "AI" sparkle icons ✨.
- Emoji used as icons or bullet points in the UI.
- The three identical feature cards (icon in a rounded square + bold title + two
  grey lines), repeated section after section.
- Everything centred, every section the same height and padding, every block in a
  card with the same radius and soft shadow.
- Low-contrast grey text on grey/white; too many shades of grey ("szarość" without
  purpose); washed-out palettes.
- Pill badges above every heading ("Nowość", "Dlaczego my?") and pill buttons with
  gradients.
- Random decorative SVG blobs, dot grids, floating 3D shapes unrelated to the business.
- Cartoon/comic-style or generic flat illustrations of people with laptops; generic
  stock photos (handshakes, headset-wearing consultants, people pointing at screens).
- Fake dashboards or fake app screenshots; fake client logos.
- Animated fade-up on every single element; parallax on everything; scroll-jacking.
- Stat strips with invented numbers ("10 000+ zadowolonych klientów", "99%").
- Default font for everything with no hierarchy; or the same trendy pairing on every
  project.

### Copy tells (English and Polish)
- EN: "Elevate", "Unlock", "Seamless", "Empower", "Revolutionize", "Your journey",
  "Discover the power of", "Not just X — it's Y", "In today's fast-paced world".
- PL: „Odkryj”, „Przenieś swój biznes na wyższy poziom”, „Kompleksowe rozwiązania”,
  „Pasja i profesjonalizm”, „Twój zaufany partner”, „Najwyższa jakość w przystępnej
  cenie”, „Innowacyjne podejście”, „Zaufali nam”, „W dzisiejszych czasach”,
  „Nie tylko X, ale także Y”, „Indywidualne podejście do każdego klienta”.
- Triplets of vague adjectives („szybko, solidnie, profesjonalnie”), excessive em dashes,
  rhetorical questions in every section heading, exclamation marks.
- Placeholder people: „Anna K., zadowolona klientka” with five stars.

### What to do instead
- Specifics beat adjectives: „Myjemy 200 m² kostki w jeden dzień”, „Odpowiadamy w 2
  godziny”, „Gwarancja 12 miesięcy na impregnację”, real prices from X zł.
- Real photos of the business; if none yet, choose a layout where photo slots are
  clearly marked and the design still works with them empty.
- Typographic hierarchy as the main design tool: confident sizes, weights, spacing.
- Vary section shapes: full-bleed image, split 60/40, text-only with big numbers,
  horizontal gallery, dense table, quote set large. Alternate density and air.
- Asymmetry and alignment to a grid instead of centring everything.
- One accent colour derived from the brand or concept, used sparingly for actions
  and highlights.
- Animation only where it explains or rewards (before/after reveal, step-by-step
  process, hover feedback, cart added).

## 3. Typography

- **Polish characters first.** Every font must include Latin Extended-A
  (ą ć ę ł ń ó ś ź ż). Check on Google Fonts with the language filter "Polish" and test
  the string „Zażółć gęślą jaźń ŁÓDŹ” in every weight you use. Load the `latin-ext`
  subset when self-hosting.
- Usually 2 families max: one with character for headings, one highly readable for
  text (or one superfamily with good range).
- Families commonly used with good Polish support (verify before use):
  - Sans: Inter, Manrope, DM Sans, Plus Jakarta Sans, Work Sans, IBM Plex Sans,
    Archivo, Instrument Sans, Bricolage Grotesque, Onest, Rubik, Space Grotesk.
  - Serif: Fraunces, Newsreader, Source Serif 4, Literata, Playfair Display, Cormorant,
    Libre Caslon Text, Instrument Serif.
  - Avoid using Inter + nothing else as a default; it is a fine text face, but give
    headings a voice.
- Type scale: modular (ratio 1.2–1.333), fluid with `clamp()`:
  `--step-0: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);` up to display sizes.
- Body 16–18 px, line-height 1.5–1.7, line length 45–75 characters (`max-width: 65ch`).
- Headings: tighter line-height (1.05–1.2), slight negative tracking for large sizes,
  weight contrast with body.
- Numbers in prices/tables: `font-variant-numeric: tabular-nums;`.
- Polish typography: non-breaking space after single-letter words (w, z, i, a, o, u)
  to avoid orphans at line ends (`&nbsp;` or a small script), proper quotes „…”.

## 4. Colour

- Build a palette with purpose: background, surface, text (strong/muted), border,
  primary/accent (actions), success/warning/error, plus 1–2 brand tones.
- Derive colours from the concept (stone, brick, sea, forest, coffee) rather than
  picking "a nice blue". Consider OKLCH for consistent lightness steps.
- Proportions roughly 60/30/10: dominant neutral (often warm/tinted, not pure grey),
  secondary brand tone, accent for actions.
- Text contrast WCAG AA: 4.5:1 body, 3:1 large text and UI components. Check every
  text/background pair you define.
- Muted text still needs contrast; avoid light grey on white for important content.
- Dark sections are a rhythm tool, not a default theme. If you offer dark mode,
  design it (tinted darks, reduced saturation), don't invert.

## 5. Layout, spacing and rhythm

- 12-column grid on desktop (max content width ~1200–1320 px, wide sections full
  bleed), 4–6 on tablet, single column on mobile with 16–24 px gutters.
- Spacing scale based on 4 or 8 px (4, 8, 12, 16, 24, 32, 48, 64, 96, 128). Section
  padding varies with content importance (not identical everywhere).
- Proximity: related things closer than unrelated things (Gestalt). Space is the main
  grouping tool, borders and cards second.
- Visual hierarchy per section: one focal point, one primary action.
- Plan the page as a sequence with contrast: big hero → dense offer → airy trust →
  image-led gallery → compact FAQ → strong final CTA.
- Mobile is designed, not squeezed: reorder content, sticky action bar for calls/
  bookings, thumb-reachable controls, no hover-only information.

## 6. Key components

- **Header:** logo left, nav, primary CTA right; becomes compact on scroll; mobile menu
  full-screen or sheet with large tap targets; current page indicated.
- **Hero:** one specific headline (what + for whom + benefit), supporting line, primary
  + secondary action, real image/video, trust snippet (Google rating if real). Hero must
  load fast (LCP): optimized image with `fetchpriority="high"`.
- **Offer/pricing:** clear names, what's included, price or "od X zł", CTA per item;
  comparison table where options differ.
- **Reviews (opinie):** source and date visible (Google, Booksy, own), photo if given
  with consent, specific text, overall rating with count; carousel only if many,
  otherwise a masonry or grid; link to all reviews. Mark placeholders clearly.
- **Process:** numbered steps with short text and optional icon/photo, possibly with a
  scroll-linked progress line.
- **Gallery / before-after:** real work, consistent aspect ratios, lightbox, slider for
  before/after with keyboard support.
- **FAQ:** accordion (`<details>` works), real objections, schema FAQPage.
- **Forms:** labels above fields, helpful placeholders not used as labels, inline
  validation after blur, clear error text in Polish, success state with what happens
  next, minimal fields.
- **Footer:** contact, hours, area, legal links, social, company data, small map/
  newsletter; it's a navigation and trust element, not an afterthought.

## 7. Imagery and icons

- Photos: real, consistent colour grading, consistent aspect ratios per context,
  `srcset`/`sizes`, AVIF/WebP, lazy-load below the fold, descriptive alt in Polish.
- Icons: one library (Lucide, Phosphor, Tabler, Heroicons, Remix), one stroke width,
  one size scale, aligned to text baseline; inline SVG or sprite; `aria-hidden` when
  decorative. Icons support text, they don't replace it.
- Illustrations only if they fit the concept and are consistent in style (custom or one
  coherent set); avoid generic flat people.

## 8. Motion

Principles (after Emil Kowalski, Josh W. Comeau and Apple HIG):
- Motion should explain (where something came from), give feedback (pressed, added,
  saved) or reward (a satisfying reveal of the result). Otherwise leave it out.
- Fast: 120–200 ms for hover/press/feedback, 200–400 ms for entrances, up to ~600 ms
  for large scene transitions. Slow UI motion feels broken.
- Easing: `ease-out` style curves for things entering
  (`cubic-bezier(0.22, 1, 0.36, 1)`), `ease-in-out` for movement on screen; avoid
  linear except for continuous loops.
- Animate `transform` and `opacity` (GPU-friendly), not layout properties.
- Don't animate from `scale(0)`; start from ~0.95 with opacity for natural entrances.
- Stagger small groups (40–80 ms), never whole pages of elements.
- Respect `prefers-reduced-motion: reduce` — disable non-essential motion.
- Use progressive enhancement: CSS scroll-driven animations (`animation-timeline:
  view()`) inside `@supports`, IntersectionObserver fallback; GSAP + ScrollTrigger for
  complex storytelling; View Transitions API for page/state transitions.

Reveal pattern (vanilla):

```css
.reveal { opacity: 0; transform: translateY(16px); transition: opacity .5s var(--ease-out), transform .5s var(--ease-out); }
.reveal.is-visible { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } }
```
```js
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
```

Button feedback:
```css
.btn { transition: transform .15s var(--ease-out), background-color .2s, box-shadow .2s; }
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(0) scale(.98); }
.btn:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 3px; }
```

## 9. Design tokens template (full required list: `design-tokens-contract.md`)

```css
:root {
  /* colour — replace with the concept's palette, check contrast */
  --color-bg: #f6f2ea;
  --color-surface: #ffffff;
  --color-text: #1f2328;
  --color-text-muted: #4a4f57;
  --color-border: #ddd5c7;
  --color-primary: #a34a26;       /* actions: white text ≈ 6:1, as text on bg ≈ 5.3:1 */
  --color-primary-contrast: #ffffff;
  --color-dark: #24272b;          /* dark sections */
  --color-success: #2f7d4f;
  --color-error: #b3261e;
  --color-focus: #1a5fb4;

  /* type */
  --font-heading: "Bricolage Grotesque", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;
  --step--1: clamp(0.875rem, 0.85rem + 0.1vw, 0.94rem);
  --step-0: clamp(1rem, 0.96rem + 0.2vw, 1.125rem);
  --step-1: clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem);
  --step-2: clamp(1.56rem, 1.38rem + 0.9vw, 2rem);
  --step-3: clamp(1.95rem, 1.64rem + 1.6vw, 2.75rem);
  --step-4: clamp(2.44rem, 1.9rem + 2.7vw, 3.75rem);
  --step-5: clamp(3.05rem, 2.2rem + 4.2vw, 5rem);

  /* space */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 24px;
  --space-6: 32px; --space-7: 48px; --space-8: 64px; --space-9: 96px; --space-10: 128px;

  /* shape */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 16px;
  --shadow-1: 0 1px 2px rgb(0 0 0 / .06), 0 2px 8px rgb(0 0 0 / .05);

  /* motion */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-fast: 150ms; --dur-base: 250ms; --dur-slow: 450ms;

  --container: 1240px;
}
```

## 10. QA checklist

Design
- [ ] Concept is visible: someone could guess the business from the design without text.
- [ ] Zero items from the anti-slop list (or each one is deliberate and justified).
- [ ] All values come from tokens; consistent radii, shadows, icon style.
- [ ] Section rhythm varies; no three identical blocks in a row.
- [ ] Hierarchy: each section has one focal point and one action.
- [ ] Polish characters render in every font and weight; no orphans of single letters.

Usability
- [ ] Primary action reachable from every screen on mobile.
- [ ] Forms: labels, errors, success state; tested end to end.
- [ ] Navigation works with keyboard; focus visible; skip link.
- [ ] Contrast AA for all text; no information by colour alone.

Performance and SEO
- [ ] Images optimized and sized; fonts subset; LCP element prioritized.
- [ ] Titles/descriptions/OG/schema present; sitemap and robots.

Honesty
- [ ] No invented reviews, numbers, logos, awards; placeholders marked and listed.
