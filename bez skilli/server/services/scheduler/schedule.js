import { z } from 'zod';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { addDays, zonedParts } from '../../lib/time.js';
import { v } from '../../lib/validate.js';
import { taskEvent } from '../tasks.js';
import { assessDeadlines, diffPlans, findOverlaps, isWorkDay, planDay, scoreTask } from './engine.js';

/** @param {any} user @returns {import('./engine.js').WorkSettings} */
export const workSettings = (user) => ({
  workStart: user.work_start,
  workEnd: user.work_end,
  workDays: user.work_days,
  lunchStart: user.lunch_start,
  lunchMinutes: user.lunch_minutes,
  bufferMinutes: user.buffer_minutes,
  maxBlockMinutes: user.max_block_minutes,
});

/** @param {any} user */
export const localNow = (user, nowMs = Date.now()) => zonedParts(nowMs, user.timezone);

export const blockInput = z.object({
  date: v.date(),
  start: v.minuteOfDay(),
  end: v.minuteOfDay(),
  kind: z.enum(['task', 'event']).default('event'),
  taskId: v.id().nullable().optional(),
  title: v.text(120).optional(),
});
export const blockPatch = z.object({
  date: v.date().optional(),
  start: v.minuteOfDay().optional(),
  end: v.minuteOfDay().optional(),
  locked: z.boolean().optional(),
  status: z.enum(['planned', 'done', 'missed']).optional(),
  title: v.text(120, 1).optional(),
});

/** @param {any} b */
const serializeBlock = (b) => ({
  id: b.id,
  taskId: b.task_id,
  date: b.date,
  start: b.start_min,
  end: b.end_min,
  kind: b.kind,
  title: b.title,
  locked: !!b.locked,
  status: b.status,
  origin: b.origin,
  priority: b.priority ?? null,
  taskStatus: b.task_status ?? null,
  projectName: b.project_name ?? null,
  projectColor: b.project_color ?? null,
});

/** @param {import('../../db/index.js').Db} db @param {number} userId @param {string} date */
const dayBlocks = (db, userId, date) =>
  db.all(
    `SELECT b.*, t.priority, t.status AS task_status, p.name AS project_name, p.color AS project_color
       FROM schedule_blocks b LEFT JOIN tasks t ON t.id = b.task_id LEFT JOIN projects p ON p.id = t.project_id
      WHERE b.user_id = ? AND b.date = ? ORDER BY b.start_min, b.id`,
    userId,
    date,
  );

/**
 * Open tasks with the minutes still left after completed and already planned work.
 * @param {import('../../db/index.js').Db} db
 * @param {number} userId
 * @param {{ today: string, before: string }} window planned blocks in [today, before) count as reserved
 */
export function openTasksWithRemaining(db, userId, window) {
  return db
    .all(
      `SELECT t.id, t.title, t.priority, t.due_date, t.estimate_minutes, t.missed_count, t.created_at,
         COALESCE((SELECT SUM(end_min - start_min) FROM schedule_blocks b WHERE b.task_id = t.id AND b.status = 'done'), 0) AS done_min,
         COALESCE((SELECT SUM(end_min - start_min) FROM schedule_blocks b WHERE b.task_id = t.id AND b.status = 'planned'
                   AND b.date >= ? AND b.date < ?), 0) AS reserved_min
       FROM tasks t WHERE t.user_id = ? AND t.status != 'done'`,
      window.today,
      window.before,
      userId,
    )
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.due_date,
      estimateMinutes: t.estimate_minutes,
      missedCount: t.missed_count,
      createdAt: t.created_at,
      remaining: Math.max(0, t.estimate_minutes - t.done_min - t.reserved_min),
    }));
}

/**
 * @param {import('../../db/index.js').Db} db
 * @param {any} user
 * @param {string} date
 */
export function getDay(db, user, date, nowMs = Date.now()) {
  const now = localNow(user, nowMs);
  const blocks = dayBlocks(db, user.id, date).map(serializeBlock);
  const settings = workSettings(user);
  const overlaps = findOverlaps(blocks.filter((b) => b.status !== 'missed'));
  const tasks = openTasksWithRemaining(db, user.id, { today: now.date, before: now.date });
  const risks = assessDeadlines({ today: now.date, nowMinutes: now.minutes, settings, tasks });
  return {
    date,
    today: now.date,
    nowMinutes: now.minutes,
    isToday: date === now.date,
    isPast: date < now.date,
    workDay: isWorkDay(settings, date),
    settings: { workStart: settings.workStart, workEnd: settings.workEnd, lunchStart: settings.lunchStart, lunchMinutes: settings.lunchMinutes },
    blocks,
    overlaps,
    risks,
  };
}

/**
 * (Re)plans a day. Locked, manual, done and already-started blocks are kept;
 * past unfinished task blocks become "missed" and raise the task's urgency.
 * Plans for later days are cleared because they depended on this one.
 * @param {import('../../db/index.js').Db} db
 * @param {any} user
 * @param {string} date
 */
export function planDayFor(db, user, date, nowMs = Date.now()) {
  const now = localNow(user, nowMs);
  if (date < now.date) throw badRequest('You can only plan today or a future day.');
  if (date > addDays(now.date, 60)) throw badRequest('Plans can be made up to 60 days ahead.');
  const isToday = date === now.date;
  const cutoff = isToday ? now.minutes : 0;

  return db.tx(() => {
    const before = dayBlocks(db, user.id, date)
      .filter((b) => b.kind === 'task' && b.status === 'planned')
      .map((b) => ({ taskId: b.task_id, title: b.title, start: b.start_min }));

    /** @type {{ taskId: number, title: string }[]} */
    const missed = [];
    if (isToday) {
      const past = db.all(
        `SELECT id, task_id, title FROM schedule_blocks
          WHERE user_id = ? AND date = ? AND status = 'planned' AND kind = 'task' AND end_min <= ?`,
        user.id,
        date,
        cutoff,
      );
      const seen = new Set();
      for (const b of past) {
        db.run(`UPDATE schedule_blocks SET status = 'missed', updated_at = ? WHERE id = ?`, Date.now(), b.id);
        if (b.task_id && !seen.has(b.task_id)) {
          seen.add(b.task_id);
          db.run('UPDATE tasks SET missed_count = missed_count + 1 WHERE id = ? AND user_id = ?', b.task_id, user.id);
          taskEvent(db, { userId: user.id, taskId: b.task_id, title: b.title, type: 'missed', details: { date } });
          missed.push({ taskId: b.task_id, title: b.title });
        }
      }
    }
    db.run(
      `DELETE FROM schedule_blocks WHERE user_id = ? AND date = ? AND status = 'planned' AND locked = 0 AND origin = 'planner' AND start_min >= ?`,
      user.id,
      date,
      cutoff,
    );
    db.run(
      `DELETE FROM schedule_blocks WHERE user_id = ? AND date > ? AND status = 'planned' AND locked = 0 AND origin = 'planner'`,
      user.id,
      date,
    );

    const fixed = dayBlocks(db, user.id, date)
      .filter((b) => b.status !== 'missed')
      .map((b) => ({ start: b.start_min, end: b.end_min }));
    // Work already placed on this date (kept blocks) or on earlier upcoming days is reserved.
    const tasks = openTasksWithRemaining(db, user.id, { today: now.date, before: addDays(date, 1) });
    const result = planDay({ date, settings: workSettings(user), tasks, fixed, earliest: isToday ? now.minutes : null, nowMs });

    const ts = Date.now();
    for (const b of result.blocks) {
      db.run(
        `INSERT INTO schedule_blocks (user_id, task_id, date, start_min, end_min, kind, title, origin, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'planner', ?, ?)`,
        user.id,
        b.taskId,
        date,
        b.start,
        b.end,
        b.kind,
        b.title,
        ts,
        ts,
      );
    }
    const changes = diffPlans(before, result.blocks.filter((b) => b.kind === 'task'));
    return {
      day: getDay(db, user, date, nowMs),
      changes,
      missed,
      overflow: result.overflow,
      capacity: result.capacity,
      used: result.used,
      workDay: result.workDay,
    };
  });
}

/** @param {any} user @param {string} date */
export function nextWorkDay(user, date) {
  const s = workSettings(user);
  let d = addDays(date, 1);
  for (let i = 0; i < 14 && !isWorkDay(s, d); i++) d = addDays(d, 1);
  return d;
}

/**
 * Adaptive re-plan: rebuilds the rest of today from "now", then carries
 * anything that no longer fits over to the next working day.
 * @param {import('../../db/index.js').Db} db
 * @param {any} user
 */
export function replanToday(db, user, nowMs = Date.now()) {
  const today = localNow(user, nowMs).date;
  return db.tx(() => {
    const todayResult = planDayFor(db, user, today, nowMs);
    let next = null;
    if (todayResult.overflow.length) {
      const date = nextWorkDay(user, today);
      const r = planDayFor(db, user, date, nowMs);
      const carried = todayResult.overflow.filter((o) => r.day.blocks.some((b) => b.taskId === o.taskId)).map((o) => o.title);
      next = { date, carried, overflow: r.overflow };
    }
    return { ...todayResult, next };
  });
}

/**
 * Manual blocks always win: overlapping unlocked planner blocks are removed
 * (they can be re-planned), anything else is reported as a conflict.
 * @param {import('../../db/index.js').Db} db
 * @param {number} userId
 * @param {{ date: string, start: number, end: number, excludeId?: number }} slot
 */
function clearSlot(db, userId, slot) {
  const hits = db.all(
    `SELECT id, title, start_min, end_min, locked, origin, status FROM schedule_blocks
      WHERE user_id = ? AND date = ? AND id != ? AND status != 'missed' AND start_min < ? AND end_min > ?`,
    userId,
    slot.date,
    slot.excludeId ?? 0,
    slot.end,
    slot.start,
  );
  const hard = hits.filter((h) => h.locked || h.origin === 'manual' || h.status === 'done');
  if (hard.length) {
    throw conflict(`This time overlaps “${hard[0].title}”.`, {
      conflicts: hard.map((h) => ({ id: h.id, title: h.title, start: h.start_min, end: h.end_min })),
    });
  }
  for (const h of hits) db.run('DELETE FROM schedule_blocks WHERE id = ?', h.id);
  return hits.length;
}

/**
 * @param {import('../../db/index.js').Db} db
 * @param {any} user
 * @param {z.infer<typeof blockInput>} input
 */
export function createBlock(db, user, input) {
  if (input.end <= input.start) throw badRequest('The block must end after it starts.');
  let title = input.title || '';
  if (input.kind === 'task') {
    if (!input.taskId) throw badRequest('Choose a task for this block.');
    const t = db.get('SELECT title FROM tasks WHERE id = ? AND user_id = ?', input.taskId, user.id);
    if (!t) throw badRequest('Unknown task.');
    title = t.title;
  } else if (!title) throw badRequest('Give the event a name.');
  return db.tx(() => {
    clearSlot(db, user.id, input);
    const ts = Date.now();
    const { lastId } = db.run(
      `INSERT INTO schedule_blocks (user_id, task_id, date, start_min, end_min, kind, title, locked, origin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'manual', ?, ?)`,
      user.id,
      input.kind === 'task' ? input.taskId : null,
      input.date,
      input.start,
      input.end,
      input.kind,
      title,
      ts,
      ts,
    );
    return serializeBlock(db.get('SELECT * FROM schedule_blocks WHERE id = ?', lastId));
  });
}

/**
 * @param {import('../../db/index.js').Db} db
 * @param {any} user
 * @param {number} id
 * @param {z.infer<typeof blockPatch>} patch
 */
export function updateBlock(db, user, id, patch) {
  const b = db.get('SELECT * FROM schedule_blocks WHERE id = ? AND user_id = ?', id, user.id);
  if (!b) throw notFound('Block not found.');
  const next = {
    date: patch.date ?? b.date,
    start: patch.start ?? b.start_min,
    end: patch.end ?? b.end_min,
  };
  if (next.end <= next.start) throw badRequest('The block must end after it starts.');
  const moved = next.date !== b.date || next.start !== b.start_min || next.end !== b.end_min;
  return db.tx(() => {
    if (moved) clearSlot(db, user.id, { ...next, excludeId: id });
    db.run(
      `UPDATE schedule_blocks SET date = ?, start_min = ?, end_min = ?, locked = ?, status = ?, title = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
      next.date,
      next.start,
      next.end,
      patch.locked !== undefined ? (patch.locked ? 1 : 0) : moved ? 1 : b.locked,
      patch.status ?? b.status,
      b.kind === 'task' ? b.title : (patch.title ?? b.title),
      Date.now(),
      id,
      user.id,
    );
    if (patch.status === 'done' && b.status !== 'done' && b.task_id) {
      taskEvent(db, { userId: user.id, taskId: b.task_id, title: b.title, type: 'worked', details: { minutes: next.end - next.start } });
    }
    return serializeBlock(db.get('SELECT * FROM schedule_blocks WHERE id = ?', id));
  });
}

/** @param {import('../../db/index.js').Db} db @param {any} user @param {number} id */
export function deleteBlock(db, user, id) {
  const r = db.run('DELETE FROM schedule_blocks WHERE id = ? AND user_id = ?', id, user.id);
  if (!r.changes) throw notFound('Block not found.');
  return { id };
}

/**
 * Ranked list of what to work on next (used by the dashboard and assistant).
 * @param {import('../../db/index.js').Db} db
 * @param {any} user
 */
export function priorities(db, user, limit = 5, nowMs = Date.now()) {
  const now = localNow(user, nowMs);
  return openTasksWithRemaining(db, user.id, { today: now.date, before: now.date })
    .map((t) => ({ ...t, score: scoreTask(t, now.date, nowMs) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
