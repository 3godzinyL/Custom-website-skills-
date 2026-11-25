import { z } from 'zod';
import { notFound } from '../lib/errors.js';
import { v } from '../lib/validate.js';
import { assertLimit } from './plans.js';
import { listTasks } from './tasks.js';

export const PROJECT_COLORS = ['violet', 'rose', 'sky', 'mint', 'amber', 'coral'];

export const projectInput = z.object({
  name: v.text(120, 1),
  description: v.text(2000).optional(),
  color: z.enum(/** @type {[string, ...string[]]} */ (PROJECT_COLORS)).optional(),
  dueDate: v.date().nullable().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
});
export const projectPatch = projectInput.partial();

const SELECT = `SELECT p.*,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') AS done_count,
    (SELECT COALESCE(SUM(estimate_minutes), 0) FROM tasks t WHERE t.project_id = p.id AND t.status != 'done') AS remaining_minutes,
    (SELECT MIN(due_date) FROM tasks t WHERE t.project_id = p.id AND t.status != 'done' AND t.due_date IS NOT NULL) AS next_due
  FROM projects p`;

/** @param {any} p */
export const serializeProject = (p) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  color: p.color,
  status: p.status,
  dueDate: p.due_date,
  taskCount: p.task_count,
  doneCount: p.done_count,
  progress: p.task_count ? Math.round((p.done_count / p.task_count) * 100) : 0,
  remainingMinutes: p.remaining_minutes,
  nextDue: p.next_due,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
});

/** @param {import('../db/index.js').Db} db @param {number} userId @param {string} [status] */
export function listProjects(db, userId, status) {
  const rows = status
    ? db.all(`${SELECT} WHERE p.user_id = ? AND p.status = ? ORDER BY p.updated_at DESC`, userId, status)
    : db.all(`${SELECT} WHERE p.user_id = ? ORDER BY p.status = 'archived', p.updated_at DESC`, userId);
  return rows.map(serializeProject);
}

/** @param {import('../db/index.js').Db} db @param {number} userId @param {number} id */
export function getProject(db, userId, id) {
  const p = db.get(`${SELECT} WHERE p.id = ? AND p.user_id = ?`, id, userId);
  if (!p) throw notFound('Project not found.');
  return serializeProject(p);
}

/** @param {import('../db/index.js').Db} db @param {number} userId @param {number} id @param {string} today user's local date */
export function projectDetail(db, userId, id, today) {
  const project = getProject(db, userId, id);
  const tasks = listTasks(db, userId, { projectId: id });
  const estimateTotal = tasks.reduce((s, t) => s + t.estimateMinutes, 0);
  const doneMinutes = tasks.filter((t) => t.status === 'done').reduce((s, t) => s + t.estimateMinutes, 0);
  const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today).length;
  return { project, tasks, summary: { estimateTotal, doneMinutes, overdue } };
}

/**
 * @param {import('../db/index.js').Db} db
 * @param {{ id: number }} user
 * @param {import('./plans.js').Plan} plan
 * @param {z.infer<typeof projectInput>} input
 */
export function createProject(db, user, plan, input) {
  assertLimit(db, user.id, plan, 'projects');
  const now = Date.now();
  const color = input.color ?? PROJECT_COLORS[db.get('SELECT COUNT(*) AS n FROM projects WHERE user_id = ?', user.id).n % PROJECT_COLORS.length];
  const { lastId } = db.run(
    `INSERT INTO projects (user_id, name, description, color, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    user.id,
    input.name,
    input.description ?? '',
    color,
    input.dueDate ?? null,
    now,
    now,
  );
  return getProject(db, user.id, lastId);
}

/**
 * @param {import('../db/index.js').Db} db
 * @param {{ id: number }} user
 * @param {import('./plans.js').Plan} plan
 * @param {number} id
 * @param {z.infer<typeof projectPatch>} patch
 */
export function updateProject(db, user, plan, id, patch) {
  const p = getProject(db, user.id, id);
  if (patch.status && patch.status !== 'archived' && p.status === 'archived') assertLimit(db, user.id, plan, 'projects');
  db.run(
    `UPDATE projects SET name = ?, description = ?, color = ?, due_date = ?, status = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
    patch.name ?? p.name,
    patch.description ?? p.description,
    patch.color ?? p.color,
    patch.dueDate !== undefined ? patch.dueDate : p.dueDate,
    patch.status ?? p.status,
    Date.now(),
    id,
    user.id,
  );
  return getProject(db, user.id, id);
}

/**
 * @param {import('../db/index.js').Db} db
 * @param {{ id: number }} user
 * @param {number} id
 * @param {boolean} deleteTasks when false, tasks are kept without a project
 */
export function deleteProject(db, user, id, deleteTasks) {
  getProject(db, user.id, id);
  db.tx(() => {
    if (deleteTasks) db.run('DELETE FROM tasks WHERE project_id = ? AND user_id = ?', id, user.id);
    db.run('DELETE FROM projects WHERE id = ? AND user_id = ?', id, user.id);
  });
  return { id };
}
