import { api, setCsrf } from '../lib/api.js';

/**
 * Session store: profile, access, plan limits, usage and CSRF token, as
 * returned by the server. The UI reads from here; the server stays the
 * authority for every permission check.
 */
export const store = {
  /** @type {any} */
  session: null,
};

export async function loadSession() {
  const s = await api.get('/api/auth/session');
  store.session = s;
  setCsrf(s.csrfToken);
  return s;
}

/** Refreshes usage/limits after mutations (silently ignores failures). */
export async function refreshSession() {
  try {
    const s = await api.get('/api/access');
    store.session = s;
    setCsrf(s.csrfToken);
    document.dispatchEvent(new CustomEvent('kedgely:session'));
  } catch {
    /* handled by the global 401 handler */
  }
}

/** Broadcast that tasks/schedule changed so visible widgets can reload. */
export const dataChanged = () => document.dispatchEvent(new CustomEvent('kedgely:data'));
