import { z } from 'zod';
import { v } from '../../lib/validate.js';
import { fmtMinutes } from '../../lib/time.js';
import { createProject } from '../projects.js';
import { completeTask, createTask, deleteTask, updateTask } from '../tasks.js';
import { planDayFor, replanToday } from '../scheduler/schedule.js';

/**
 * The complete whitelist of operations the assistant may propose. Anything
 * else coming back from a model is dropped. Every action is re-validated and
 * executed through the same services (ownership + plan limits) as the REST API.
 */
const priority = z.coerce.number().int().min(1).max(4);
const estimate = z.coerce.number().int().min(5).max(600);

export const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('create_project'),
    ref: z.string().max(20).optional(),
    name: v.text(120, 1),
    description: v.text(500).optional(),
    dueDate: v.date().nullable().optional(),
  }),
  z.object({
    type: z.literal('create_task'),
    title: v.text(200, 1),
    notes: v.text(1000).optional(),
    projectId: v.id().nullable().optional(),
    projectRef: z.string().max(20).optional(),
    priority: priority.default(3),
    dueDate: v.date().nullable().optional(),
    estimateMinutes: estimate.default(30),
  }),
  z.object({
    type: z.literal('update_task'),
    taskId: v.id(),
    title: v.text(200, 1).optional(),
    priority: priority.optional(),
    dueDate: v.date().nullable().optional(),
    estimateMinutes: estimate.optional(),
    projectId: v.id().nullable().optional(),
  }),
  z.object({ type: z.literal('complete_task'), taskId: v.id() }),
  z.object({ type: z.literal('delete_task'), taskId: v.id() }),
  z.object({ type: z.literal('plan_day'), date: v.date() }),
  z.object({ type: z.literal('replan_today') }),
]);

/** @typedef {z.infer<typeof actionSchema>} AiAction */

export const MAX_ACTIONS = 25;

/**
 * Validates raw model output against the schema and the user's own data.
 * @param {unknown[]} raw
 * @param {{ taskIds: Set<number>, projectIds: Set<number>, today: string }} scope
 */
export function sanitizeActions(raw, scope) {
  /** @type {AiAction[]} */
  const actions = [];
  const rejected = [];
  const refs = new Set();
  for (const item of (Array.isArray(raw) ? raw : []).slice(0, MAX_ACTIONS)) {
    const r = actionSchema.safeParse(item);
    if (!r.success) {
      rejected.push({ item, reason: 'invalid' });
      continue;
    }
    const a = r.data;
    if ('taskId' in a && !scope.taskIds.has(a.taskId)) {
      rejected.push({ item, reason: 'unknown task' });
      continue;
    }
    if ('projectId' in a && a.projectId != null && !scope.projectIds.has(a.projectId)) {
      rejected.push({ item, reason: 'unknown project' });
      continue;
    }
    if (a.type === 'create_project' && a.ref) refs.add(a.ref);
    if (a.type === 'create_task' && a.projectRef && !refs.has(a.projectRef)) delete a.projectRef;
    if ((a.type === 'plan_day') && a.date < scope.today) {
      rejected.push({ item, reason: 'date in the past' });
      continue;
    }
    if ('dueDate' in a && a.dueDate && a.dueDate < scope.today) a.dueDate = scope.today;
    actions.push(a);
  }
  // Scheduling runs last so that it sees newly created tasks.
  actions.sort((x, y) => Number(isPlanning(x)) - Number(isPlanning(y)));
  return { actions, rejected };
}

/** @param {AiAction} a */
const isPlanning = (a) => a.type === 'plan_day' || a.type === 'replan_today';

const P = { 1: 'urgent', 2: 'high', 3: 'medium', 4: 'low' };

/**
 * One-line description of an action for the confirmation UI.
 * @param {AiAction} a
 * @param {Map<number, string>} taskTitles
 */
export function describeAction(a, taskTitles) {
  const t = (/** @type {number} */ id) => `“${taskTitles.get(id) ?? `#${id}`}”`;
  switch (a.type) {
    case 'create_project':
      return `Create project “${a.name}”${a.dueDate ? ` · due ${a.dueDate}` : ''}`;
    case 'create_task':
      return `Add task “${a.title}” · ${P[/** @type {1|2|3|4} */ (a.priority)]} · ~${fmtDuration(a.estimateMinutes)}${a.dueDate ? ` · due ${a.dueDate}` : ''}`;
    case 'update_task': {
      const parts = [];
      if (a.title) parts.push(`rename to “${a.title}”`);
      if (a.priority) parts.push(`priority ${P[/** @type {1|2|3|4} */ (a.priority)]}`);
      if (a.dueDate !== undefined) parts.push(a.dueDate ? `due ${a.dueDate}` : 'no due date');
      if (a.estimateMinutes) parts.push(`~${fmtDuration(a.estimateMinutes)}`);
      return `Update ${t(a.taskId)}: ${parts.join(', ') || 'no changes'}`;
    }
    case 'complete_task':
      return `Mark ${t(a.taskId)} as done`;
    case 'delete_task':
      return `Delete ${t(a.taskId)}`;
    case 'plan_day':
      return `Build the schedule for ${a.date}`;
    case 'replan_today':
      return 'Re-plan the rest of today';
  }
}

/** @param {number} m */
export const fmtDuration = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);

/**
 * Executes accepted actions for the signed-in user. Each action runs in its
 * own savepoint so one failure (e.g. a plan limit) doesn't undo the others.
 * @param {import('../../db/index.js').Db} db
 * @param {any} user
 * @param {import('../plans.js').Plan} plan
 * @param {AiAction[]} actions
 */
export function applyActions(db, user, plan, actions) {
  /** @type {Map<string, number>} */
  const refs = new Map();
  /** @type {{ type: string, ok: boolean, message: string, id?: number }[]} */
  const results = [];
  for (const a of actions) {
    try {
      const r = db.tx(() => runAction(db, user, plan, a, refs));
      results.push({ type: a.type, ok: true, ...r });
    } catch (err) {
      results.push({ type: a.type, ok: false, message: /** @type {Error} */ (err).message || 'Failed.' });
    }
  }
  return results;
}

/**
 * @param {import('../../db/index.js').Db} db
 * @param {any} user
 * @param {import('../plans.js').Plan} plan
 * @param {AiAction} a
 * @param {Map<string, number>} refs
 * @returns {{ message: string, id?: number }}
 */
function runAction(db, user, plan, a, refs) {
  switch (a.type) {
    case 'create_project': {
      const p = createProject(db, user, plan, { name: a.name, description: a.description, dueDate: a.dueDate ?? null });
      if (a.ref) refs.set(a.ref, p.id);
      return { message: `Created project “${p.name}”.`, id: p.id };
    }
    case 'create_task': {
      const projectId = a.projectRef ? (refs.get(a.projectRef) ?? null) : (a.projectId ?? null);
      const t = createTask(
        db,
        user,
        plan,
        { title: a.title, notes: a.notes, projectId, priority: a.priority, dueDate: a.dueDate ?? null, estimateMinutes: a.estimateMinutes },
        'ai',
      );
      return { message: `Added “${t.title}”.`, id: t.id };
    }
    case 'update_task': {
      const { type: _type, taskId, ...patch } = a;
      const t = updateTask(db, user, plan, taskId, patch);
      return { message: `Updated “${t.title}”.`, id: t.id };
    }
    case 'complete_task': {
      const t = completeTask(db, user, plan, a.taskId);
      return { message: `Completed “${t.title}”.`, id: t.id };
    }
    case 'delete_task': {
      deleteTask(db, user, a.taskId);
      return { message: 'Deleted the task.', id: a.taskId };
    }
    case 'plan_day': {
      const r = planDayFor(db, user, a.date);
      const n = r.day.blocks.filter((b) => b.kind === 'task' && b.status === 'planned').length;
      return { message: `Planned ${n} focus block${n === 1 ? '' : 's'} on ${a.date}${r.overflow.length ? `; ${r.overflow.length} task(s) didn't fit` : ''}.` };
    }
    case 'replan_today': {
      const r = replanToday(db, user);
      const first = r.day.blocks.find((b) => b.kind === 'task' && b.status === 'planned');
      return {
        message: `Re-planned today${r.missed.length ? ` (${r.missed.length} missed block${r.missed.length === 1 ? '' : 's'} rescheduled)` : ''}${first ? `; next up at ${fmtMinutes(first.start)}: ${first.title}` : ''}${r.next?.carried.length ? `; ${r.next.carried.length} moved to ${r.next.date}` : ''}.`,
      };
    }
  }
}
