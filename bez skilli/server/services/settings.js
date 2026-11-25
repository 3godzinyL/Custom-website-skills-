import { z } from 'zod';

/** Runtime settings an administrator can change without a redeploy. */
export const SETTINGS_SCHEMA = z.object({
  registrationOpen: z.boolean(),
  autoGrant: z.object({
    enabled: z.boolean(),
    planId: z.enum(['free', 'pro', 'team']),
    days: z.number().int().min(1).max(365),
  }),
  waitlistRetentionDays: z.number().int().min(30).max(730),
  maintenanceBanner: z.string().trim().max(200),
});

/** @type {z.infer<typeof SETTINGS_SCHEMA>} */
export const DEFAULT_SETTINGS = {
  registrationOpen: true,
  autoGrant: { enabled: false, planId: 'free', days: 14 },
  waitlistRetentionDays: 365,
  maintenanceBanner: '',
};

/** @param {import('../db/index.js').Db} db @returns {z.infer<typeof SETTINGS_SCHEMA>} */
export function getSettings(db) {
  const row = db.get(`SELECT value FROM app_settings WHERE key = 'app'`);
  if (!row) return structuredClone(DEFAULT_SETTINGS);
  const parsed = SETTINGS_SCHEMA.safeParse({ ...DEFAULT_SETTINGS, ...JSON.parse(row.value) });
  return parsed.success ? parsed.data : structuredClone(DEFAULT_SETTINGS);
}

/**
 * @param {import('../db/index.js').Db} db
 * @param {z.infer<typeof SETTINGS_SCHEMA>} value
 * @param {number | null} actorId
 */
export function saveSettings(db, value, actorId) {
  db.run(
    `INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES ('app', ?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    JSON.stringify(value),
    Date.now(),
    actorId,
  );
}
