# Design critique: rubric and anti-AI-slop scan

## 1. Rubric (score 1–5, one-line justification each)

| # | Criterion | 1 | 3 | 5 |
|---|---|---|---|---|
| 1 | Concept & identity | template look, could be any business | some brand cues | the design itself tells what the business is |
| 2 | Visual hierarchy | everything same weight | headings clear, sections flat | one focal point per screen, eye path obvious |
| 3 | Typography | default font, weak scale, long lines | decent pairing, some inconsistency | expressive heading face, perfect scale, rhythm, Polish details right |
| 4 | Colour | random/default palette, low contrast | coherent but bland | purposeful palette from concept, accent used sparingly, AA everywhere |
| 5 | Layout & rhythm | identical blocks, centred everything | grid used, repetitive | varied sections, asymmetry, density and air alternate |
| 6 | Imagery & icons | stock/generic, mixed icon styles | real but uneven | real, consistent grading/ratios, one icon system |
| 7 | Components & consistency | ad-hoc styles per page | mostly consistent | tokenised system, all states designed |
| 8 | Motion | none or gimmicky everywhere | some transitions | purposeful, fast, reduced-motion respected |
| 9 | Mobile | squeezed desktop | usable | designed for thumb, sticky action, reordered content |
| 10 | Accessibility | contrast/focus failures | mostly AA | AA+, visible focus, keyboard, alt, labels |

Overall = average; also name the single weakest criterion, it usually gives the
biggest gain.

## 2. Anti-AI-slop scan

Report every hit with location (page, section) and the fix.

| Tell | How to spot | Fix |
|---|---|---|
| Purple/blue gradient or glowing blobs | hero/section backgrounds | solid tinted neutral + real photo, or a colour field from the concept |
| Glassmorphism by default | blurred translucent cards everywhere | solid surfaces; blur only for overlays on imagery, if at all |
| Gradient text | headings with `background-clip: text` | solid colour, hierarchy by size/weight |
| Emoji as icons | ✨🚀✅ in UI | one icon library (Lucide/Phosphor/Tabler), consistent stroke |
| Three identical cards | icon-in-circle + title + 2 lines ×3 | vary: numbered list, split image/text, table, large quote |
| Everything centred | text-align center for all sections | left-aligned text on a grid; centre only deliberately |
| Uniform sections | same padding/height/background every block | plan rhythm: wide/narrow, dark/light, dense/airy |
| Card soup | every element in a rounded card with shadow | group with space and rules; cards only for repeatable items |
| Grey on grey | muted text < 4.5:1, many greys | fewer neutrals, tinted, AA contrast |
| Pill badges everywhere | small pills above headings | remove; use eyebrow text only where it adds information |
| Decorative filler | blobs, dot grids, 3D shapes unrelated to business | remove or replace with concept-based element (texture, material photo) |
| Comic/flat-people illustrations | generic vector characters | real photography or custom illustration in a coherent style |
| Stock clichés | handshakes, headset agents, laptops | real business photos; mark placeholders |
| Fake proof | invented stats, logos, five-star "Anna K." | remove; real data or marked placeholders |
| Animation overload | fade-up on every element, parallax everywhere | animate key moments only; stagger small groups; reduced motion |
| Default type | single default sans, no scale | heading face with character + readable text face, fluid scale |
| Generic copy | „Odkryj”, „kompleksowe rozwiązania”, „pasja i profesjonalizm”, "Elevate", "Seamless" | concrete facts: time, price, area, guarantee |
| Neon-on-dark default | dark theme with neon accent for a non-tech business | light or tinted palette matching the business |

## 3. How to present a critique

```markdown
## Ocena designu — <strona>
Ogólnie: <x.x / 5> · Najsłabszy obszar: <…>

| Kryterium | Ocena | Dlaczego |
|---|---|---|

### AI slop — znalezione
- <miejsce>: <co> → <poprawka z wartościami>

### Poprawki według wpływu
1. <zmiana> — teraz: … → po zmianie: … (wartości: …)
2. …

### Trzy zmiany, które dadzą najwięcej
1. …
```
