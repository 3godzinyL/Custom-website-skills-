# Motion recipes

Rules: animate `transform`/`opacity`; 120–200 ms feedback, 200–400 ms entrances,
≤ 600 ms scene changes; ease-out for entering; every recipe has a reduced-motion path.

```css
:root {
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* small overshoot, use sparingly */
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```

## 1. Reveal on scroll (IntersectionObserver)
```css
.reveal { opacity: 0; transform: translateY(14px); transition: opacity .45s var(--ease-out), transform .45s var(--ease-out); transition-delay: calc(var(--i, 0) * 60ms); }
.reveal.is-visible { opacity: 1; transform: none; }
```
```js
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el)); // stagger: style="--i:1", "--i:2" … on siblings
```
Use on section headers and key groups, not every paragraph. Make content visible
without JS (add `.reveal` classes from JS, or use `<html class="js">` gating).

## 2. CSS scroll-driven reveal (progressive enhancement)
```css
@supports (animation-timeline: view()) {
  .sd-reveal { animation: sd-in linear both; animation-timeline: view(); animation-range: entry 0% cover 30%; }
  @keyframes sd-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
}
```

## 3. Button and link feedback
```css
.btn { transition: transform .15s var(--ease-out), background-color .2s, box-shadow .2s; }
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(0) scale(.98); }
.btn:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 3px; }
.link { background: linear-gradient(currentColor 0 0) 0 100% / 0 1px no-repeat; transition: background-size .25s var(--ease-out); }
.link:hover { background-size: 100% 1px; }
```

## 4. Image reveal with gentle scale
```css
.img-reveal { overflow: hidden; border-radius: var(--radius-lg); }
.img-reveal img { transform: scale(1.06); opacity: 0; transition: transform .9s var(--ease-out), opacity .6s var(--ease-out); }
.img-reveal.is-visible img { transform: scale(1); opacity: 1; }
```

## 5. Before / after slider (accessible)
```html
<div class="ba" style="--pos:50%">
  <img src="po.avif" alt="Kostka po myciu">
  <img class="ba-before" src="przed.avif" alt="Kostka przed myciem">
  <input class="ba-range" type="range" min="0" max="100" value="50" aria-label="Porównanie przed i po">
</div>
```
```css
.ba { position: relative; aspect-ratio: 4/5; overflow: hidden; border-radius: var(--radius-lg); }
.ba img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.ba-before { clip-path: inset(0 calc(100% - var(--pos)) 0 0); }
.ba-range { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: ew-resize; }
.ba::after { content: ""; position: absolute; top: 0; bottom: 0; left: var(--pos); width: 2px; background: #fff; box-shadow: 0 0 0 1px rgb(0 0 0 / .2); pointer-events: none; }
```
```js
document.querySelectorAll('.ba').forEach((ba) => {
  const r = ba.querySelector('.ba-range');
  r.addEventListener('input', () => ba.style.setProperty('--pos', r.value + '%'));
});
```
The native range input gives keyboard and screen-reader support for free.

## 6. Header that compacts on scroll
```js
const header = document.querySelector('.site-header');
const sentinel = document.createElement('div'); sentinel.style.height = '1px';
document.body.prepend(sentinel);
new IntersectionObserver(([e]) => header.classList.toggle('is-compact', !e.isIntersecting)).observe(sentinel);
```
```css
.site-header { transition: padding .25s var(--ease-out), background-color .25s, box-shadow .25s; }
.site-header.is-compact { padding-block: 8px; background: var(--color-surface); box-shadow: var(--shadow-1); }
```

## 7. Accordion (FAQ) with native details
```css
details summary { cursor: pointer; list-style: none; }
details summary::after { content: "+"; float: right; transition: transform .2s var(--ease-out); }
details[open] summary::after { transform: rotate(45deg); }
details .answer { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .3s var(--ease-out); }
details[open] .answer { grid-template-rows: 1fr; }
details .answer > div { overflow: hidden; }
```
Note: the height transition only runs where the browser animates `details` content;
it degrades to instant open, which is fine.

## 8. Page / state transitions (View Transitions API)
```css
@view-transition { navigation: auto; } /* cross-document, supporting browsers */
::view-transition-old(root), ::view-transition-new(root) { animation-duration: .25s; }
```
```js
// same-document state change
if (document.startViewTransition) document.startViewTransition(() => updateDom());
else updateDom();
```

## 9. Counter (only for real numbers)
```js
function countUp(el, to, ms = 900) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = to.toLocaleString('pl-PL'); return; }
  const t0 = performance.now();
  const step = (t) => { const p = Math.min(1, (t - t0) / ms); el.textContent = Math.round(to * (1 - (1 - p) ** 3)).toLocaleString('pl-PL'); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
```

## 10. When to use libraries
- **GSAP + ScrollTrigger** (free): pinned storytelling sequences, timelines,
  scrubbed animations.
- **Motion** (React/JS): component enter/exit, layout animations, springs.
- **Lenis**: smooth scrolling only if the concept needs it; keep native scroll
  semantics, test keyboard and reduced motion.
- **Lottie**: designer-made vector animations; keep files small.
