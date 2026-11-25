import { now } from './db.js';

// Only these names are stored; everything is aggregated per day (no IP, no cookies, no user id).
export const EVENTS = new Set([
  'page_view', 'hero_impression', 'waitlist_submit', 'waitlist_confirm', 'demo_run', 'demo_dictate',
  'referral_copy', 'referral_share', 'pricing_toggle', 'presale_start', 'presale_paid', 'survey_answer', 'faq_open',
]);
// What the browser may report. Impressions, sign-ups, confirmations and payments are recorded only by the server.
export const CLIENT_EVENTS = new Set(['page_view', 'demo_run', 'demo_dictate', 'referral_copy', 'referral_share', 'pricing_toggle', 'faq_open']);
export const VARIANTS = ['a', 'b', 'c'];
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|curl|wget|python|node-fetch/i;

export const isBot = (ua) => !ua || BOT_RE.test(ua);
export const pickVariant = () => VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
const day = (t = now()) => new Date(t).toISOString().slice(0, 10);

export function recordEvent(db, name, { variant = '', lang = '' } = {}) {
  if (!EVENTS.has(name)) return false;
  const v = VARIANTS.includes(variant) ? variant : '';
  const l = lang === 'en' ? 'en' : lang === 'pl' ? 'pl' : '';
  db.prepare(`INSERT INTO events_daily(day, name, variant, lang, count) VALUES(?,?,?,?,1)
    ON CONFLICT(day, name, variant, lang) DO UPDATE SET count = count + 1`).run(day(), name, v, l);
  return true;
}

export function recordError(db, source, message, detail = '', path = '') {
  db.prepare('INSERT INTO errors(source, message, detail, path, created_at) VALUES(?,?,?,?,?)')
    .run(source, String(message).slice(0, 500), String(detail || '').slice(0, 2000), String(path || '').slice(0, 200), now());
}

// Two-proportion z-test against the control (variant a). Returns p-value (two-sided).
export function zTest(c1, n1, c2, n2) {
  if (!n1 || !n2) return null;
  const p1 = c1 / n1, p2 = c2 / n2, p = (c1 + c2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  if (!se) return null;
  const z = (p2 - p1) / se;
  return 2 * (1 - normCdf(Math.abs(z)));
}
function normCdf(x) {
  // Abramowitz–Stegun approximation
  const t = 1 / (1 + 0.2316419 * x);
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  return 1 - d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
}

export function abResults(db) {
  const imp = Object.fromEntries(db.prepare("SELECT variant, SUM(count) n FROM events_daily WHERE name = 'hero_impression' GROUP BY variant").all().map((r) => [r.variant, r.n]));
  const sub = Object.fromEntries(db.prepare('SELECT variant, COUNT(*) n FROM subscribers WHERE variant IS NOT NULL GROUP BY variant').all().map((r) => [r.variant, r.n]));
  const conf = Object.fromEntries(db.prepare("SELECT variant, COUNT(*) n FROM subscribers WHERE variant IS NOT NULL AND confirmed_at IS NOT NULL GROUP BY variant").all().map((r) => [r.variant, r.n]));
  const a = { n: imp.a || 0, c: sub.a || 0 };
  return VARIANTS.map((v) => {
    const n = imp[v] || 0, c = sub[v] || 0;
    return {
      variant: v, impressions: n, signups: c, confirmed: conf[v] || 0,
      rate: n ? c / n : 0,
      pValue: v === 'a' ? null : zTest(a.c, a.n, c, n),
    };
  });
}

export function funnel(db, days = 30) {
  const since = day(now() - days * 86_400_000);
  const rows = db.prepare('SELECT name, SUM(count) n FROM events_daily WHERE day >= ? GROUP BY name').all(since);
  return Object.fromEntries(rows.map((r) => [r.name, r.n]));
}
