import { $, $$, esc, html, mount } from './dom.js';
import { icon } from './icons.js';

/* ---------- Toasts ---------- */
let toastRoot = /** @type {HTMLElement | null} */ (null);
/**
 * @param {string} message
 * @param {'ok' | 'error' | 'info'} [kind]
 */
export function toast(message, kind = 'ok') {
  if (!toastRoot) {
    toastRoot = document.createElement('div');
    toastRoot.className = 'toasts';
    toastRoot.setAttribute('role', 'status');
    toastRoot.setAttribute('aria-live', 'polite');
    document.body.append(toastRoot);
  }
  const el = document.createElement('div');
  el.className = `toast is-${kind}`;
  el.innerHTML = html`${icon(kind === 'error' ? 'alert' : kind === 'info' ? 'info' : 'check', 'toast-icon')}<div>${message}</div>`.value;
  toastRoot.append(el);
  const remove = () => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 220);
  };
  setTimeout(remove, kind === 'error' ? 6000 : 3800);
  el.addEventListener('click', remove);
}

/* ---------- Modal ---------- */
/**
 * Opens an accessible modal dialog (focus trap, Esc to close, restores focus).
 * @param {{ title: string, subtitle?: string, body: { value: string }, size?: 'lg', onOpen?: (el: HTMLElement, close: () => void) => void, onClose?: () => void }} o
 */
export function openModal(o) {
  const previous = /** @type {HTMLElement | null} */ (document.activeElement);
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const id = `m${Math.random().toString(36).slice(2, 8)}`;
  mount(
    backdrop,
    html`<div class="modal ${o.size === 'lg' ? 'modal-lg' : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <div class="modal-head">
        <div><h2 id="${id}">${o.title}</h2>${o.subtitle ? html`<p>${o.subtitle}</p>` : ''}</div>
        <button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Close">${icon('x')}</button>
      </div>
      <div class="modal-body">${o.body}</div>
    </div>`,
  );
  document.body.append(backdrop);
  document.body.style.overflow = 'hidden';
  const modal = /** @type {HTMLElement} */ (backdrop.firstElementChild);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    o.onClose?.();
    document.removeEventListener('keydown', onKey, true);
    backdrop.classList.add('is-closing');
    setTimeout(() => {
      backdrop.remove();
      if (!document.querySelector('.modal-backdrop')) document.body.style.overflow = '';
      previous?.focus?.();
    }, 180);
  };
  const focusables = () => $$('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', modal);
  const onKey = (/** @type {KeyboardEvent} */ e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
    if (e.key === 'Tab') {
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', onKey, true);
  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close();
  });
  $$('[data-close]', modal).forEach((b) => b.addEventListener('click', close));
  o.onOpen?.(modal, close);
  const auto = /** @type {HTMLElement | null} */ (modal.querySelector('[autofocus]')) || focusables()[1] || focusables()[0];
  setTimeout(() => auto?.focus(), 30);
  return { el: modal, close };
}

/**
 * @param {{ title: string, message: string, confirm?: string, danger?: boolean, input?: { label: string, placeholder?: string, required?: string } }} o
 * @returns {Promise<false | string>} false if cancelled, else the input value ('' without input)
 */
export function confirmDialog(o) {
  return new Promise((resolve) => {
    let settled = false;
    openModal({
      title: o.title,
      body: html`<p class="dim">${o.message}</p>
        ${o.input
          ? html`<div class="field confirm-field"><label class="label" for="cd-input">${o.input.label}</label><input class="input" id="cd-input" autocomplete="off" placeholder="${o.input.placeholder || ''}" /></div>`
          : ''}
        <div class="form-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn ${o.danger ? 'btn-danger' : 'btn-primary'}" data-ok autofocus>${o.confirm || 'Confirm'}</button></div>`,
      onClose: () => {
        if (!settled) resolve(false);
        settled = true;
      },
      onOpen: (el, closeFn) => {
        const input = /** @type {HTMLInputElement | null} */ (el.querySelector('#cd-input'));
        const ok = /** @type {HTMLButtonElement} */ (el.querySelector('[data-ok]'));
        const sync = () => {
          if (input && o.input?.required) ok.disabled = input.value.trim() !== o.input.required;
        };
        input?.addEventListener('input', sync);
        sync();
        ok.addEventListener('click', () => {
          settled = true;
          resolve(input ? input.value.trim() : '');
          closeFn();
        });
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && input && document.activeElement === input && !ok.disabled) ok.click();
        });
      },
    });
  });
}

/* ---------- Dropdown menu ---------- */
/**
 * @param {HTMLElement} anchor
 * @param {{ label: string, icon?: Parameters<typeof icon>[0], danger?: boolean, action: () => void }[]} items
 */
export function openMenu(anchor, items) {
  document.querySelectorAll('.menu').forEach((m) => m.remove());
  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.setAttribute('role', 'menu');
  mount(menu, html`${items.map((it, i) => html`<button role="menuitem" data-i="${i}" class="${it.danger ? 'is-danger' : ''}">${it.icon ? icon(it.icon) : ''}${it.label}</button>`)}`);
  document.body.append(menu);
  const r = anchor.getBoundingClientRect();
  const w = menu.offsetWidth;
  const h = menu.offsetHeight;
  menu.style.left = `${Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8))}px`;
  menu.style.top = `${r.bottom + h + 8 > window.innerHeight ? r.top - h - 6 : r.bottom + 6}px`;
  const close = () => {
    menu.remove();
    document.removeEventListener('mousedown', outside, true);
    document.removeEventListener('keydown', key, true);
  };
  const outside = (/** @type {MouseEvent} */ e) => {
    if (!menu.contains(/** @type {Node} */ (e.target))) close();
  };
  const key = (/** @type {KeyboardEvent} */ e) => {
    const btns = $$('button', menu);
    const i = btns.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    if (e.key === 'Escape') {
      close();
      anchor.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      btns[(i + 1) % btns.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      btns[(i - 1 + btns.length) % btns.length].focus();
    }
  };
  setTimeout(() => {
    document.addEventListener('mousedown', outside, true);
    document.addEventListener('keydown', key, true);
  });
  menu.addEventListener('click', (e) => {
    const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('button[data-i]'));
    if (!b) return;
    close();
    items[Number(b.dataset.i)].action();
  });
  /** @type {HTMLElement} */ (menu.querySelector('button'))?.focus();
}

/* ---------- Forms ---------- */
/** @param {HTMLButtonElement | null} btn @param {boolean} loading */
export function setLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle('is-loading', loading);
  btn.disabled = loading;
  btn.setAttribute('aria-busy', String(loading));
}

/** Clears previous field errors in a form. @param {HTMLFormElement} form */
export function clearErrors(form) {
  $$('.field-error', form).forEach((e) => e.remove());
  $$('[aria-invalid]', form).forEach((e) => e.removeAttribute('aria-invalid'));
  const alert = form.querySelector('.form-alert[data-auto]');
  alert?.remove();
}

/**
 * Shows server validation errors next to fields, or a form-level alert.
 * @param {HTMLFormElement} form
 * @param {any} err ApiError
 */
export function showErrors(form, err) {
  clearErrors(form);
  const fields = err?.details?.fields || {};
  let placed = 0;
  for (const [name, msg] of Object.entries(fields)) {
    const input = /** @type {HTMLElement | null} */ (form.querySelector(`[name="${CSS.escape(name)}"]`));
    if (!input) continue;
    input.setAttribute('aria-invalid', 'true');
    const p = document.createElement('div');
    p.className = 'field-error';
    p.textContent = String(msg);
    (input.closest('.field') || input.parentElement)?.append(p);
    if (!placed) input.focus();
    placed++;
  }
  if (!placed || err?.code !== 'validation_error') {
    const a = document.createElement('div');
    a.className = 'form-alert';
    a.dataset.auto = '1';
    a.setAttribute('role', 'alert');
    a.innerHTML = `${icon('alert').value}<div>${esc(err?.message || 'Something went wrong.')}</div>`;
    form.prepend(a);
  }
}

/** @param {string} text */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
  } catch {
    toast('Copy failed — select the text and copy it manually.', 'error');
  }
}

/** @param {Element} el @param {string} [label] */
export function loadingSkeleton(el, label = 'Loading') {
  el.innerHTML = `<div class="card-body" aria-busy="true" aria-label="${esc(label)}"><div class="skeleton skeleton-line" data-width="60%"></div><div class="skeleton skeleton-line" data-width="85%"></div><div class="skeleton skeleton-line" data-width="40%"></div></div>`;
  el.querySelectorAll('[data-width]').forEach((n) => {
    /** @type {HTMLElement} */ (n).style.width = /** @type {HTMLElement} */ (n).dataset.width || '';
  });
}
