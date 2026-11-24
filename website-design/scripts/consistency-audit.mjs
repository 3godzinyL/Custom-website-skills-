#!/usr/bin/env node
// Design consistency audit — Node 18+, no dependencies, read-only.
// Finds hardcoded colours, near-duplicate colours, font-family chaos, off-scale font sizes
// and spacing, radius/shadow/z-index sprawl, breakpoints, !important, inline styles, and
// checks WCAG contrast of common token pairs.
//
// Usage:
//   node consistency-audit.mjs <styles-dir-or-file> [--tokens tokens.css] [--html pages-dir]
//                              [--out audit.json] [--ignore a,b] [--scale 4]

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) {
  console.error('Usage: node consistency-audit.mjs <styles-dir-or-file> [--tokens tokens.css] [--html pages-dir] [--out audit.json] [--ignore a,b] [--scale 4]');
  process.exit(1);
}
const opt = (n, d) => { const i = args.indexOf(n); return i > -1 && args[i + 1] ? args[i + 1] : d; };
const TARGET = path.resolve(args[0]);
const TOKENS = opt('--tokens', null) ? path.resolve(opt('--tokens')) : null;
const HTML_DIR = opt('--html', null) ? path.resolve(opt('--html')) : null;
const OUT = opt('--out', null);
const SCALE = Number(opt('--scale', 4));
const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'vendor', 'coverage', ...String(opt('--ignore', '')).split(',').map((s) => s.trim()).filter(Boolean)]);

function collect(p, exts) {
  const out = [];
  const walk = (x) => {
    let st; try { st = fs.statSync(x); } catch { return; }
    if (st.isFile()) { if (exts.test(x) && !/\.min\./.test(x) && st.size < 3_000_000) out.push(x); return; }
    for (const e of fs.readdirSync(x, { withFileTypes: true })) if (!IGNORE.has(e.name)) walk(path.join(x, e.name));
  };
  walk(p);
  return out;
}
const STYLE_EXT = /\.(css|scss|sass|less|pcss)$/i;
const MARKUP_EXT = /\.(html?|vue|svelte|astro|jsx|tsx|php)$/i;
const styleFiles = collect(TARGET, STYLE_EXT);
const markupFiles = HTML_DIR ? collect(HTML_DIR, MARKUP_EXT) : [];
const BASE = (() => {
  const dirs = [TARGET, HTML_DIR, TOKENS].filter(Boolean).map((p) => { try { return fs.statSync(p).isDirectory() ? p : path.dirname(p); } catch { return path.dirname(p); } });
  let base = dirs[0];
  while (!dirs.every((d) => (d + path.sep).startsWith(base + path.sep)) && path.dirname(base) !== base) base = path.dirname(base);
  return base;
})();
const rel = (p) => path.relative(BASE, p).split(path.sep).join('/') || path.basename(p);

// ---------- colour helpers ----------
function hexToRgb(h) {
  let s = h.replace('#', '').toLowerCase();
  if (s.length === 3 || s.length === 4) s = s.split('').map((c) => c + c).join('');
  if (s.length !== 6 && s.length !== 8) return null;
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
}
function parseColor(v) {
  v = v.trim().toLowerCase();
  if (v.startsWith('#')) return hexToRgb(v);
  const m = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
}
const lum = ([r, g, b]) => { const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
const toHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');

// ---------- parse declarations ----------
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)/g;
const NAMED = /\b(red|blue|green|black|white|gray|grey|orange|yellow|purple|rebeccapurple|pink|brown|navy|teal|silver|gold|maroon|olive|lime|aqua|fuchsia|crimson|tomato|coral|salmon|indigo|violet)\b/;

const found = {
  colorsHardcoded: new Map(), // value -> [{file,line,prop}]
  colorTokens: new Map(),     // --name -> value
  fontFamilies: new Map(),
  fontSizes: new Map(),
  spacingOffScale: new Map(),
  spacingAll: new Map(),
  radii: new Map(),
  shadows: new Map(),
  zIndex: new Map(),
  breakpoints: new Map(),
  important: [],
  inlineStyles: [],
  customProps: new Map(),
};
const push = (map, key, loc) => { if (!map.has(key)) map.set(key, []); map.get(key).push(loc); };

function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')); }

function scanCss(file, text, isTokens) {
  const src = stripComments(text);
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    const loc = { file: rel(file), line: i + 1 };
    for (const mq of line.matchAll(/@(?:media|container)[^{]*?(?:min|max)-width\s*:\s*([\d.]+(?:px|em|rem))/g)) push(found.breakpoints, mq[1], loc);
    const decls = line.replace(/[{}]/g, ';').split(';');
    for (const d of decls) {
      const m = d.match(/(--[\w-]+|[a-z-]+)\s*:\s*([^{}]+)$/i);
      if (!m) continue;
      const prop = m[1].toLowerCase();
      const rawVal = m[2].trim();
      if (/!important/.test(rawVal)) found.important.push({ ...loc, prop });
      const val = rawVal.replace(/\s*!important/, '');
      if (prop.startsWith('--')) {
        found.customProps.set(prop, val.replace(/!important/, '').trim());
        if (COLOR_RE.test(val)) found.colorTokens.set(prop, val);
        COLOR_RE.lastIndex = 0;
        continue; // token definitions are allowed to hold raw values
      }
      if (isTokens) continue;
      // colours
      for (const c of val.matchAll(COLOR_RE)) push(found.colorsHardcoded, c[0].toLowerCase(), { ...loc, prop });
      if (/color|background|border|fill|stroke|outline|shadow/.test(prop) && NAMED.test(val) && !/var\(/.test(val)) push(found.colorsHardcoded, val.match(NAMED)[0], { ...loc, prop });
      // fonts
      if (prop === 'font-family' && !/var\(/.test(val) && !/inherit|initial|unset/.test(val)) push(found.fontFamilies, val.replace(/\s+/g, ' '), loc);
      if (prop === 'font' && !/var\(/.test(val) && /["']|serif|sans|mono/.test(val)) push(found.fontFamilies, '(font shorthand) ' + val, loc);
      if (prop === 'font-size' && !/var\(|inherit|em$|%$/.test(val)) push(found.fontSizes, val, loc);
      // spacing
      if (/^(margin|padding|gap|row-gap|column-gap)(-|$)/.test(prop) && !/var\(/.test(val)) {
        for (const px of val.matchAll(/(-?\d*\.?\d+)px/g)) {
          const n = Math.abs(Number(px[1]));
          push(found.spacingAll, n + 'px', loc);
          if (n > 2 && n % SCALE !== 0) push(found.spacingOffScale, n + 'px', { ...loc, prop });
        }
      }
      if (/radius/.test(prop) && !/var\(/.test(val)) push(found.radii, val, loc);
      if (prop === 'box-shadow' && !/var\(|none/.test(val)) push(found.shadows, val, loc);
      if (prop === 'z-index' && !/var\(/.test(val)) push(found.zIndex, val, loc);
    }
  });
}

let tokenText = '';
if (TOKENS) { try { tokenText = fs.readFileSync(TOKENS, 'utf8'); scanCss(TOKENS, tokenText, true); } catch (e) { console.error(`Cannot read tokens: ${e.message}`); } }
for (const f of styleFiles) {
  if (TOKENS && path.resolve(f) === TOKENS) continue;
  let t; try { t = fs.readFileSync(f, 'utf8'); } catch { continue; }
  scanCss(f, t, false);
}
// <style> blocks and style="" attributes in markup
for (const f of markupFiles) {
  let t; try { t = fs.readFileSync(f, 'utf8'); } catch { continue; }
  for (const m of t.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const offset = t.slice(0, m.index).split('\n').length - 1;
    const block = '\n'.repeat(offset) + m[1];
    scanCss(f, block, false);
  }
  for (const m of t.matchAll(/\sstyle\s*=\s*(\{\{[\s\S]*?\}\}|"[^"]*"|'[^']*')/g)) {
    const line = t.slice(0, m.index).split('\n').length;
    found.inlineStyles.push({ file: rel(f), line, style: m[1].slice(0, 100) });
    const css = m[1].replace(/^["'{]+|["'}]+$/g, '');
    scanCss(f, '\n'.repeat(line - 1) + css.replace(/,\s*(?=[a-zA-Z]+:)/g, ';'), false);
  }
}

// ---------- analysis ----------
const sortByCount = (map) => [...map.entries()].sort((a, b) => b[1].length - a[1].length);
const tokenColorValues = new Map();
for (const [name, v] of found.colorTokens) { const rgb = parseColor(v); if (rgb) tokenColorValues.set(name, rgb); }

// near-duplicate colours: greedy clusters of opaque RGB values within distance 14,
// most-used colour first, so each cluster suggests one value to keep
const uses = (c) => (found.colorsHardcoded.get(c) || []).length;
const allColors = [...new Set([...found.colorsHardcoded.keys(), ...[...found.colorTokens.values()].map((v) => v.toLowerCase())])]
  .map((c) => ({ c, rgb: parseColor(c), n: uses(c) })).filter((x) => x.rgb)
  .sort((a, b) => b.n - a.n);
const clusters = [];
for (const col of allColors) {
  const hit = clusters.find((k) => dist(k.rep.rgb, col.rgb) < 14);
  if (hit) hit.members.push(col); else clusters.push({ rep: col, members: [col] });
}
const nearDupes = clusters
  .filter((k) => new Set(k.members.map((m) => toHex(m.rgb))).size > 1)
  .map((k) => ({ keep: k.rep.c, merge: k.members.slice(1).map((m) => m.c), uses: k.members.reduce((s, m) => s + m.n, 0) }))
  .sort((a, b) => b.uses - a.uses);
// hardcoded colours that equal a token → suggest the token
const suggestions = [];
for (const [c] of found.colorsHardcoded) {
  const rgb = parseColor(c);
  if (!rgb) continue;
  let best = null;
  for (const [name, trgb] of tokenColorValues) { const d = dist(rgb, trgb); if (!best || d < best.d) best = { name, d }; }
  if (best && best.d < 14) suggestions.push({ value: c, token: best.name, exact: best.d === 0 });
}
// contrast of common token pairs
const PAIRS = [
  ['--color-text', '--color-bg'], ['--color-text', '--color-surface'], ['--color-text-muted', '--color-bg'],
  ['--color-text-muted', '--color-surface'], ['--color-primary-contrast', '--color-primary'], ['--color-on-dark', '--color-dark'],
  ['--color-primary', '--color-bg'], ['--color-accent', '--color-bg'], ['--color-error', '--color-bg'], ['--color-success', '--color-bg'],
];
function resolveVar(name, depth = 0) {
  const v = found.customProps.get(name);
  if (!v || depth > 5) return null;
  const ref = v.match(/^var\((--[\w-]+)/);
  if (ref) return resolveVar(ref[1], depth + 1);
  return parseColor(v);
}
const contrastResults = [];
for (const [fg, bg] of PAIRS) {
  const a = resolveVar(fg), b = resolveVar(bg);
  if (a && b) {
    const r = contrast(a, b);
    contrastResults.push({ fg, bg, ratio: Math.round(r * 100) / 100, aa: r >= 4.5, aaLarge: r >= 3 });
  }
}

const hardcodedCount = [...found.colorsHardcoded.values()].reduce((s, a) => s + a.length, 0);
const summary = {
  styleFiles: styleFiles.length,
  markupFiles: markupFiles.length,
  colourTokens: found.colorTokens.size,
  hardcodedColourUses: hardcodedCount,
  distinctHardcodedColours: found.colorsHardcoded.size,
  fontFamilies: found.fontFamilies.size,
  fontSizes: found.fontSizes.size,
  offScaleSpacings: found.spacingOffScale.size,
  radii: found.radii.size,
  shadows: found.shadows.size,
  zIndexes: found.zIndex.size,
  breakpoints: found.breakpoints.size,
  important: found.important.length,
  inlineStyles: found.inlineStyles.length,
};

// ---------- report ----------
const md = [];
const top = (map, n = 12) => sortByCount(map).slice(0, n).map(([k, locs]) => `- \`${k}\` × ${locs.length} — ${locs.slice(0, 3).map((l) => `${l.file}:${l.line}`).join(', ')}${locs.length > 3 ? ' …' : ''}`);
md.push(`# Design consistency audit`);
md.push(`Base: ${BASE}`);
md.push(`Target: ${rel(TARGET) || '.'}${TOKENS ? ` · tokens: ${rel(TOKENS)}` : ' · no tokens file given'}${HTML_DIR ? ` · markup: ${rel(HTML_DIR)}` : ''}`);
md.push('');
md.push('| Metric | Value | Target |');
md.push('|---|---|---|');
md.push(`| Style files | ${summary.styleFiles} | |`);
md.push(`| Colour tokens defined | ${summary.colourTokens} | 12–25 roles |`);
md.push(`| Hardcoded colour uses (outside token definitions) | ${summary.hardcodedColourUses} (${summary.distinctHardcodedColours} distinct) | 0 |`);
md.push(`| Groups of near-identical colours | ${nearDupes.length} | 0 |`);
md.push(`| Font-family declarations (not via var) | ${summary.fontFamilies} distinct | 0 (fonts only in tokens) |`);
md.push(`| Distinct raw font sizes | ${summary.fontSizes} | 0 (use --step-*) |`);
md.push(`| Off-scale spacing values (not multiple of ${SCALE}px) | ${summary.offScaleSpacings} distinct | 0 |`);
md.push(`| Distinct border radii | ${summary.radii} | ≤ 4 |`);
md.push(`| Distinct box shadows | ${summary.shadows} | ≤ 3 |`);
md.push(`| Distinct z-index values | ${summary.zIndexes} | ≤ 5 (tokens) |`);
md.push(`| Distinct breakpoints | ${summary.breakpoints} | ≤ 5 |`);
md.push(`| !important | ${summary.important} | as few as possible |`);
md.push(`| Inline style attributes | ${summary.inlineStyles} | 0 for design values |`);
md.push('');
if (contrastResults.length) {
  md.push('## Contrast of token pairs (WCAG)');
  md.push('| Text | Background | Ratio | AA text | AA large/UI |');
  md.push('|---|---|---|---|---|');
  for (const c of contrastResults) md.push(`| ${c.fg} | ${c.bg} | ${c.ratio}:1 | ${c.aa ? '✅' : '❌'} | ${c.aaLarge ? '✅' : '❌'} |`);
  md.push('');
}
md.push('## Hardcoded colours (most used)'); md.push(...(top(found.colorsHardcoded).length ? top(found.colorsHardcoded) : ['- none'])); md.push('');
if (suggestions.length) { md.push('## Replace with existing tokens'); for (const s of suggestions.slice(0, 30)) md.push(`- \`${s.value}\` → \`var(${s.token})\`${s.exact ? '' : ' (close match)'}`); md.push(''); }
if (nearDupes.length) {
  md.push('## Near-identical colours (keep the first, merge the rest)');
  md.push('Alpha variants of one base colour are grouped too — replace them with one token plus alpha (`color-mix()` or an `--*-rgb` channel token).');
  for (const g of nearDupes.slice(0, 25)) md.push(`- keep \`${g.keep}\` ← merge ${g.merge.slice(0, 8).map((x) => `\`${x}\``).join(', ')}${g.merge.length > 8 ? ` … (+${g.merge.length - 8})` : ''} · ${g.uses} uses`);
  md.push('');
}
md.push('## Font families (outside tokens)'); md.push(...(top(found.fontFamilies, 10).length ? top(found.fontFamilies, 10) : ['- none'])); md.push('');
md.push('## Raw font sizes'); md.push(...(top(found.fontSizes, 20).length ? top(found.fontSizes, 20) : ['- none'])); md.push('');
md.push(`## Off-scale spacing (not a multiple of ${SCALE}px)`); md.push(...(top(found.spacingOffScale, 15).length ? top(found.spacingOffScale, 15) : ['- none'])); md.push('');
md.push('## Radii'); md.push(...(top(found.radii, 10).length ? top(found.radii, 10) : ['- none'])); md.push('');
md.push('## Shadows'); md.push(...(top(found.shadows, 8).length ? top(found.shadows, 8) : ['- none'])); md.push('');
md.push('## z-index'); md.push(...(top(found.zIndex, 10).length ? top(found.zIndex, 10) : ['- none'])); md.push('');
md.push('## Breakpoints'); md.push(...(top(found.breakpoints, 12).length ? top(found.breakpoints, 12) : ['- none'])); md.push('');
if (found.inlineStyles.length) { md.push('## Inline styles (first 15)'); for (const s of found.inlineStyles.slice(0, 15)) md.push(`- ${s.file}:${s.line} \`${s.style}\``); md.push(''); }
console.log(md.join('\n'));

if (OUT) {
  const obj = (map) => Object.fromEntries(sortByCount(map).map(([k, v]) => [k, v]));
  fs.writeFileSync(OUT, JSON.stringify({ summary, contrast: contrastResults, nearDuplicates: nearDupes, tokenSuggestions: suggestions, colorsHardcoded: obj(found.colorsHardcoded), fontFamilies: obj(found.fontFamilies), fontSizes: obj(found.fontSizes), spacingOffScale: obj(found.spacingOffScale), radii: obj(found.radii), shadows: obj(found.shadows), zIndex: obj(found.zIndex), breakpoints: obj(found.breakpoints), important: found.important, inlineStyles: found.inlineStyles }, null, 2));
  console.log(`\nJSON saved to ${OUT}`);
}
