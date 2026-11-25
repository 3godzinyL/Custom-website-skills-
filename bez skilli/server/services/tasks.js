import { z } from 'zod';
import { badRequest, notFound } from '../lib/errors.js';
import { v } from '../lib/validate.js';
import { assertLimit } from './plans.js';

export const PRIORITIES = { 1: 'urgent', 2: 'high', 3: 'medium', 4: 'low' };

export const taskInput = z.object({
  title: v.text(200, 1),
  notes: v.text(4000).optional(),
  projectId: v.id().nullable().optional(),
  priority: z.coerce.number().int().min(1).max(4).optional(),
  dueDate: v.date().nullable().optional(),
  estimateMinutes: z.coerce.number().int().min(5).max(1440).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
});
export const taskPatch = taskInput.partial();

/**
 * @param {import('../db/index.js').Db} db
 * @param {{ userId: number, taskId?: number | null, title: string, type: string, details?: object }} e
 */
export function taskEvent(db, e) {
  db.run(
    'INSERT INTO task_events (user_id, task_id, task_title, type, details, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    e.userId,
    e.taskId ?? null,
    e.title,
    e.type,
    JSON.stringify(e.details ?? {}),
    Date.now(),
  );
}

/** Verifies that a project belongs to the user (prevents cross-account linking). */
function assertOwnProject(db, userId, projectId) {
  if (projectId == null) return;
  if (!db.get('SELECT 1 FROM projects WHERE id = ? AND user_id = ?', projectId, userId)) throw badRequest('Unknown project.');
}

/** @param {any} t */
export const serializeTask = (t) => ({
  id: t.id,
  title: t.title,
  notes: t.notes,
  projectId: t.project_id,
  projectName: t.project_name ?? null,
  projectColor: t.project_color ?? null,
  status: t.status,
  priority: t.priority,
  dueDate: t.due_date,
  estimateMinutes: t.estimate_minutes,
  missedCount: t.missed_count,
  source: t.source,
  completedAt: t.completed_at,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
});

const SELECT = `SELECT t.*, p.name AS project_name, p.color AS project_color FROM tasks t LEFT JOIN projects p ON p.id = t.project_id`;

/** @param {import('../db/index.js').Db} db @param {number} userId @param {number} id */
export function getTask(db, userId, id) {
  const t = db.get(`${SELECT} WHERE t.id = ? AND t.user_id = ?`, id, userId);
  if (!t) throw notFound('Task not found.');
  return t;
}

/**
 * @param {import('../db/index.js').Db} db
 * @param {number} userId
 * @param {{ status?: string, projectId?: number, q?: string, due?: string }} f
 */
export function listTasks(db, userId, f = {}) {
  const where = ['t.user_id = ?'];
  const params = [userId];
  if (f.status === 'open') where.push(`t.status != 'done'`);
  else if (f.status) {
    where.push('t.status = ?');
    params.push(f.status);
  }
  if (f.projectId) {
    where.push('t.project_id = ?');
    params.push(f.projectId);
  }
  if (f.q) {
    where.push('t.title LIKE ?');
    params.push(`%${f.q.replace(/[%_]/g, '')}%`);
  }
  if (f.due === 'overdue_or_today' && f.today) {
    where.push('t.due_date IS NOT NULL AND t.due_date <= ?');
    params.push(f.today);
  }
  const order = f.status === 'done' ? 't.completed_at DESC' : `t.status = 'done', t.due_date IS NULL, t.due_date, t.priority, t.id`;
  return db.all(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 1000`, ...params).map(serializeTask);
}

/**
 * @param {import('../db/index.js').Db} db
 * @param {{ id: number }} user
 * @param {import('./plans.js').Plan} plan
 * @param {z.infer<typeof taskInput>} input
 * @param {'manual' | 'ai'} [source]
 */
export function createTask(db, user, plan, input, source = 'manual') {
  assertLimit(db, user.id, plan, 'tasks');
  assertOwnProject(db, user.id, input.projectId);
  const now = Date.now();
  const { lastId } = db.run(
    `INSERT INTO tasks (user_id, project_id, title, notes, priority, due_date, estimate_minutes, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    user.id,
    input.projectId ?? null,
    input.title,
    input.notes ?? '',
    input.priority ?? 3,
    input.dueDate ?? null,
    input.estimateMinutes ?? 30,
    source,
    now,
    now,
  );
  taskEvent(db, { userId: user.id, taskId: lastId, title: input.title, type: 'created', details: { source } });
  return serializeTask(getTask(db, user.id, lastId));
}

/**
 * @param {import('../db/index.js').Db} db
 * @param {{ id: number }} user
 * @param {import('./plans.js').Plan} plan
 * @param {number} id
 * @param {z.infer<typeof taskPatch>} patch
 */
export function updateTask(db, user, plan, id, patch) {
  const t = getTask(db, user.id, id);
  if (patch.projectId !== undefined) assertOwnProject(db, user.id, patch.projectId);
  if (patch.status && patch.status !== 'done' && t.status === 'done') assertLimit(db, user.id, plan, 'tasks');
  const next = {
    title: patch.title ?? t.title,
    notes: patch.notes ?? t.notes,
    project_id: patch.projectId !== undefined ? patch.projectId : t.project_id,
    priority: patch.priority ?? t.priority,
    due_date: patch.dueDate !== undefined ? patch.dueDate : t.due_date,
    estimate_minutes: patch.estimateMinutes ?? t.estimate_minutes,
    status: patch.status ?? t.status,
  };
  const now = Date.now();
  const completedAt = next.status === 'done' ? (t.completed_at ?? now) : null;
  db.run(
    `UPDATE tasks SET title = ?, notes = ?, project_id = ?, priority = ?, due_date = ?, estimate_minutes = ?, status = ?, completed_at = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    next.title,
    next.notes,
    next.project_id,
    next.priority,
    next.due_date,
    next.estimate_minutes,
    next.status,
    completedAt,
    now,
    id,
    user.id,
  );
  if (next.status === 'done' && t.status !== 'done') onCompleted(db, user.id, id, next.title);
  else if (next.status !== 'done' && t.status === 'done') taskEvent(db, { userId: user.id, taskId: id, title: next.title, type: 'reopened' });
  else if (t.due_date !== next.due_date) taskEvent(db, { userId: user.id, taskId: id, title: next.title, type: 'rescheduled', details: { from: t.due_date, to: next.due_date } });
  else taskEvent(db, { userId: user.id, taskId: id, title: next.title, type: 'updated' });
  return serializeTask(getTask(db, user.id, id));
}

function onCompleted(db, userId, taskId, title) {
  taskEvent(db, { userId, taskId, title, type: 'completed' });
  // Remaining planned blocks of a finished task are no longer needed.
  db.run(`DELETE FROM schedule_blocks WHERE user_id = ? AND task_id = ? AND status = 'planned' AND locked = 0`, userId, taskId);
}

/** @param {import('../db/index.js').Db} db @param {{ id: number }} user @param {import('./plans.js').Plan} plan @param {number} id */
export const completeTask = (db, user, plan, id) => updateTask(db, user, plan, id, { status: 'done' });

/** @param {import('../db/index.js').Db} db @param {{ id: number }} user @param {number} id */
export function deleteTask(db, user, id) {
  const t = getTask(db, user.id, id);
  db.run('DELETE FROM tasks WHERE id = ? AND user_id = ?', id, user.id);
  taskEvent(db, { userId: user.id, taskId: null, title: t.title, type: 'deleted' });
  return { id };
}

/** @param {import('../db/index.js').Db} db @param {number} userId */
export const taskHistory = (db, userId, limit = 100) =>
  db
    .all('SELECT id, task_id, task_title, type, details, created_at FROM task_events WHERE user_id = ? ORDER BY id DESC LIMIT ?', userId, limit)
    .map((r) => ({ ...r, details: JSON.parse(r.details) }));
