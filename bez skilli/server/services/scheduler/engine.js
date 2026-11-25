import { diffDays, addDays, parseWorkDays, weekdayOf } from '../../lib/time.js';

/**
 * Pure scheduling engine — no I/O, fully deterministic, unit-tested.
 * Times are minutes after local midnight; dates are 'YYYY-MM-DD'.
 */

export const MIN_BLOCK = 20;
const PRIORITY_WEIGHT = { 1: 40, 2: 26, 3: 14, 4: 5 };

/**
 * @typedef {{ workStart: number, workEnd: number, workDays: string, lunchStart: number | null, lunchMinutes: number,
 *   bufferMinutes: number, maxBlockMinutes: number }} WorkSettings
 * @typedef {{ id: number, title: string, priority: number, dueDate: string | null, estimateMinutes: number,
 *   missedCount?: number, createdAt?: number, remaining?: number }} PlanTask
 * @typedef {{ start: number, end: number }} Interval
 */

/**
 * Urgency score: priority + deadline pressure + how often it already slipped.
 * @param {PlanTask} task
 * @param {string} date the day being planned
 * @param {number} [nowMs]
 */
export function scoreTask(task, date, nowMs = Date.now()) {
  let score = PRIORITY_WEIGHT[/** @type {1|2|3|4} */ (task.priority)] ?? 14;
  if (task.dueDate) {
    const days = diffDays(date, task.dueDate);
    if (days < 0) score += 55 + Math.min(20, -days * 5);
    else score += Math.max(0, 40 - days * 7);
    // Little slack: lots of work left relative to the days remaining.
    const hoursLeft = (task.remaining ?? task.estimateMinutes) / 60;
    if (days >= 0) score += Math.min(15, (hoursLeft / Math.max(1, days + 1)) * 4);
  }
  score += Math.min(18, (task.missedCount ?? 0) * 6);
  if (task.createdAt) score += Math.min(6, ((nowMs - task.createdAt) / 86400000) * 0.5);
  return Math.round(score * 10) / 10;
}

/**
 * Subtracts busy intervals from free ones.
 * @param {Interval[]} free
 * @param {Interval[]} busy
 */
export function subtract(free, busy) {
  let out = free.map((f) => ({ ...f }));
  for (const b of busy) {
    /** @type {Interval[]} */
    const next = [];
    for (const f of out) {
      if (b.end <= f.start || b.start >= f.end) {
        next.push(f);
        continue;
      }
      if (b.start > f.start) next.push({ start: f.start, end: b.start });
      if (b.end < f.end) next.push({ start: b.end, end: f.end });
    }
    out = next;
  }
  return out.filter((f) => f.end - f.start > 0).sort((a, b) => a.start - b.start);
}

/** @param {WorkSettings} s @param {string} date */
export const isWorkDay = (s, date) => parseWorkDays(s.workDays).has(weekdayOf(date));

/**
 * Builds a plan for one day.
 * @param {{ date: string, settings: WorkSettings, tasks: PlanTask[], fixed: Interval[], earliest?: number | null, nowMs?: number }} o
 */
export function planDay(o) {
  const s = o.settings;
  const earliest = o.earliest == null ? 0 : roundUp(o.earliest, 5);
  /** @type {{ taskId: number | null, title: string, start: number, end: number, kind: 'task' | 'break' }[]} */
  const blocks = [];
  if (!isWorkDay(s, o.date) || s.workEnd <= s.workStart) {
    return { blocks, overflow: o.tasks.filter((t) => (t.remaining ?? t.estimateMinutes) > 0).map(toOverflow), capacity: 0, used: 0, workDay: false };
  }

  const busy = [...o.fixed];
  if (s.lunchStart != null && s.lunchMinutes > 0) {
    const lunch = { start: s.lunchStart, end: s.lunchStart + s.lunchMinutes };
    const inside = lunch.start >= s.workStart && lunch.end <= s.workEnd;
    const clashes = o.fixed.some((f) => f.start < lunch.end && f.end > lunch.start);
    if (inside && !clashes && lunch.end > earliest) blocks.push({ taskId: null, title: 'Lunch break', start: lunch.start, end: lunch.end, kind: 'break' });
    if (inside) busy.push(lunch);
  }
  if (earliest > 0) busy.push({ start: 0, end: earliest });
  const intervals = subtract([{ start: s.workStart, end: s.workEnd }], busy);
  const capacity = intervals.reduce((sum, i) => sum + (i.end - i.start), 0);

  const queue = o.tasks
    .map((t) => ({ ...t, remaining: t.remaining ?? t.estimateMinutes, score: scoreTask(t, o.date, o.nowMs) }))
    .filter((t) => t.remaining > 0);
  let used = 0;

  for (;;) {
    const open = intervals.filter((i) => i.end - i.start >= MIN_BLOCK);
    if (!open.length) break;
    const candidates = queue.filter((q) => q.remaining > 0);
    if (!candidates.length) break;
    candidates.sort((a, b) => b.score - a.score || a.id - b.id);
    const q = candidates[0];
    const chunk = Math.min(q.remaining, s.maxBlockMinutes);
    const iv = intervals.find((i) => i.end - i.start >= Math.min(chunk, MIN_BLOCK));
    if (!iv) break;
    let len = Math.min(chunk, iv.end - iv.start);
    // Do not leave a useless sliver of a task for later.
    if (q.remaining - len > 0 && q.remaining - len < 10) len = Math.min(q.remaining, iv.end - iv.start);
    blocks.push({ taskId: q.id, title: q.title, start: iv.start, end: iv.start + len, kind: 'task' });
    used += len;
    iv.start += len + s.bufferMinutes;
    q.remaining -= len;
    q.score -= 12;
  }

  blocks.sort((a, b) => a.start - b.start);
  return {
    blocks,
    overflow: queue.filter((q) => q.remaining > 0).map(toOverflow),
    capacity,
    used,
    workDay: true,
  };
}

/** @param {PlanTask & { remaining?: number }} t */
const toOverflow = (t) => ({ taskId: t.id, title: t.title, remaining: t.remaining ?? t.estimateMinutes, dueDate: t.dueDate });

/** @param {number} v @param {number} step */
const roundUp = (v, step) => Math.ceil(v / step) * step;

/**
 * Usable focus minutes on a given day (after lunch and an allowance for buffers).
 * @param {WorkSettings} s @param {string} date @param {number | null} [fromMinute]
 */
export function dayCapacity(s, date, fromMinute = null) {
  if (!isWorkDay(s, date)) return 0;
  const start = Math.max(s.workStart, fromMinute ?? 0);
  if (start >= s.workEnd) return 0;
  let minutes = s.workEnd - start;
  if (s.lunchStart != null && s.lunchStart + s.lunchMinutes > start) minutes -= Math.min(s.lunchMinutes, s.lunchStart + s.lunchMinutes - start);
  const blocks = Math.max(1, Math.ceil(minutes / (s.maxBlockMinutes + s.bufferMinutes)));
  return Math.max(0, minutes - blocks * s.bufferMinutes);
}

/**
 * Earliest-deadline-first feasibility check across the coming days.
 * Flags overdue tasks and tasks whose deadline cannot be met with the
 * user's working hours, given everything due before them.
 * @param {{ today: string, nowMinutes: number, settings: WorkSettings, tasks: PlanTask[] }} o
 */
export function assessDeadlines(o) {
  /** @type {{ type: 'overdue' | 'deadline_risk', taskId: number, title: string, dueDate: string, shortByMinutes?: number }[]} */
  const risks = [];
  const dated = o.tasks
    .filter((t) => t.dueDate && (t.remaining ?? t.estimateMinutes) > 0)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)) || a.priority - b.priority);
  let required = 0;
  for (const t of dated) {
    const due = /** @type {string} */ (t.dueDate);
    if (due < o.today) {
      risks.push({ type: 'overdue', taskId: t.id, title: t.title, dueDate: due });
      required += t.remaining ?? t.estimateMinutes;
      continue;
    }
    required += t.remaining ?? t.estimateMinutes;
    let cap = 0;
    for (let d = o.today, i = 0; d <= due && i < 120; d = addDays(d, 1), i++) {
      cap += dayCapacity(o.settings, d, d === o.today ? o.nowMinutes : null);
    }
    if (required > cap) risks.push({ type: 'deadline_risk', taskId: t.id, title: t.title, dueDate: due, shortByMinutes: required - cap });
  }
  return risks;
}

/**
 * Finds overlapping blocks (manual edits can create them).
 * @param {{ id: number, start: number, end: number, title: string }[]} blocks
 */
export function findOverlaps(blocks) {
  const sorted = [...blocks].sort((a, b) => a.start - b.start);
  /** @type {{ a: number, b: number, titleA: string, titleB: string }[]} */
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length && sorted[j].start < sorted[i].end; j++) {
      out.push({ a: sorted[i].id, b: sorted[j].id, titleA: sorted[i].title, titleB: sorted[j].title });
    }
  }
  return out;
}

/**
 * Human-readable difference between two versions of a day plan.
 * @param {{ taskId: number | null, title: string, start: number }[]} before
 * @param {{ taskId: number | null, title: string, start: number }[]} after
 */
export function diffPlans(before, after) {
  const first = (/** @type {typeof before} */ list) => {
    /** @type {Map<number, { title: string, start: number }>} */
    const m = new Map();
    for (const b of list) if (b.taskId != null && !m.has(b.taskId)) m.set(b.taskId, b);
    return m;
  };
  const a = first(before);
  const b = first(after);
  /** @type {{ type: 'moved' | 'added' | 'removed', taskId: number, title: string, from?: number, to?: number }[]} */
  const changes = [];
  for (const [id, x] of b) {
    const old = a.get(id);
    if (!old) changes.push({ type: 'added', taskId: id, title: x.title, to: x.start });
    else if (old.start !== x.start) changes.push({ type: 'moved', taskId: id, title: x.title, from: old.start, to: x.start });
  }
  for (const [id, x] of a) if (!b.has(id)) changes.push({ type: 'removed', taskId: id, title: x.title, from: x.start });
  return changes;
}
