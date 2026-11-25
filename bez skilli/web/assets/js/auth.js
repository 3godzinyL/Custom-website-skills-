import { $, esc, formData } from './lib/dom.js';
import { api } from './lib/api.js';
import { clearErrors, setLoading, showErrors } from './lib/ui.js';

const pageId = document.body.dataset.page;

/** Only allow same-site in-app redirects after sign-in (no open redirects). */
function safeNext(fallback) {
  const next = new URLSearchParams(location.search).get('next') || '';
  return /^\/app(\/[\w\-/?=&%.]*)?$/.test(next) ? next : fallback;
}

/** Rough strength meter (length + variety); the server enforces the rules. @param {string} pw */
function score(pw) {
  if (!pw) return 0;
  let s = pw.length >= 10 ? 1 : 0;
  if (pw.length >= 14) s++;
  if (/[a-z]/.test(pw) && /[A-Z0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 20) s++;
  return Math.max(1, Math.min(4, s));
}
const pw = /** @type {HTMLInputElement | null} */ (document.querySelector('input[name="password"][autocomplete="new-password"]'));
const meter = $('[data-pw-meter]');
if (pw && meter) pw.addEventListener('input', () => (meter.dataset.score = String(score(pw.value))));

/**
 * @param {string} name
 * @param {(data: Record<string, any>, form: HTMLFormElement) => Promise<void>} handler
 */
function bind(name, handler) {
  const form = /** @type {HTMLFormElement | null} */ (document.querySelector(`[data-form="${name}"]`));
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(form);
    const btn = /** @type {HTMLButtonElement} */ (form.querySelector('button[type="submit"]'));
    setLoading(btn, true);
    try {
      await handler(formData(form), form);
    } catch (err) {
      showErrors(form, err);
    } finally {
      setLoading(btn, false);
    }
  });
}

/** @param {HTMLFormElement} form @param {string} message @param {'ok' | 'info'} [kind] */
function success(form, message, kind = 'ok') {
  form.insertAdjacentHTML('beforebegin', `<div class="form-alert is-${kind}" role="status">${message}</div>`);
  form.remove();
}

bind('login', async (d) => {
  await api.post('/api/auth/login', { email: d.email, password: d.password });
  location.assign(safeNext('/app'));
});

bind('signup', async (d, form) => {
  if (!d.acceptTerms) {
    showErrors(form, { code: 'validation_error', details: { fields: { acceptTerms: 'Please accept the Terms and Privacy Policy.' } } });
    return;
  }
  await api.post('/api/auth/signup', {
    name: d.name,
    email: d.email,
    password: d.password,
    inviteCode: d.inviteCode || undefined,
    acceptTerms: true,
    marketing: !!d.marketing,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });
  location.assign('/app');
});

bind('forgot', async (d, form) => {
  const r = await api.post('/api/auth/forgot', { email: d.email });
  success(form, esc(r.message));
});

bind('reset', async (d, form) => {
  if (d.password !== d.confirm) {
    showErrors(form, { code: 'validation_error', details: { fields: { confirm: 'Passwords do not match.' } } });
    return;
  }
  const token = new URLSearchParams(location.search).get('token') || '';
  await api.post('/api/auth/reset', { token, password: d.password });
  success(form, 'Your password has been changed and all sessions were signed out. <a href="/login">Log in with your new password</a>.');
});

bind('admin-login', async (d) => {
  await api.post('/api/admin/auth/login', { email: d.email, password: d.password });
  location.assign('/admin');
});

if (pageId === 'waitlist-confirm') {
  const card = $('[data-confirm]');
  const token = new URLSearchParams(location.search).get('token') || '';
  const show = (/** @type {string} */ title, /** @type {string} */ text) => {
    card.innerHTML = `<h1>${esc(title)}</h1><p class="sub">${text}</p><a class="btn btn-primary" href="/">Back to Kedgely</a>`;
  };
  (async () => {
    try {
      const r = token ? await api.post('/api/waitlist/confirm', { token }) : { ok: false };
      if (r.ok) show("You're confirmed", 'Thanks! Your place on the early-access list is saved. We will e-mail you a personal invite code when your batch opens.');
      else show('Link not valid', 'This confirmation link is invalid or was already used. If you signed up recently, your address may already be confirmed.');
    } catch (err) {
      show('Something went wrong', esc(/** @type {Error} */ (err).message));
    }
  })();
}

if (pageId === 'reset' && !new URLSearchParams(location.search).get('token')) {
  const form = /** @type {HTMLFormElement | null} */ (document.querySelector('[data-form="reset"]'));
  if (form) success(form, 'This page needs the link from your reset e-mail. <a href="/forgot-password">Request a new link</a>.', 'info');
}
