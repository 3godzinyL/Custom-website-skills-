/**
 * Fetch wrapper: JSON in/out, CSRF header on mutations, typed errors.
 */
export class ApiError extends Error {
  /** @param {number} status @param {string} code @param {string} message @param {any} [details] */
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let csrfToken = '';
/** @param {string} t */
export const setCsrf = (t) => {
  csrfToken = t || '';
};

/** @type {((e: ApiError) => void) | null} */
let onAuthError = null;
/** @param {(e: ApiError) => void} fn */
export const onUnauthorized = (fn) => {
  onAuthError = fn;
};

/**
 * @param {string} method
 * @param {string} url
 * @param {unknown} [body]
 */
export async function request(method, url, body) {
  /** @type {Record<string, string>} */
  const headers = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['x-csrf-token'] = csrfToken;
  let res;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'network', 'Network error — check your connection and try again.');
  }
  const text = await res.text();
  /** @type {any} */
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new ApiError(res.status, data?.error?.code || 'error', data?.error?.message || `Request failed (${res.status}).`, data?.error?.details);
    if ((res.status === 401 || err.code === 'access_required') && onAuthError) onAuthError(err);
    throw err;
  }
  return data;
}

export const api = {
  /** @param {string} url */
  get: (url) => request('GET', url),
  /** @param {string} url @param {unknown} [body] */
  post: (url, body = {}) => request('POST', url, body),
  /** @param {string} url @param {unknown} body */
  patch: (url, body) => request('PATCH', url, body),
  /** @param {string} url @param {unknown} body */
  put: (url, body) => request('PUT', url, body),
  /** @param {string} url */
  del: (url) => request('DELETE', url),
};

/** @param {Record<string, unknown>} params */
export function qs(params) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}
