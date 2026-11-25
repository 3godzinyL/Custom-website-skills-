import { addDays, weekStart, zonedParts } from '../lib/time.js';

/**
 * Productivity analytics computed from the user's own records only:
 * completed tasks, finished schedule blocks and missed blocks.
 * @param {import('../db/index.js').Db} db
 * @param {any} user
 * @param {{ days: number, maxDays: number, weeklyReports: boolean }} o
 */
export function productivity(db, user, o, nowMs = Date.now()) {
  const days = Math.max(7, Math.min(o.days, o.maxDays));
  const today = zonedParts(nowMs, user.timezone).date;
  const from = addDays(today, -(days - 1));
  const sinceMs = Date.parse(`${addDays(from, -1)}T00:00:00Z`);

  /** @type {Map<string, { date: string, completed: number, focusMinutes: number, done: number, missed: number }>} */
  const byDay = new Map();
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    byDay.set(d, { date: d, completed: 0, focusMinutes: 0, done: 0, missed: 0 });
  }

  const completed = db.all(
    `SELECT t.completed_at, t.estimate_minutes, t.project_id FROM tasks t WHERE t.user_id = ? AND t.status = 'done' AND t.completed_at >= ?`,
    user.id,
    sinceMs,
  );
  for (const t of completed) {
    const d = zonedParts(t.completed_at, user.timezone).date;
    const row = byDay.get(d);
    if (row) row.completed += 1;
  }

  const blocks = db.all(
    `SELECT date, start_min, end_min, status FROM schedule_blocks
      WHERE user_id = ? AND kind = 'task' AND date >= ? AND date <= ? AND status IN ('done', 'missed')`,
    user.id,
    from,
    today,
  );
  for (const b of blocks) {
    const row = byDay.get(b.date);
    if (!row) continue;
    if (b.status === 'done') {
      row.done += 1;
      row.focusMinutes += b.end_min - b.start_min;
    } else row.missed += 1;
  }

  const series = [...byDay.values()].map((r) => ({
    ...r,
    adherence: r.done + r.missed ? Math.round((r.done / (r.done + r.missed)) * 100) : null,
  }));
  const totals = series.reduce(
    (acc, r) => {
      acc.completed += r.completed;
      acc.focusMinutes += r.focusMinutes;
      acc.done += r.done;
      acc.missed += r.missed;
      return acc;
    },
    { completed: 0, focusMinutes: 0, done: 0, missed: 0 },
  );

  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].completed > 0) streak += 1;
    else if (i === series.length - 1) continue; // today may still be in progress
    else break;
  }

  const projects = db.all(
    `SELECT p.id, p.name, p.color, p.status,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS total,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') AS done
       FROM projects p WHERE p.user_id = ? AND p.status != 'archived' ORDER BY p.updated_at DESC LIMIT 12`,
    user.id,
  ).map((p) => ({ ...p, progress: p.total ? Math.round((p.done / p.total) * 100) : 0 }));

  const priorityMix = db.all(
    `SELECT priority, COUNT(*) AS n FROM tasks WHERE user_id = ? AND status = 'done' AND completed_at >= ? GROUP BY priority ORDER BY priority`,
    user.id,
    sinceMs,
  );

  const weeks = o.weeklyReports ? weeklySummaries(series) : [];
  const busiest = [...series].sort((a, b) => b.focusMinutes - a.focusMinutes)[0];

  return {
    range: { from, to: today, days, maxDays: o.maxDays },
    totals: {
      ...totals,
      adherence: totals.done + totals.missed ? Math.round((totals.done / (totals.done + totals.missed)) * 100) : null,
      streak,
      openTasks: db.get(`SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND status != 'done'`, user.id).n,
    },
    series,
    projects,
    priorityMix,
    weeks,
    weeklyReports: o.weeklyReports,
    busiestDay: busiest && busiest.focusMinutes > 0 ? busiest.date : null,
  };
}

/** @param {{ date: string, completed: number, focusMinutes: number, done: number, missed: number }[]} series */
function weeklySummaries(series) {
  /** @type {Map<string, { weekStart: string, completed: number, focusMinutes: number, done: number, missed: number, activeDays: number }>} */
  const m = new Map();
  for (const r of series) {
    const w = weekStart(r.date);
    let row = m.get(w);
    if (!row) {
      row = { weekStart: w, completed: 0, focusMinutes: 0, done: 0, missed: 0, activeDays: 0 };
      m.set(w, row);
    }
    row.completed += r.completed;
    row.focusMinutes += r.focusMinutes;
    row.done += r.done;
    row.missed += r.missed;
    if (r.completed || r.focusMinutes) row.activeDays += 1;
  }
  return [...m.values()]
    .map((w) => ({ ...w, adherence: w.done + w.missed ? Math.round((w.done / (w.done + w.missed)) * 100) : null }))
    .reverse();
}
