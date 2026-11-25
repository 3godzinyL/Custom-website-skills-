import { z } from 'zod';
import { HttpError } from './errors.js';
import { isDate, isValidTimeZone } from './time.js';

/**
 * Parses untrusted input with a zod schema and throws a 422 with per-field
 * messages on failure. Unknown keys are stripped (zod default).
 * @template {z.ZodTypeAny} S
 * @param {S} schema
 * @param {unknown} data
 * @returns {z.infer<S>}
 */
export function parse(schema, data) {
  const r = schema.safeParse(data ?? {});
  if (r.success) return r.data;
  /** @type {Record<string, string>} */
  const fields = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  throw new HttpError(422, 'validation_error', 'Please check the highlighted fields.', { fields });
}

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
/** @param {string} s */
const noControl = (s) => !CONTROL.test(s);

const COMMON_PASSWORDS = new Set([
  'password123', 'password1234', '1234567890', '12345678910', 'qwertyuiop', 'iloveyou123', 'administrator',
  'qwerty12345', 'password12', 'letmein1234', 'welcome123', 'changeme123', 'abcdefghij', '0123456789',
  'passw0rd123', 'kedgely123', 'kedgely2026', 'admin12345', 'qwerty123456', '1q2w3e4r5t', 'zaq12wsxcde',
]);

export const v = {
  email: () => z.string().trim().toLowerCase().max(254).email('Enter a valid e-mail address.'),
  password: () =>
    z
      .string()
      .min(10, 'Use at least 10 characters.')
      .max(128, 'Use at most 128 characters.')
      .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), 'This password is too common.'),
  /** @param {number} max @param {number} [min] */
  text: (max, min = 0) =>
    z.string().trim().min(min, min > 0 ? 'Required.' : undefined).max(max, `Use at most ${max} characters.`).refine(noControl, 'Contains invalid characters.'),
  name: () => z.string().trim().min(1, 'Required.').max(80).refine(noControl, 'Contains invalid characters.'),
  date: () => z.string().refine(isDate, 'Use the format YYYY-MM-DD.'),
  timezone: () => z.string().max(64).refine(isValidTimeZone, 'Unknown timezone.'),
  id: () => z.coerce.number().int().positive(),
  minuteOfDay: () => z.number().int().min(0).max(1440),
};

export const idParam = z.object({ id: v.id() });
