import { esc, raw } from './dom.js';

/**
 * Dependency-free SVG charts. Values come straight from API data; each mark
 * carries a data-tt label shown by bindChartTips().
 */

const DEFS = `<defs>
  <linearGradient id="bar-grad" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5a47e0"/><stop offset="1" stop-color="#9d8cff"/></linearGradient>
  <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,107,154,.28)"/><stop offset="1" stop-color="rgba(255,107,154,0)"/></linearGradient>
</defs>`;

/** @param {number} max */
function niceMax(max) {
  if (max <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/**
 * @param {{ data: { label: string, value: number, value2?: number, tip?: string }[], height?: number, ariaLabel: string, every?: number }} o
 */
export function barChart(o) {
  const W = 640;
  const H = o.height ?? 200;
  const pad = { l: 30, r: 6, t: 10, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const two = o.data.some((d) => d.value2 !== undefined);
  const max = niceMax(Math.max(1, ...o.data.map((d) => Math.max(d.value, d.value2 ?? 0))));
  const step = iw / Math.max(1, o.data.length);
  const bw = Math.max(3, Math.min(28, step * (two ? 0.36 : 0.62)));
  const every = o.every ?? Math.ceil(o.data.length / 10);
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + ih - (ih * i) / 4;
    grid += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}"/>`;
    grid += `<text x="${pad.l - 8}" y="${y + 3}" text-anchor="end" class="axis-y">${Math.round((max * i) / 4)}</text>`;
  }
  let bars = '';
  let labels = '';
  o.data.forEach((d, i) => {
    const cx = pad.l + step * i + step / 2;
    const h1 = (d.value / max) * ih;
    const x1 = two ? cx - bw - 1 : cx - bw / 2;
    bars += `<rect class="bar" x="${x1}" y="${pad.t + ih - h1}" width="${bw}" height="${Math.max(h1, d.value ? 2 : 0)}" rx="3" data-tt="${esc(d.tip ?? `${d.label}: ${d.value}`)}"/>`;
    if (two) {
      const h2 = ((d.value2 ?? 0) / max) * ih;
      bars += `<rect class="bar-alt" x="${cx + 1}" y="${pad.t + ih - h2}" width="${bw}" height="${Math.max(h2, d.value2 ? 2 : 0)}" rx="3" data-tt="${esc(d.tip ?? `${d.label}: ${d.value2}`)}"/>`;
    }
    if (i % every === 0) labels += `<text x="${cx}" y="${H - 6}" text-anchor="middle">${esc(d.label)}</text>`;
  });
  return raw(
    `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.ariaLabel)}">${DEFS}<g class="grid axis">${grid}</g><g>${bars}</g><g class="axis">${labels}</g></svg></div>`,
  );
}

/**
 * @param {{ data: { label: string, value: number | null, tip?: string }[], height?: number, ariaLabel: string, max?: number, suffix?: string }} o
 */
export function lineChart(o) {
  const W = 640;
  const H = o.height ?? 180;
  const pad = { l: 34, r: 8, t: 12, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const vals = o.data.map((d) => d.value).filter((v) => v !== null);
  const max = o.max ?? niceMax(Math.max(1, .../** @type {number[]} */ (vals)));
  const x = (/** @type {number} */ i) => pad.l + (o.data.length <= 1 ? iw / 2 : (iw * i) / (o.data.length - 1));
  const y = (/** @type {number} */ v) => pad.t + ih - (v / max) * ih;
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const gy = pad.t + ih - (ih * i) / 4;
    grid += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${gy}" y2="${gy}"/><text x="${pad.l - 8}" y="${gy + 3}" text-anchor="end">${Math.round((max * i) / 4)}${o.suffix ?? ''}</text>`;
  }
  const pts = o.data.map((d, i) => (d.value === null ? null : [x(i), y(d.value)]));
  let path = '';
  let area = '';
  let seg = /** @type {number[][]} */ ([]);
  const flush = () => {
    if (seg.length) {
      path += `M${seg.map((p) => p.join(',')).join('L')}`;
      area += `M${seg[0][0]},${pad.t + ih}L${seg.map((p) => p.join(',')).join('L')}L${seg[seg.length - 1][0]},${pad.t + ih}Z`;
    }
    seg = [];
  };
  for (const p of pts) {
    if (p) seg.push(p);
    else flush();
  }
  flush();
  const every = Math.ceil(o.data.length / 8);
  const labels = o.data.map((d, i) => (i % every === 0 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(d.label)}</text>` : '')).join('');
  const dots = pts
    .map((p, i) => (p ? `<circle class="pt" cx="${p[0]}" cy="${p[1]}" r="3.5" data-tt="${esc(o.data[i].tip ?? `${o.data[i].label}: ${o.data[i].value}${o.suffix ?? ''}`)}"/>` : ''))
    .join('');
  return raw(
    `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.ariaLabel)}">${DEFS}<g class="grid axis">${grid}</g><path class="area" d="${area}"/><path class="line" d="${path}"/>${dots}<g class="axis">${labels}</g></svg></div>`,
  );
}

/** @param {number | null} pct @param {string} caption @param {number} [size] */
export function ring(pct, caption, size = 112) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const v = pct ?? 0;
  return raw(
    `<div class="ring"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><defs><linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8f7dff"/><stop offset="1" stop-color="#ff7aa4"/></linearGradient></defs><circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}"/><circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v / 100)}"/></svg><div class="ring-label">${pct === null ? '—' : `${Math.round(v)}%`}<small>${esc(caption)}</small></div></div>`,
  );
}

/** Hover/focus tooltips for chart marks. @param {HTMLElement} root */
export function bindChartTips(root) {
  let tip = /** @type {HTMLElement | null} */ (null);
  root.addEventListener('mouseover', (e) => {
    const t = /** @type {SVGElement} */ (e.target);
    const label = t?.getAttribute?.('data-tt');
    const chart = /** @type {HTMLElement | null} */ (t?.closest?.('.chart'));
    if (!label || !chart) return;
    tip?.remove();
    tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.textContent = label;
    chart.append(tip);
    const cr = chart.getBoundingClientRect();
    const r = t.getBoundingClientRect();
    tip.style.left = `${r.left - cr.left + r.width / 2}px`;
    tip.style.top = `${r.top - cr.top}px`;
  });
  root.addEventListener('mouseout', (e) => {
    if (/** @type {Element} */ (e.target)?.getAttribute?.('data-tt')) {
      tip?.remove();
      tip = null;
    }
  });
}
