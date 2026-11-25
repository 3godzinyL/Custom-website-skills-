import { limitReached, notFound } from '../lib/errors.js';

/**
 * Plans are the single source of truth for limits and feature flags.
 * A future billing integration (Stripe etc.) only has to create access
 * grants with the purchased plan; nothing else depends on payment state.
 */

/** @typedef {{ id: string, name: string, description: string, price_cents: number, currency: string, billing_interval: string,
 *   max_projects: number, max_open_tasks: number, ai_daily_limit: number, analytics_days: number,
 *   features: Record<string, boolean>, is_active: number, sort_order: number, billing_price_id: string | null }} Plan */

/** @param {any} row @returns {Plan} */
export const hydratePlan = (row) => ({ ...row, features: JSON.parse(row.features || '{}') });

/** @param {import('../db/index.js').Db} db */
export const listPlans = (db) => db.all('SELECT * FROM plans ORDER BY sort_order').map(hydratePlan);

/** @param {import('../db/index.js').Db} db @param {string} id */
export function getPlan(db, id) {
  const row = db.get('SELECT * FROM plans WHERE id = ?', id);
  if (!row) throw notFound('Plan not found.');
  return hydratePlan(row);
}

/**
 * @param {import('../db/index.js').Db} db
 * @param {string} id
 * @param {Partial<Pick<Plan, 'name'|'description'|'price_cents'|'max_projects'|'max_open_tasks'|'ai_daily_limit'|'analytics_days'|'features'|'billing_price_id'>> & { is_active?: boolean }} patch
 */
export function updatePlan(db, id, patch) {
  const current = getPlan(db, id);
  const next = { ...current, ...patch, features: { ...current.features, ...(patch.features || {}) } };
  db.run(
    `UPDATE plans SET name = ?, description = ?, price_cents = ?, max_projects = ?, max_open_tasks = ?, ai_daily_limit = ?,
       analytics_days = ?, features = ?, is_active = ?, billing_price_id = ?, updated_at = ? WHERE id = ?`,
    next.name,
    next.description,
    next.price_cents,
    next.max_projects,
    next.max_open_tasks,
    next.ai_daily_limit,
    next.analytics_days,
    JSON.stringify(next.features),
    next.is_active ? 1 : 0,
    next.billing_price_id ?? null,
    Date.now(),
    id,
  );
  return { before: current, after: getPlan(db, id) };
}

/**
 * Enforces numeric plan limits on the server. Throws 402 plan_limit.
 * @param {import('../db/index.js').Db} db
 * @param {number} userId
 * @param {Plan} plan
 * @param {'projects' | 'tasks'} kind
 * @param {number} [adding]
 */
export function assertLimit(db, userId, plan, kind, adding = 1) {
  if (kind === 'projects') {
    const n = db.get(`SELECT COUNT(*) AS n FROM projects WHERE user_id = ? AND status != 'archived'`, userId).n;
    if (n + adding > plan.max_projects) {
      throw limitReached(`Your ${plan.name} plan allows ${plan.max_projects} active projects.`, { limit: plan.max_projects, kind });
    }
  } else {
    const n = db.get(`SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND status != 'done'`, userId).n;
    if (n + adding > plan.max_open_tasks) {
      throw limitReached(`Your ${plan.name} plan allows ${plan.max_open_tasks} open tasks.`, { limit: plan.max_open_tasks, kind });
    }
  }
}

/**
 * @param {Plan} plan
 * @param {string} feature
 */
export function assertFeature(plan, feature) {
  if (!plan.features?.[feature]) {
    throw limitReached(`This feature is not included in the ${plan.name} plan.`, { feature });
  }
}
