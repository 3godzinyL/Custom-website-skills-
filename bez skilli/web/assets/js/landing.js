import { $, $$, applyDyn, esc, html, mount } from './lib/dom.js';
import { barChart, bindChartTips } from './lib/charts.js';
import { duration, fmtDate } from './lib/format.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');
applyDyn(document);

/* ---------- Navbar ---------- */
const nav = $('[data-nav]');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const toggle = $('[data-nav-toggle]');
const menu = $('#mobile-menu');
toggle.addEventListener('click', () => {
  const open = menu.hidden;
  menu.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
});
$$('a', menu).forEach((a) =>
  a.addEventListener('click', () => {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }),
);

/* ---------- Scroll reveal ---------- */
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }
  },
  { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
);
$$('.reveal').forEach((el) => io.observe(el));

/* ---------- Hero: re-plan animation ---------- */
const hero = $('[data-hero]');
/** @type {number[]} */
let heroTimers = [];
function heroReset() {
  heroTimers.forEach(clearTimeout);
  heroTimers = [];
  hero.classList.remove('is-replanned');
  $$('[data-hero-step]', hero).forEach((el) => (el.hidden = true));
  $$('.tl-block', hero).forEach((b) => {
    if (b.dataset.top) b.style.top = b.dataset.top;
    const meta = /** @type {HTMLElement | null} */ (b.querySelector('[data-meta-b]'));
    if (meta) meta.textContent = meta.dataset.metaB || '';
  });
  $('.hero-call', hero).hidden = true;
  $('[data-hero-now]', hero).hidden = true;
  $('[data-hero-badge]', hero).textContent = 'Plan';
}
function heroPlay() {
  heroReset();
  const at = (/** @type {number} */ ms, /** @type {() => void} */ fn) => heroTimers.push(window.setTimeout(fn, reduceMotion ? 0 : ms));
  at(900, () => {
    $('[data-hero-step="1"]', hero).hidden = false;
  });
  at(1500, () => {
    $('[data-hero-step="typing"]', hero).hidden = false;
  });
  at(2600, () => {
    $('[data-hero-step="typing"]', hero).hidden = true;
    $('.hero-call', hero).hidden = false;
    $('[data-hero-now]', hero).hidden = false;
    hero.classList.add('is-replanned');
    $$('.tl-block[data-a-top]', hero).forEach((b) => (b.style.top = b.dataset.aTop || ''));
    $$('[data-meta-a]', hero).forEach((m) => (m.textContent = m.dataset.metaA || ''));
    $('[data-hero-badge]', hero).textContent = 'Re-planned 10:35';
    $('[data-hero-step="2"]', hero).hidden = false;
  });
}
const heroObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    heroPlay();
    heroObserver.disconnect();
  }
});
heroObserver.observe(hero);
$('[data-hero-replay]').addEventListener('click', heroPlay);

/* ---------- Live parser demo ---------- */
const demoForm = /** @type {HTMLFormElement} */ ($('[data-demo-form]'));
const demoOut = $('[data-demo-out]');
const PRIO = ['', 'Urgent', 'High', 'Medium', 'Low'];
demoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = /** @type {HTMLButtonElement} */ (demoForm.querySelector('button'));
  const text = /** @type {HTMLTextAreaElement} */ (demoForm.elements.namedItem('text')).value.trim();
  if (text.length < 3) return;
  btn.classList.add('is-loading');
  btn.disabled = true;
  try {
    const res = await fetch('/api/demo/parse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Could not parse that.');
    if (!data.tasks.length) {
      mount(demoOut, html`<div class="empty"><h3>No tasks found</h3><p>Try listing a few things you need to do, separated by commas or “and”.</p></div>`);
      return;
    }
    mount(
      demoOut,
      html`<div class="task-list">
        ${data.tasks.map(
          (/** @type {any} */ t) => html`<div class="task">
            <span class="task-check"></span>
            <span class="task-main"><span class="task-title">${t.title}</span>
              <span class="task-meta"><span class="prio prio-${t.priority}">${PRIO[t.priority]}</span><span>~${duration(t.estimateMinutes)}</span>${t.dueDate ? html`<span class="is-today">Due ${fmtDate(t.dueDate)}</span>` : ''}</span>
            </span>
          </div>`,
        )}
      </div>`,
    );
  } catch (err) {
    mount(demoOut, html`<div class="empty"><h3>Something went wrong</h3><p>${/** @type {Error} */ (err).message}</p></div>`);
  } finally {
    btn.classList.remove('is-loading');
    btn.disabled = false;
  }
});

/* ---------- Adaptive before / after ---------- */
const adaptive = $('[data-adaptive]');
const diff = $('[data-adaptive-diff]');
const count = $('[data-adaptive-count]');
/** @param {'before' | 'after'} state */
function setAdaptive(state) {
  const after = state === 'after';
  adaptive.classList.toggle('is-after', after);
  $$('[data-adaptive-set]', adaptive).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.adaptiveSet === state)));
  $$('.tl-block[data-a-top]', adaptive).forEach((b) => (b.style.top = (after ? b.dataset.aTop : b.dataset.top) || ''));
  $$('[data-b]', adaptive).forEach((m) => (m.textContent = (after ? m.dataset.a : m.dataset.b) || ''));
  count.textContent = after ? '3 changes' : 'Morning plan';
  diff.innerHTML = after
    ? html`<li><span class="tag tag-missed">Missed</span><span><strong>Draft newsletter</strong> wasn't finished by 11:10 — its priority goes up.</span></li>
        <li><span class="tag tag-moved">Moved</span><span><strong>Proposal edits</strong> 11:20 → 11:30, right after the current block.</span></li>
        <li><span class="tag tag-moved">Moved</span><span><strong>Draft newsletter</strong> rescheduled to 13:15 – 14:15.</span></li>
        <li><span class="tag tag-rolled">Tomorrow</span><span><strong>Update roadmap</strong> no longer fits today and rolls to Wednesday 09:00.</span></li>`.value
    : html`<li class="diff-empty">Your plan for the day, built at 08:55 from 6 open tasks. Switch to “After re-plan” to see what happens when the morning slips.</li>`.value;
}
$$('[data-adaptive-set]', adaptive).forEach((b) => b.addEventListener('click', () => setAdaptive(/** @type {'before' | 'after'} */ (b.dataset.adaptiveSet))));

/* ---------- Insights sample chart ---------- */
const sample = [3, 2, 4, 0, 1, 3, 5, 2, 3, 4, 2, 0, 3, 6];
const chartEl = $('[data-insights-chart]');
mount(
  chartEl,
  barChart({
    ariaLabel: 'Sample chart of completed tasks per day',
    height: 170,
    data: sample.map((v, i) => {
      const hours = Math.round((v * 55 + (i % 3) * 20) / 6) / 10;
      return { label: `${i + 11}`, value: v, value2: hours, tip: `${v} tasks · ${hours} h focus (sample)` };
    }),
  }),
);
chartEl.insertAdjacentHTML('beforeend', '<div class="legend"><span><i></i>Tasks completed</span><span><i class="alt"></i>Focus hours</span></div>');
bindChartTips(chartEl);

/* ---------- Pricing (live limits from the plan catalogue) ---------- */
(async () => {
  try {
    const res = await fetch('/api/plans');
    if (!res.ok) return;
    const { plans } = await res.json();
    for (const p of plans) {
      const card = $(`[data-plan="${p.id}"]`);
      if (!card) continue;
      $('[data-price]', card).textContent = new Intl.NumberFormat('en-IE', { style: 'currency', currency: p.currency, maximumFractionDigits: 0 }).format(p.priceCents / 100);
      $('[data-desc]', card).textContent = p.description;
      const L = p.limits;
      const items = [
        `${L.projects} active projects`,
        `${L.openTasks} open tasks`,
        `${L.aiDaily} assistant requests / day`,
        ...(p.features.ai_breakdown ? ['AI project breakdowns'] : []),
        `${L.analyticsDays} days of insights${p.features.weekly_reports ? ' + weekly reports' : ''}`,
      ];
      $('[data-limits]', card).innerHTML = items.map((t) => `<li>${esc(t)}</li>`).join('');
    }
  } catch {
    /* static fallback content stays */
  }
})();

/* ---------- Waitlist ---------- */
const wl = /** @type {HTMLFormElement} */ ($('[data-waitlist]'));
const status = $('[data-waitlist-status]');
let formToken = '';
const loadToken = async () => {
  try {
    const r = await fetch('/api/waitlist/token');
    formToken = (await r.json()).token;
  } catch {
    formToken = '';
  }
};
loadToken();
/** @param {string} msg @param {'ok' | 'error'} kind */
const say = (msg, kind) => {
  status.innerHTML = `<div class="form-alert ${kind === 'ok' ? 'is-ok' : ''}">${esc(msg)}</div>`;
};
wl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = /** @type {HTMLInputElement} */ (wl.elements.namedItem('email'));
  const privacy = /** @type {HTMLInputElement} */ (wl.elements.namedItem('acceptPrivacy'));
  const marketing = /** @type {HTMLInputElement} */ (wl.elements.namedItem('marketing'));
  const website = /** @type {HTMLInputElement} */ (wl.elements.namedItem('website'));
  email.removeAttribute('aria-invalid');
  if (!email.value || !email.checkValidity()) {
    email.setAttribute('aria-invalid', 'true');
    email.focus();
    return say('Enter a valid e-mail address.', 'error');
  }
  if (!privacy.checked) return say('Please confirm you have read the Privacy Policy.', 'error');
  const btn = /** @type {HTMLButtonElement} */ (wl.querySelector('button[type="submit"]'));
  btn.classList.add('is-loading');
  btn.disabled = true;
  try {
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.value, acceptPrivacy: true, marketing: marketing.checked, website: website.value, token: formToken, source: 'landing' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data?.error?.code === 'form_token') await loadToken();
      throw new Error(data?.error?.details?.fields?.email || data?.error?.message || 'Could not save your sign-up. Please try again.');
    }
    wl.reset();
    say(data.message, 'ok');
  } catch (err) {
    say(/** @type {Error} */ (err).message, 'error');
  } finally {
    btn.classList.remove('is-loading');
    btn.disabled = false;
  }
});
