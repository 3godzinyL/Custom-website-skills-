import { forbidden, limitReached, notFound, tooMany } from '../../lib/errors.js';
import { fmtMinutes } from '../../lib/time.js';
import { listProjects } from '../projects.js';
import { listTasks } from '../tasks.js';
import { getDay, localNow, nextWorkDay, priorities, workSettings } from '../scheduler/schedule.js';
import { isWorkDay } from '../scheduler/engine.js';
import { applyActions, describeAction, sanitizeActions } from './actions.js';
import { createAnthropicProvider } from './anthropic.js';
import { interpretDemo } from './demo.js';

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PROPOSAL_TTL_MS = 30 * 60000;

/**
 * Assistant orchestration: quota checks → user-scoped context → provider →
 * validation → stored proposal. Applying a proposal re-reads it from the
 * database (the client never sends actions back), so a tampered request
 * cannot inject operations.
 * @param {{ db: import('../../db/index.js').Db, config: import('../../config.js').AppConfig, logger: import('../../lib/logger.js').Logger, fetchImpl?: typeof fetch }} deps
 */
export function createAiService({ db, config, logger, fetchImpl }) {
  const live = config.ai.provider === 'anthropic' && config.ai.apiKey ? createAnthropicProvider(config.ai, fetchImpl) : null;

  function status() {
    return { mode: live ? 'live' : 'demo', provider: live ? 'anthropic' : 'demo', model: live ? config.ai.model : null };
  }

  /** @param {number} userId */
  function usageToday(userId, now = Date.now()) {
    return db.get('SELECT COUNT(*) AS n FROM ai_usage WHERE user_id = ? AND created_at > ?', userId, now - 86400000).n;
  }

  /** @param {any} user */
  function buildContext(user) {
    const now = localNow(user);
    const tasks = listTasks(db, user.id, { status: 'open' }).slice(0, 80);
    const projects = listProjects(db, user.id, 'active').slice(0, 30);
    const day = getDay(db, user, now.date);
    const s = workSettings(user);
    const doneToday = db.get(
      `SELECT COUNT(*) AS n FROM task_events WHERE user_id = ? AND type = 'completed' AND created_at > ?`,
      user.id,
      Date.now() - (now.minutes + 1) * 60000,
    ).n;
    return {
      today: now.date,
      nowMinutes: now.minutes,
      weekday: WEEKDAY[now.weekday],
      timezone: user.timezone,
      workEnd: s.workEnd,
      bufferMinutes: s.bufferMinutes,
      isWorkDayToday: isWorkDay(s, now.date),
      nextWorkDay: nextWorkDay(user, now.date),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
        estimateMinutes: t.estimateMinutes,
        projectId: t.projectId,
        projectName: t.projectName,
        status: t.status,
        missedCount: t.missedCount,
      })),
      projects: projects.map((p) => ({ id: p.id, name: p.name, dueDate: p.dueDate, progress: p.progress, openTasks: p.taskCount - p.doneCount })),
      todayBlocks: day.blocks.map((b) => ({ start: fmtMinutes(b.start), end: fmtMinutes(b.end), title: b.title, status: b.status, kind: b.kind })),
      priorities: priorities(db, user, 5),
      risks: day.risks.slice(0, 10),
      stats: {
        doneToday,
        focusToday: day.blocks.filter((b) => b.status === 'done' && b.kind === 'task').reduce((n, b) => n + b.end - b.start, 0),
        plannedLeft: day.blocks.filter((b) => b.status === 'planned' && b.kind === 'task' && b.end > now.minutes).length,
      },
    };
  }

  /** Compact context for the model (ids, titles, dates — nothing about other users). */
  function modelContext(ctx) {
    return {
      now: { date: ctx.today, time: fmtMinutes(ctx.nowMinutes), weekday: ctx.weekday, timezone: ctx.timezone },
      workingHours: { end: fmtMinutes(ctx.workEnd), isWorkDayToday: ctx.isWorkDayToday, nextWorkDay: ctx.nextWorkDay },
      openTasks: ctx.tasks,
      activeProjects: ctx.projects,
      todaySchedule: ctx.todayBlocks,
      suggestedOrder: ctx.priorities.map((p) => ({ id: p.id, title: p.title, score: p.score })),
      deadlineRisks: ctx.risks,
      todayStats: ctx.stats,
    };
  }

  /**
   * @param {any} user
   * @param {import('../plans.js').Plan} plan
   * @param {string} message
   */
  async function command(user, plan, message) {
    if (!plan.features.ai_assistant) throw limitReached(`The AI assistant is not included in the ${plan.name} plan.`, { feature: 'ai_assistant' });
    const used = usageToday(user.id);
    if (used >= plan.ai_daily_limit) {
      throw limitReached(`You've used all ${plan.ai_daily_limit} assistant requests for the last 24 hours on the ${plan.name} plan.`, {
        limit: plan.ai_daily_limit,
        kind: 'ai',
      });
    }
    const ctx = buildContext(user);
    const history = db
      .all('SELECT role, content FROM ai_messages WHERE user_id = ? ORDER BY id DESC LIMIT 6', user.id)
      .reverse();

    /** @type {{ intent: string, reply: string, actions: unknown[], usage?: { input: number, output: number } }} */
    let out;
    let mode = 'demo';
    let notice = null;
    if (live) {
      const globalUsed = db.get(`SELECT COUNT(*) AS n FROM ai_usage WHERE mode = 'live' AND created_at > ?`, Date.now() - 86400000).n;
      if (globalUsed >= config.ai.globalDailyLimit) throw tooMany('The assistant is at capacity right now. Please try again later.');
      try {
        out = await live.interpret({ message, context: modelContext(ctx), history });
        mode = 'live';
      } catch (err) {
        logger.warn('live AI request failed; falling back to demo engine', { error: String(/** @type {Error} */ (err).message) });
        db.run(`INSERT INTO ai_usage (user_id, mode, ok, created_at) VALUES (?, 'live', 0, ?)`, user.id, Date.now());
        out = interpretDemo(message, ctx);
        notice = 'The AI model could not be reached, so this answer comes from the built-in rule-based demo engine.';
      }
    } else {
      out = interpretDemo(message, ctx);
    }

    if (out.intent === 'breakdown' && !plan.features.ai_breakdown) {
      out = {
        intent: 'breakdown',
        reply: `Breaking projects down into steps is part of the Pro plan. You're on ${plan.name}; I can still add tasks, plan your day and re-plan it.`,
        actions: [],
      };
    }

    const scope = {
      taskIds: new Set(ctx.tasks.map((t) => t.id)),
      projectIds: new Set(ctx.projects.map((p) => p.id)),
      today: ctx.today,
    };
    // Completed/archived items aren't in the context; allow ids the user owns.
    for (const r of db.all('SELECT id FROM tasks WHERE user_id = ?', user.id)) scope.taskIds.add(r.id);
    for (const r of db.all('SELECT id FROM projects WHERE user_id = ?', user.id)) scope.projectIds.add(r.id);
    const { actions, rejected } = sanitizeActions(out.actions, scope);
    if (rejected.length) logger.info('assistant actions rejected', { userId: user.id, count: rejected.length });

    const now = Date.now();
    db.run(
      'INSERT INTO ai_usage (user_id, mode, ok, input_tokens, output_tokens, created_at) VALUES (?, ?, 1, ?, ?, ?)',
      user.id,
      mode,
      out.usage?.input ?? 0,
      out.usage?.output ?? 0,
      now,
    );

    let proposalId = null;
    if (actions.length) {
      proposalId = db.run(
        'INSERT INTO ai_proposals (user_id, actions, mode, created_at) VALUES (?, ?, ?, ?)',
        user.id,
        JSON.stringify(actions),
        mode,
        now,
      ).lastId;
    }
    db.run('INSERT INTO ai_messages (user_id, role, content, created_at) VALUES (?, ?, ?, ?)', user.id, 'user', message, now);
    db.run(
      'INSERT INTO ai_messages (user_id, role, content, mode, proposal_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      user.id,
      'assistant',
      out.reply,
      mode,
      proposalId,
      now + 1,
    );
    pruneHistory(user.id);

    const titles = new Map(ctx.tasks.map((t) => [t.id, t.title]));
    for (const r of db.all('SELECT id, title FROM tasks WHERE user_id = ?', user.id)) titles.set(r.id, r.title);
    return {
      mode,
      notice,
      intent: out.intent,
      reply: out.reply,
      proposalId,
      actions: actions.map((a, index) => ({ index, type: a.type, summary: describeAction(a, titles) })),
      usage: { used: used + 1, limit: plan.ai_daily_limit },
    };
  }

  /**
   * @param {any} user
   * @param {import('../plans.js').Plan} plan
   * @param {number} proposalId
   * @param {number[] | undefined} indexes subset of actions the user kept
   */
  function apply(user, plan, proposalId, indexes) {
    const p = db.get('SELECT * FROM ai_proposals WHERE id = ? AND user_id = ?', proposalId, user.id);
    if (!p) throw notFound('Proposal not found.');
    if (p.status !== 'pending') throw forbidden('This proposal was already handled.', 'proposal_closed');
    if (Date.now() - p.created_at > PROPOSAL_TTL_MS) {
      db.run(`UPDATE ai_proposals SET status = 'expired', resolved_at = ? WHERE id = ?`, Date.now(), p.id);
      throw forbidden('This proposal expired. Ask the assistant again.', 'proposal_expired');
    }
    /** @type {import('./actions.js').AiAction[]} */
    const all = JSON.parse(p.actions);
    const chosen = indexes ? all.filter((_, i) => indexes.includes(i)) : all;
    // Ownership may have changed since the proposal (e.g. a task was deleted): re-validate.
    const scope = {
      taskIds: new Set(db.all('SELECT id FROM tasks WHERE user_id = ?', user.id).map((r) => r.id)),
      projectIds: new Set(db.all('SELECT id FROM projects WHERE user_id = ?', user.id).map((r) => r.id)),
      today: localNow(user).date,
    };
    const { actions } = sanitizeActions(chosen, scope);
    const results = applyActions(db, user, plan, actions);
    db.run(
      `UPDATE ai_proposals SET status = 'applied', result = ?, resolved_at = ? WHERE id = ?`,
      JSON.stringify(results),
      Date.now(),
      p.id,
    );
    return { results };
  }

  /** @param {any} user @param {number} proposalId */
  function discard(user, proposalId) {
    const r = db.run(
      `UPDATE ai_proposals SET status = 'discarded', resolved_at = ? WHERE id = ? AND user_id = ? AND status = 'pending'`,
      Date.now(),
      proposalId,
      user.id,
    );
    if (!r.changes) throw notFound('Proposal not found.');
    return { ok: true };
  }

  /** @param {number} userId */
  function pruneHistory(userId) {
    db.run(
      `DELETE FROM ai_messages WHERE user_id = ? AND id NOT IN (SELECT id FROM ai_messages WHERE user_id = ? ORDER BY id DESC LIMIT 200)`,
      userId,
      userId,
    );
  }

  /** @param {number} userId */
  function messages(userId) {
    const rows = db
      .all(
        `SELECT m.id, m.role, m.content, m.mode, m.proposal_id, m.created_at, p.status AS proposal_status, p.actions, p.result
           FROM ai_messages m LEFT JOIN ai_proposals p ON p.id = m.proposal_id
          WHERE m.user_id = ? ORDER BY m.id DESC LIMIT 40`,
        userId,
      )
      .reverse();
    const titles = new Map(db.all('SELECT id, title FROM tasks WHERE user_id = ?', userId).map((r) => [r.id, r.title]));
    return rows.map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      mode: r.mode,
      createdAt: r.created_at,
      proposal: r.proposal_id
        ? {
            id: r.proposal_id,
            status: r.proposal_status,
            actions: JSON.parse(r.actions || '[]').map((/** @type {any} */ a, /** @type {number} */ index) => ({ index, type: a.type, summary: describeAction(a, titles) })),
            results: r.result ? JSON.parse(r.result) : null,
          }
        : null,
    }));
  }

  /** @param {number} userId */
  function clear(userId) {
    db.run('DELETE FROM ai_messages WHERE user_id = ?', userId);
    db.run(`UPDATE ai_proposals SET status = 'discarded', resolved_at = ? WHERE user_id = ? AND status = 'pending'`, Date.now(), userId);
  }

  return { status, command, apply, discard, messages, clear, usageToday, buildContext };
}
/** @typedef {ReturnType<typeof createAiService>} AiService */
