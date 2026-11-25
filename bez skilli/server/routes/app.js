import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from '../lib/rateLimit.js';
import { addDays } from '../lib/time.js';
import { idParam, parse, v } from '../lib/validate.js';
import { requireAccess, requireCsrf, requireUser } from '../middleware/auth.js';
import { productivity } from '../services/analytics.js';
import { createProject, deleteProject, listProjects, projectDetail, projectInput, projectPatch, updateProject } from '../services/projects.js';
import {
  blockInput,
  blockPatch,
  createBlock,
  deleteBlock,
  getDay,
  localNow,
  planDayFor,
  priorities,
  replanToday,
  updateBlock,
} from '../services/scheduler/schedule.js';
import { completeTask, createTask, deleteTask, getTask, listTasks, serializeTask, taskHistory, taskInput, taskPatch, updateTask } from '../services/tasks.js';

/**
 * The product API. Every route requires: a valid app session, a matching
 * CSRF token for mutations, and an active, non-expired access grant —
 * checked on the server for each request. All queries are scoped by user_id.
 * @param {import('../app.js').Deps} deps
 */
export function appRoutes(deps) {
  const { db, config, ai } = deps;
  const r = Router();
  r.use(requireUser, requireCsrf, requireAccess(db));

  // ---------- Tasks ----------
  const taskQuery = z.object({
    status: z.enum(['open', 'todo', 'in_progress', 'done']).optional(),
    projectId: v.id().optional(),
    q: z.string().trim().max(100).optional(),
  });
  r.get('/tasks', (req, res) => {
    const f = parse(taskQuery, req.query);
    res.json({ tasks: listTasks(db, req.auth.user.id, f) });
  });
  r.get('/tasks/history', (req, res) => {
    res.json({ events: taskHistory(db, req.auth.user.id, 150) });
  });
  r.get('/tasks/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    res.json({ task: serializeTask(getTask(db, req.auth.user.id, id)) });
  });
  r.post('/tasks', (req, res) => {
    res.status(201).json({ task: createTask(db, req.auth.user, req.access.plan, parse(taskInput, req.body)) });
  });
  r.patch('/tasks/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    res.json({ task: updateTask(db, req.auth.user, req.access.plan, id, parse(taskPatch, req.body)) });
  });
  r.post('/tasks/:id/complete', (req, res) => {
    const { id } = parse(idParam, req.params);
    res.json({ task: completeTask(db, req.auth.user, req.access.plan, id) });
  });
  r.post('/tasks/:id/reopen', (req, res) => {
    const { id } = parse(idParam, req.params);
    res.json({ task: updateTask(db, req.auth.user, req.access.plan, id, { status: 'todo' }) });
  });
  r.delete('/tasks/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    res.json(deleteTask(db, req.auth.user, id));
  });

  // ---------- Projects ----------
  r.get('/projects', (req, res) => {
    const { status } = parse(z.object({ status: z.enum(['active', 'completed', 'archived']).optional() }), req.query);
    res.json({ projects: listProjects(db, req.auth.user.id, status) });
  });
  r.get('/projects/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    res.json(projectDetail(db, req.auth.user.id, id, localNow(req.auth.user).date));
  });
  r.post('/projects', (req, res) => {
    res.status(201).json({ project: createProject(db, req.auth.user, req.access.plan, parse(projectInput, req.body)) });
  });
  r.patch('/projects/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    res.json({ project: updateProject(db, req.auth.user, req.access.plan, id, parse(projectPatch, req.body)) });
  });
  r.delete('/projects/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    const { deleteTasks } = parse(z.object({ deleteTasks: z.enum(['true', 'false']).optional() }), req.query);
    res.json(deleteProject(db, req.auth.user, id, deleteTasks === 'true'));
  });

  // ---------- Schedule ----------
  const dateQuery = z.object({ date: v.date().optional() });
  r.get('/schedule', (req, res) => {
    const { date } = parse(dateQuery, req.query);
    res.json(getDay(db, req.auth.user, date ?? localNow(req.auth.user).date));
  });
  r.post('/schedule/plan', (req, res) => {
    const { date } = parse(z.object({ date: v.date() }), req.body);
    res.json(planDayFor(db, req.auth.user, date));
  });
  r.post('/schedule/replan', (req, res) => {
    res.json(replanToday(db, req.auth.user));
  });
  r.post('/schedule/blocks', (req, res) => {
    res.status(201).json({ block: createBlock(db, req.auth.user, parse(blockInput, req.body)) });
  });
  r.patch('/schedule/blocks/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    res.json({ block: updateBlock(db, req.auth.user, id, parse(blockPatch, req.body)) });
  });
  r.delete('/schedule/blocks/:id', (req, res) => {
    const { id } = parse(idParam, req.params);
    res.json(deleteBlock(db, req.auth.user, id));
  });

  // ---------- Dashboard ----------
  r.get('/dashboard', (req, res) => {
    const user = req.auth.user;
    const now = localNow(user);
    const day = getDay(db, user, now.date);
    const taskBlocks = day.blocks.filter((b) => b.kind === 'task');
    const doneToday = db.all(
      `SELECT id, title FROM tasks WHERE user_id = ? AND status = 'done' AND completed_at > ? ORDER BY completed_at DESC`,
      user.id,
      Date.now() - (now.minutes + 1) * 60000,
    );
    const dueToday = listTasks(db, user.id, { status: 'open', due: 'overdue_or_today', today: now.date });
    const weekStats = productivity(db, user, { days: 7, maxDays: 7, weeklyReports: false });
    res.json({
      today: now.date,
      nowMinutes: now.minutes,
      greetingName: user.name.split(' ')[0],
      schedule: day,
      progress: {
        blocksDone: taskBlocks.filter((b) => b.status === 'done').length,
        blocksTotal: taskBlocks.length,
        plannedMinutes: taskBlocks.reduce((n, b) => n + b.end - b.start, 0),
        doneMinutes: taskBlocks.filter((b) => b.status === 'done').reduce((n, b) => n + b.end - b.start, 0),
        tasksDoneToday: doneToday.length,
      },
      dueToday,
      priorities: priorities(db, user, 5),
      projects: listProjects(db, user.id, 'active').slice(0, 4),
      week: { totals: weekStats.totals, series: weekStats.series },
      tomorrow: addDays(now.date, 1),
    });
  });

  // ---------- Analytics ----------
  r.get('/analytics', (req, res) => {
    const { days } = parse(z.object({ days: z.coerce.number().int().min(7).max(365).default(30) }), req.query);
    const plan = req.access.plan;
    res.json(productivity(db, req.auth.user, { days, maxDays: plan.analytics_days, weeklyReports: !!plan.features.weekly_reports }));
  });

  // ---------- AI assistant ----------
  const aiLimit = rateLimit({
    windowMs: 60000,
    max: 12,
    disabled: config.rateLimits.disabled,
    key: (req) => `ai:${req.auth?.user.id}`,
    message: 'You are sending messages very quickly. Wait a moment and try again.',
  });
  r.get('/ai/messages', (req, res) => {
    res.json({ messages: ai.messages(req.auth.user.id), status: ai.status(), usage: { used: ai.usageToday(req.auth.user.id), limit: req.access.plan.ai_daily_limit } });
  });
  r.delete('/ai/messages', (req, res) => {
    ai.clear(req.auth.user.id);
    res.json({ ok: true });
  });
  r.post('/ai/command', aiLimit, async (req, res) => {
    const { message } = parse(z.object({ message: v.text(config.ai.maxInputChars, 1) }), req.body);
    res.json(await ai.command(req.auth.user, req.access.plan, message));
  });
  r.post('/ai/proposals/:id/apply', (req, res) => {
    const { id } = parse(idParam, req.params);
    const { actions } = parse(z.object({ actions: z.array(z.number().int().min(0).max(50)).max(50).optional() }), req.body);
    res.json(ai.apply(req.auth.user, req.access.plan, id, actions));
  });
  r.post('/ai/proposals/:id/discard', (req, res) => {
    const { id } = parse(idParam, req.params);
    res.json(ai.discard(req.auth.user, id));
  });

  return r;
}
