const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
const REDACT = /(password|token|secret|authorization|cookie|api[-_]?key)/i;

/** @param {unknown} value @param {number} depth @returns {unknown} */
function redact(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 4) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = REDACT.test(k) ? '[redacted]' : redact(v, depth + 1);
  return out;
}

/**
 * Structured JSON logger with secret redaction.
 * @param {string} level
 */
export function createLogger(level = 'info') {
  const min = LEVELS[/** @type {keyof typeof LEVELS} */ (level)] ?? LEVELS.info;
  /** @param {keyof typeof LEVELS} lvl @param {string} msg @param {object} [data] */
  const write = (lvl, msg, data) => {
    if (LEVELS[lvl] < min) return;
    const extra = data ? /** @type {object} */ (redact(data)) : {};
    const line = JSON.stringify({ t: new Date().toISOString(), level: lvl, msg, ...extra });
    (lvl === 'error' || lvl === 'warn' ? process.stderr : process.stdout).write(line + '\n');
  };
  return {
    /** @param {string} msg @param {object} [data] */
    debug: (msg, data) => write('debug', msg, data),
    /** @param {string} msg @param {object} [data] */
    info: (msg, data) => write('info', msg, data),
    /** @param {string} msg @param {object} [data] */
    warn: (msg, data) => write('warn', msg, data),
    /** @param {string} msg @param {object} [data] */
    error: (msg, data) => write('error', msg, data),
  };
}
/** @typedef {ReturnType<typeof createLogger>} Logger */
