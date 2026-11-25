import { tooMany } from './errors.js';

/**
 * Fixed-window in-memory limiter. Suitable for a single instance; for a
 * horizontally scaled deployment swap the Map for Redis behind the same API.
 */
export class RateLimiter {
  /** @param {{ windowMs: number, max: number }} opts */
  constructor({ windowMs, max }) {
    this.windowMs = windowMs;
    this.max = max;
    /** @type {Map<string, { count: number, resetAt: number }>} */
    this.hits = new Map();
    this.timer = setInterval(() => this.sweep(), Math.min(windowMs, 60000));
    this.timer.unref();
  }

  /** @param {string} key */
  hit(key, now = Date.now()) {
    let entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.hits.set(key, entry);
    }
    entry.count += 1;
    return {
      ok: entry.count <= this.max,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      remaining: Math.max(0, this.max - entry.count),
    };
  }

  /** @param {string} key */
  reset(key) {
    this.hits.delete(key);
  }

  sweep(now = Date.now()) {
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}

/**
 * Express middleware factory.
 * @param {{ windowMs: number, max: number, key?: (req: import('express').Request) => string, message?: string, disabled?: boolean }} opts
 * @returns {import('express').RequestHandler}
 */
export function rateLimit({ windowMs, max, key, message, disabled }) {
  const limiter = new RateLimiter({ windowMs, max });
  return (req, res, next) => {
    if (disabled) return next();
    const k = key ? key(req) : req.ip || 'unknown';
    const r = limiter.hit(k);
    if (!r.ok) {
      res.setHeader('Retry-After', String(r.retryAfter));
      return next(tooMany(message, r.retryAfter));
    }
    next();
  };
}
