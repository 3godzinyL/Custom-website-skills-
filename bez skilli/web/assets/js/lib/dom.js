/**
 * Tiny, XSS-safe templating. Every interpolated value is HTML-escaped unless
 * it was explicitly produced by html`` or raw() (trusted, static markup only).
 */

const SAFE = Symbol('safe-html');

/** @param {unknown} v */
export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Marks a trusted string as HTML. Never pass user data to raw(). @param {string} s */
export const raw = (s) => ({ [SAFE]: true, value: String(s) });

/** @param {unknown} v @returns {string} */
function render(v) {
  if (v == null || v === false) return '';
  if (Array.isArray(v)) return v.map(render).join('');
  if (typeof v === 'object' && /** @type {any} */ (v)[SAFE]) return /** @type {any} */ (v).value;
  return esc(v);
}

/**
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return raw(out);
}

/** @param {Element} el @param {{ value: string }} content */
export function mount(el, content) {
  el.innerHTML = content.value;
  applyDyn(el);
}

/**
 * Applies dynamic geometry without inline style attributes (keeps a strict
 * CSP): data-top / data-height / data-width (px or %).
 * @param {ParentNode} root
 */
export function applyDyn(root) {
  root.querySelectorAll('[data-top],[data-height],[data-width]').forEach((node) => {
    const el = /** @type {HTMLElement} */ (node);
    if (el.dataset.top) el.style.top = el.dataset.top;
    if (el.dataset.height) {
      el.style.height = el.dataset.height;
      // Timeline blocks too short for two lines show the title only.
      if (el.classList.contains('tl-block')) el.classList.toggle('is-short', parseFloat(el.dataset.height) < 42);
    }
    if (el.dataset.width) el.style.width = el.dataset.width;
  });
}

/** @param {string} sel @param {ParentNode} [root] @returns {HTMLElement} */
export const $ = (sel, root = document) => /** @type {HTMLElement} */ (root.querySelector(sel));
/** @param {string} sel @param {ParentNode} [root] @returns {HTMLElement[]} */
export const $$ = (sel, root = document) => /** @type {HTMLElement[]} */ ([...root.querySelectorAll(sel)]);

/**
 * Delegated event listener.
 * @param {Element | Document} root
 * @param {string} type
 * @param {string} selector
 * @param {(e: Event, el: HTMLElement) => void} fn
 */
export function on(root, type, selector, fn) {
  const handler = (/** @type {Event} */ e) => {
    const target = /** @type {Element} */ (e.target);
    const el = target?.closest?.(selector);
    if (el && root.contains(el)) fn(e, /** @type {HTMLElement} */ (el));
  };
  root.addEventListener(type, handler);
  return () => root.removeEventListener(type, handler);
}

/** Reads a form into a plain object (checkboxes → boolean). @param {HTMLFormElement} form */
export function formData(form) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const el of /** @type {any[]} */ ([...form.elements])) {
    if (!el.name || el.disabled) continue;
    if (el.type === 'checkbox') out[el.name] = el.checked;
    else if (el.type === 'radio') {
      if (el.checked) out[el.name] = el.value;
    } else out[el.name] = el.value;
  }
  return out;
}
