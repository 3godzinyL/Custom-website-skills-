# Motion system: how top front-end engineers make sites feel alive

`motion-recipes.md` has the basic patterns. This file is the level above: how studios
and the best product teams (Linear, Stripe, Vercel, Apple product pages, Awwwards-level
studios) *design* motion, which modern CSS features they use, what to build for which
kind of site, and the gates every animation must pass. Motion is part of the design
system, not decoration added at the end.

## Contents
1. How the best do it (process)
2. Motion language: personality, tokens, choreography
3. The signature moment
4. Modern CSS techniques (with code)
5. JavaScript techniques worth their weight
6. Idea bank by site type
7. Libraries: when CSS is not enough
8. Performance gate
9. Accessibility gate
10. Motion spec for DESIGN-SYSTEM.md

---

## 1. How the best do it

People to learn from: **Emil Kowalski** (animations.dev, Sonner, Vaul — UI motion
craft), **Rauno Freiberg** (interaction details, Vercel), **Paco Coursey** (cmdk, quiet
precision), **Josh W. Comeau** (springs, whimsy with restraint), **Jhey Tompkins**
(creative CSS, scroll-driven effects), **Bramus Van Damme** (scroll-driven animations,
View Transitions), **Adam Argyle** (transitions, Open Props), **Cassie Evans** and
**Sarah Drasner** (SVG animation), **Lynn Fisher** (playful responsive design),
**Bruno Simon** (WebGL storytelling); studios such as **Lusion**, **Active Theory**,
**Locomotive**, **darkroom.engineering** (Lenis), **Basement Studio**, **Immersive
Garden**, **Resn**. What they have in common:

1. **Motion is designed before it is coded.** A short spec — what moves, why, how long,
   which curve — lives next to the colour and type decisions.
2. **The signature moment is prototyped first**, alone, at full fidelity, then the rest
   of the page is built around it.
3. **Frame-by-frame review.** Slow animations down to 10–25 % in the DevTools Animations
   panel; glitches, jumps and wrong origins become obvious.
4. **Frequency decides duration.** Something used a hundred times a day (menu, tab,
   toggle) is near-instant or not animated; something seen once (hero, page change)
   can take its time.
5. **Interruptible by default.** Interactive states use transitions (they reverse
   smoothly mid-way); keyframes are for one-shot sequences.
6. **Origin-aware.** Popovers grow from their trigger, drawers from their edge, toasts
   from where they stack.
7. **Real devices.** Every moment is checked on a mid-range Android phone, not only on a
   fast laptop.
8. **Restraint.** One memorable moment, a consistent secondary layer, crisp feedback.
   Everything else is still.

## 2. Motion language

### Personality — three words per site
Pick three words from the concept and let them set durations, distances and curves:

| Personality | Durations | Distances | Curves | Typical moves |
|---|---|---|---|---|
| calm, editorial, luxury | slow (400–900 ms) | small (8–16 px) | long ease-out | fades, gentle image scale, text reveal by lines |
| precise, technical, premium | medium (200–500 ms) | small | crisp ease-out, subtle spring for UI | product UI demos, scroll-scrubbed walkthroughs, clip-path reveals |
| warm, crafted, local | medium | small–medium | soft ease-out | slight rotation, hand-drawn SVG lines, before/after |
| bold, energetic, youth | fast (150–350 ms) | larger (24–48 px) | snappy, overshoot | marquees, stagger bursts, sticky stacking cards |
| clinical, trustworthy | fast, minimal | minimal | standard ease-out | feedback only, calm progress indicators |
| dark, nocturnal, studio | medium | small | ease-out with glow | spotlight following the cursor, light trails, slow gradients |

### Tokens (contract names + optional extras)
```css
:root {
  --dur-fast: 150ms;   /* feedback: press, hover, toggle */
  --dur-base: 250ms;   /* UI: menus, popovers, tabs */
  --dur-slow: 500ms;   /* reveals, page changes */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  /* optional */
  --ease-in: cubic-bezier(0.55, 0, 1, 0.45);  /* exits only */
  --ease-spring: linear(0, 0.053, 0.18, 0.343, 0.514, 0.672, 0.807, 0.913, 0.99, 1.042, 1.071, 1.082, 1.082, 1.074, 1.061, 1.047, 1.033, 1.021, 1.011, 1.003, 0.998, 0.995, 0.993, 0.993, 1); /* ~8 % overshoot, use with ~600ms */
  --stagger: 60ms;
}
```

### Choreography rules
- **Three layers**: primary (the signature moment, once), secondary (section reveals,
  page transitions), tertiary (micro-feedback on every control). Each layer has its own
  duration band; never mix them up.
- **Entrances ease out, exits are faster** (≈ 70 % of the entrance) and ease in.
- **Stagger 40–80 ms**, at most 5–7 items; beyond that, reveal the group as one.
- **Hero on load ≤ 1.2 s in total**, and the main headline is readable immediately
  (no waiting for an animation to read the promise; LCP must not wait for motion).
- **Reveal once.** Scroll reveals do not replay on scroll-up; text paragraphs never
  animate word by word while the user reads.
- **One direction of travel per section**; elements move as if they share physics.

## 3. The signature moment

Every site gets exactly one memorable interaction tied to its concept — the thing people
describe to a friend. It is chosen in the demos (each demo proposes a different one) and
specified in `DESIGN-SYSTEM.md`.

Good signature moments *show the product or the result*:
- an app's real flow played in HTML/CSS in the hero (voice → tasks → a planned day),
  pausable, looping ≤ 10 s;
- a before/after slider on the cleaning company's real photo;
- a price that recalculates as the visitor drags the area slider;
- the coffee bag that turns as the roast level changes;
- the floor plan that lights up the apartment you hover in the list.

Bad ones only decorate: blobs, particles, cursor trails without meaning, 3D for its own
sake.

## 4. Modern CSS techniques (progressive enhancement)

Each technique degrades to a static, fully usable result. Check support in the target
browsers (caniuse) and wrap newer ones in `@supports`.

### 4.1 Entry and exit of dialogs, popovers and menus — `@starting-style`
```css
.menu, dialog {
  opacity: 1; transform: none;
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out),
              overlay var(--dur-base) allow-discrete, display var(--dur-base) allow-discrete;
}
.menu:not(:popover-open), dialog:not([open]) { opacity: 0; transform: translateY(6px) scale(.98); }
@starting-style { .menu:popover-open, dialog[open] { opacity: 0; transform: translateY(6px) scale(.98); } }
```
Animates elements that go from `display: none` — no JavaScript timers.

### 4.2 Height to `auto` (accordions, "show more")
```css
:root { interpolate-size: allow-keywords; }            /* Chromium; others snap — fine */
details::details-content { block-size: 0; overflow: clip;
  transition: block-size var(--dur-base) var(--ease-out), content-visibility var(--dur-base) allow-discrete; }
details[open]::details-content { block-size: auto; }
```

### 4.3 Scroll progress and scroll-linked storytelling
```css
@supports (animation-timeline: scroll()) {
  .progress { position: fixed; inset: 0 0 auto; height: 3px; transform-origin: 0 50%;
    background: var(--color-accent); animation: grow linear both; animation-timeline: scroll(root); }
  @keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }

  /* a product screenshot that settles into place as its section enters */
  .shot { animation: settle linear both; animation-timeline: view(); animation-range: entry 10% cover 40%; }
  @keyframes settle { from { transform: perspective(900px) rotateX(14deg) translateY(40px); opacity: .4; } to { transform: none; opacity: 1; } }
}
```
Scroll-driven animations run off the main thread — smoother than scroll listeners.

### 4.4 Sticky stacking cards (process steps, case studies)
```css
.stack { display: grid; gap: var(--space-6); }
.stack > .card { position: sticky; top: calc(var(--space-8) + var(--i) * 16px); }
@supports (animation-timeline: view()) {
  .stack > .card { animation: recede linear both; animation-timeline: view(); animation-range: exit-crossing 0% exit-crossing 100%; }
  @keyframes recede { to { transform: scale(.94); filter: brightness(.85); } }
}
```
Mobile: same effect with smaller offsets, or a plain list if cards are tall.

### 4.5 Page and state transitions — View Transitions
```css
@view-transition { navigation: auto; }                     /* multi-page sites */
.product-card img { view-transition-name: var(--vt); }     /* style="--vt: p-42" per card */
.product-hero img { view-transition-name: var(--vt); }     /* same name on the detail page */
::view-transition-group(*) { animation-duration: var(--dur-slow); animation-timing-function: var(--ease-out); }
```
The card image morphs into the product photo on the next page. Names must be unique
on each page. Same-document changes (filters, tabs): `document.startViewTransition()`.

### 4.6 Clip-path and mask reveals
```css
.reveal-img { clip-path: inset(12% 12% 12% 12% round var(--radius-lg)); transition: clip-path .9s var(--ease-out); }
.reveal-img.is-visible { clip-path: inset(0 0 0 0 round var(--radius-lg)); }
```
Feels editorial and expensive; costs almost nothing.

### 4.7 Animated gradients and numbers with `@property`
```css
@property --angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
.ring { background: conic-gradient(from var(--angle), var(--color-accent), transparent 30%); animation: spin 6s linear infinite; }
@keyframes spin { to { --angle: 360deg; } }
```
Use for a subtle "live" border on the one primary card; pause off-screen.

### 4.8 SVG line drawing (process, maps, signatures)
```html
<svg viewBox="0 0 400 80" aria-hidden="true"><path class="draw" pathLength="1" d="M5 60 C 120 5, 280 5, 395 60"/></svg>
```
```css
.draw { fill: none; stroke: var(--color-accent); stroke-width: 2; stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset 1.2s var(--ease-out); }
.is-visible .draw { stroke-dashoffset: 0; }
```

### 4.9 Marquee (logos, quotes) that respects people
```css
.marquee { overflow: hidden; mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
.marquee__track { display: flex; gap: var(--space-8); width: max-content; animation: slide 40s linear infinite; }
.marquee:hover .marquee__track, .marquee:focus-within .marquee__track, .marquee[data-paused] .marquee__track { animation-play-state: paused; }
@keyframes slide { to { transform: translateX(-50%); } }      /* content duplicated once, copy has aria-hidden="true" */
@media (prefers-reduced-motion: reduce) { .marquee__track { animation: none; flex-wrap: wrap; } }
```
Moving content longer than 5 s needs a visible pause button (WCAG 2.2.2).

### 4.10 Hover effects only where hover exists
```css
@media (hover: hover) and (pointer: fine) {
  .card { background: radial-gradient(400px circle at var(--x, 50%) var(--y, 50%), rgb(255 255 255 / .06), transparent 40%), var(--color-surface); }
}
```
```js
document.querySelectorAll('.card').forEach((c) => c.addEventListener('pointermove', (e) => {
  const r = c.getBoundingClientRect(); c.style.setProperty('--x', `${e.clientX - r.left}px`); c.style.setProperty('--y', `${e.clientY - r.top}px`);
}));
```

## 5. JavaScript techniques worth their weight

### 5.1 FLIP — animate layout changes cheaply (Paul Lewis)
```js
function flip(el, change, opts = { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' }) {
  const first = el.getBoundingClientRect();
  change();                                             // e.g. move the element, change the grid
  const last = el.getBoundingClientRect();
  const dx = first.left - last.left, dy = first.top - last.top;
  const sx = first.width / last.width, sy = first.height / last.height;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }], opts);
}
```
Uses: filtering a grid, add-to-cart (clone the product image and fly it to the cart
icon), expanding a card into a panel.

### 5.2 Split text reveal that stays accessible
```js
document.querySelectorAll('[data-split]').forEach((el) => {
  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  el.innerHTML = text.split(/(\s+)/).map((w, i) => /\s+/.test(w) ? w : `<span class="w" aria-hidden="true" style="--i:${i}"><span>${w}</span></span>`).join('');
});
```
```css
.w { display: inline-block; overflow: clip; vertical-align: top; }
.w > span { display: inline-block; transform: translateY(105%); transition: transform .7s var(--ease-out); transition-delay: calc(var(--i) * 25ms); }
.is-visible .w > span { transform: none; }
```
Split by **words**, not letters (Polish diacritics, kerning and screen readers stay
intact). Only for one or two display headings.

### 5.3 Magnetic primary button (desktop only, subtle)
```js
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('[data-magnetic]').forEach((b) => {
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.15}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`; });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
}
```
Max ~6 px of travel; only on the one main CTA.

### 5.4 Product UI loop in the hero
Build the product's real interface in HTML/CSS (no screenshots of fake apps, no AI
images), then play the real flow with the Web Animations API or CSS keyframes: input →
processing → result. Rules: readable without motion (a meaningful still frame),
a pause button, pause when off-screen (`IntersectionObserver`), no layout shift,
loop ≤ 10 s, and the content is true to what the product does.

### 5.5 Pause what nobody sees
```js
const io = new IntersectionObserver((es) => es.forEach((e) => e.target.toggleAttribute('data-paused', !e.isIntersecting)));
document.querySelectorAll('[data-loop]').forEach((el) => io.observe(el));
```

## 6. Idea bank by site type

| Site type | Signature moment candidates | Secondary layer |
|---|---|---|
| SaaS / app / startup | product UI loop in the hero; scroll-scrubbed feature walkthrough; live demo field the visitor types into | clip-path screenshot reveals, tab crossfades, sticky feature list |
| Local services | before/after slider on real photos; price calculator that reacts instantly; service area map that highlights the visitor's district | counters of real jobs, process steps drawn with SVG lines |
| Shop | add-to-cart flight (FLIP); product image morph from grid to detail (View Transitions); colour swatch that re-tints the product | quick-view popover with `@starting-style`, free-delivery bar filling |
| Restaurant / café | menu tabs with smooth crossfade; dish photo that eases into focus; opening hours that light up "teraz otwarte" | gentle parallax on one hero photo, reservation drawer |
| Portfolio / agency | page transitions between projects; cursor-reveal of project previews (desktop); case-study images with mask reveals | split-text headings, marquee of clients (real ones) |
| Personal brand / courses | the transformation path drawn as a line through the page; curriculum accordion with height animation | testimonial carousel with pause, progress of the course |
| Real estate / hotels | interactive floor plan or map; gallery with shared-element zoom | sticky booking summary, availability calendar transitions |
| Events | honest countdown (real date only); schedule timeline that follows scroll | speaker cards stacking, ticket tier hover states |
| B2B / industrial | technical drawing assembled by SVG lines; spec table with highlighted rows | counters of real numbers, case-study clip reveals |
| NGO | the impact counter tied to a real figure; story told in sticky panels | photo reveals, donation amount buttons with spring feedback |

## 7. Libraries: when CSS is not enough

- **GSAP + ScrollTrigger** (free, all plugins included since 2025): pinned
  storytelling, complex timelines, scrubbed sequences, SplitText.
- **Motion** (motion.dev, formerly Framer Motion): React or vanilla; springs, layout
  animations, exit animations.
- **Lenis**: smooth scrolling only when the concept needs it; keep native scroll
  semantics, anchors and keyboard; off with reduced motion.
- **Rive / Lottie**: designer-made vector animations; Rive for interactive state
  machines. Keep files small, provide a static fallback.
- **Three.js / OGL**: WebGL only for premium tech or portfolio concepts, with a poster
  image, lazy-loaded, paused off-screen, and a budget agreed with the user.
- **AutoAnimate**: list add/remove/reorder transitions in one line.

Prefer CSS first; every library must justify its kilobytes against INP and LCP.

## 8. Performance gate (every animation)

- Animate `transform`, `opacity`, `filter`, `clip-path`; never `width`, `height`,
  `top`, `left`, `margin` (use FLIP instead).
- No scroll listeners for effects — `IntersectionObserver` or scroll-driven animations.
- `will-change` only on elements about to animate, removed afterwards.
- Loops pause off-screen and in background tabs.
- DevTools Performance: no long tasks (> 50 ms) caused by motion, ~60 fps on a
  mid-range phone, CLS 0 from animations, LCP element visible without waiting for JS.
- Hero video: `muted playsinline`, poster image, compressed, not autoplayed on small
  screens if heavy.

## 9. Accessibility gate (every animation)

- `prefers-reduced-motion: reduce` → replace movement with a short fade or nothing;
  never remove information. Parallax, zoom and spinning are removed entirely.
- Anything that moves automatically for more than 5 s can be paused (WCAG 2.2.2);
  nothing flashes more than 3 times per second (2.3.1).
- Content is visible without JavaScript (start hidden only when `html.js` is set).
- Focus is never hidden or moved by an animation; screen-reader reading order is the
  visual order; split text keeps an `aria-label`.
- Hover-only effects never carry information.

## 10. Motion spec for DESIGN-SYSTEM.md

```markdown
## Ruch
- Charakter (3 słowa): …
- Tokeny: --dur-fast …, --dur-base …, --dur-slow …, krzywe …
- Signature moment: <co, gdzie, dlaczego to oddaje koncept, wersja reduced-motion>
- Warstwa druga: <odsłanianie sekcji, przejścia stron — czasy i krzywe>
- Warstwa trzecia: <przycisk, link, pola, menu, toast — czasy>
- Zakazy: <np. bez parallaxy na tekście, bez animacji co 100 ms>
- Sprawdzone: wydajność (telefon), reduced motion, pauza pętli
```
