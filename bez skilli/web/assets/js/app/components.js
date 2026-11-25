import { api } from '../lib/api.js';
import { $, $$, esc, formData, html, mount, raw } from '../lib/dom.js';
import { addDays, dueLabel, duration, fmtDate, hm, parseHm, PRIORITY } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { confirmDialog, openMenu, openModal, setLoading, showErrors, toast } from '../lib/ui.js';
import { dataChanged, refreshSession, store } from './state.js';

/* ---------- Task row ---------- */
/**
 * @param {any} t serialized task
 * @param {string} today
 * @param {{ showProject?: boolean, compact?: boolean }} [o]
 */
export function taskRow(t, today, o = {}) {
  const due = t.status === 'done' ? null : dueLabel(t.dueDate, today);
  return html`<div class="task ${t.status === 'done' ? 'is-done' : ''}" data-task-id="${t.id}">
    <button class="task-check" data-act="toggle" aria-label="${t.status === 'done' ? 'Mark as not done' : 'Mark as done'}: ${t.title}">${icon('check')}</button>
    <span class="task-main">
      <button class="task-title-btn" data-act="edit"><span class="task-title">${t.title}</span></button>
      <span class="task-meta">
        ${t.status !== 'done' ? html`<span class="prio prio-${t.priority}">${PRIORITY[/** @type {1} */ (t.priority)]}</span>` : ''}
        ${o.showProject !== false && t.projectName ? html`<span><i class="dot c-${t.projectColor}"></i>${t.projectName}</span>` : ''}
        ${due ? html`<span class="${due.cls}">${icon('calendar')}${due.text}</span>` : ''}
        ${t.status !== 'done' ? html`<span>${icon('clock')}${duration(t.estimateMinutes)}</span>` : ''}
        ${t.missedCount && t.status !== 'done' ? html`<span class="is-overdue">${icon('refresh')}slipped ${t.missedCount}×</span>` : ''}
        ${t.source === 'ai' ? html`<span>${icon('sparkles')}AI</span>` : ''}
        ${t.status === 'done' && t.completedAt ? html`<span>Done ${new Date(t.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>` : ''}
      </span>
    </span>
    ${o.compact ? '' : html`<span class="task-actions"><button class="btn btn-ghost btn-icon btn-sm" data-act="menu" aria-label="More actions for ${t.title}">${icon('more')}</button></span>`}
  </div>`;
}

/**
 * Wires the standard task interactions inside a container.
 * @param {HTMLElement} root
 * @param {() => any[]} getTasks
 * @param {() => void} reload
 */
export function bindTaskActions(root, getTasks, reload) {
  root.addEventListener('click', async (e) => {
    const btn = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-act]'));
    const row = /** @type {HTMLElement | null} */ (btn?.closest('[data-task-id]'));
    if (!btn || !row) return;
    const task = getTasks().find((t) => t.id === Number(row.dataset.taskId));
    if (!task) return;
    const act = btn.dataset.act;
    if (act === 'toggle') {
      row.classList.toggle('is-done');
      try {
        await api.post(`/api/app/tasks/${task.id}/${task.status === 'done' ? 'reopen' : 'complete'}`);
        if (task.status !== 'done') toast(`Done: ${task.title}`);
        dataChanged();
        reload();
        refreshSession();
      } catch (err) {
        row.classList.toggle('is-done');
        toast(/** @type {Error} */ (err).message, 'error');
      }
    } else if (act === 'edit') {
      taskModal(task, () => {
        dataChanged();
        reload();
      });
    } else if (act === 'menu') {
      openMenu(btn, [
        { label: 'Edit', icon: 'edit', action: () => taskModal(task, () => (dataChanged(), reload())) },
        { label: task.status === 'done' ? 'Reopen' : 'Mark as done', icon: 'check', action: () => /** @type {HTMLElement} */ (row.querySelector('[data-act="toggle"]')).click() },
        {
          label: 'Delete',
          icon: 'trash',
          danger: true,
          action: async () => {
            const ok = await confirmDialog({ title: 'Delete task?', message: `“${task.title}” and its scheduled blocks will be removed. This cannot be undone.`, confirm: 'Delete', danger: true });
            if (ok === false) return;
            try {
              await api.del(`/api/app/tasks/${task.id}`);
              toast('Task deleted');
              dataChanged();
              reload();
              refreshSession();
            } catch (err) {
              toast(/** @type {Error} */ (err).message, 'error');
            }
          },
        },
      ]);
    }
  });
}

/* ---------- Task modal ---------- */
let projectCache = /** @type {any[] | null} */ (null);
export async function getProjects(force = false) {
  if (!projectCache || force) projectCache = (await api.get('/api/app/projects')).projects;
  return /** @type {any[]} */ (projectCache);
}
document.addEventListener('kedgely:data', () => {
  projectCache = null;
});

const ESTIMATES = [15, 30, 45, 60, 90, 120, 180, 240, 360, 480];

/**
 * @param {any | null} task null = create
 * @param {(task: any) => void} onSaved
 * @param {{ projectId?: number, dueDate?: string, title?: string }} [defaults]
 */
export async function taskModal(task, onSaved, defaults = {}) {
  const projects = (await getProjects()).filter((p) => p.status !== 'archived' || p.id === task?.projectId);
  const t = task || { title: defaults.title || '', notes: '', projectId: defaults.projectId ?? null, priority: 3, dueDate: defaults.dueDate ?? null, estimateMinutes: 30, status: 'todo' };
  const est = ESTIMATES.includes(t.estimateMinutes) ? ESTIMATES : [...ESTIMATES, t.estimateMinutes].sort((a, b) => a - b);
  openModal({
    title: task ? 'Edit task' : 'New task',
    body: html`<form novalidate>
      <div class="field"><label class="label" for="tm-title">Title</label><input class="input" id="tm-title" name="title" value="${t.title}" required maxlength="200" autofocus /></div>
      <div class="field"><label class="label" for="tm-notes">Notes</label><textarea class="textarea" id="tm-notes" name="notes" maxlength="4000" rows="3">${t.notes}</textarea></div>
      <div class="form-row">
        <div class="field"><label class="label" for="tm-project">Project</label>
          <select class="select" id="tm-project" name="projectId"><option value="">No project</option>${projects.map((p) => html`<option value="${p.id}" ${p.id === t.projectId ? raw('selected') : ''}>${p.name}</option>`)}</select></div>
        <div class="field"><label class="label" for="tm-prio">Priority</label>
          <select class="select" id="tm-prio" name="priority">${[1, 2, 3, 4].map((p) => html`<option value="${p}" ${p === t.priority ? raw('selected') : ''}>${PRIORITY[/** @type {1} */ (p)]}</option>`)}</select></div>
      </div>
      <div class="form-row">
        <div class="field"><label class="label" for="tm-due">Due date</label><input class="input" id="tm-due" name="dueDate" type="date" value="${t.dueDate || ''}" /></div>
        <div class="field"><label class="label" for="tm-est">Estimate</label>
          <select class="select" id="tm-est" name="estimateMinutes">${est.map((m) => html`<option value="${m}" ${m === t.estimateMinutes ? raw('selected') : ''}>${duration(m)}</option>`)}</select></div>
      </div>
      ${task ? html`<div class="field"><label class="label" for="tm-status">Status</label><select class="select" id="tm-status" name="status">${[['todo', 'To do'], ['in_progress', 'In progress'], ['done', 'Done']].map(([v, l]) => html`<option value="${v}" ${v === t.status ? raw('selected') : ''}>${l}</option>`)}</select></div>` : ''}
      <div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" class="btn btn-primary">${task ? 'Save changes' : 'Add task'}</button></div>
    </form>`,
    onOpen: (el, close) => {
      const form = /** @type {HTMLFormElement} */ (el.querySelector('form'));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = formData(form);
        const body = {
          title: d.title,
          notes: d.notes,
          projectId: d.projectId ? Number(d.projectId) : null,
          priority: Number(d.priority),
          dueDate: d.dueDate || null,
          estimateMinutes: Number(d.estimateMinutes),
          ...(task ? { status: d.status } : {}),
        };
        const btn = /** @type {HTMLButtonElement} */ (form.querySelector('[type="submit"]'));
        setLoading(btn, true);
        try {
          const r = task ? await api.patch(`/api/app/tasks/${task.id}`, body) : await api.post('/api/app/tasks', body);
          toast(task ? 'Task updated' : 'Task added');
          close();
          refreshSession();
          onSaved(r.task);
        } catch (err) {
          showErrors(form, err);
        } finally {
          setLoading(btn, false);
        }
      });
    },
  });
}

/* ---------- Timeline ---------- */
const PPM = 1.1; // pixels per minute

/**
 * @param {any} day response of GET /api/app/schedule
 * @param {{ interactive?: boolean }} [o]
 */
export function timeline(day, o = {}) {
  const blocks = day.blocks;
  const s = day.settings;
  const startMin = Math.floor(Math.min(s.workStart, ...blocks.map((/** @type {any} */ b) => b.start)) / 60) * 60;
  const endMin = Math.ceil(Math.max(s.workEnd, ...blocks.map((/** @type {any} */ b) => b.end)) / 60) * 60;
  const y = (/** @type {number} */ m) => `${Math.round((m - startMin) * PPM)}px`;
  const conflictIds = new Set(day.overlaps.flatMap((/** @type {any} */ x) => [x.a, x.b]));
  const hours = [];
  for (let m = startMin; m <= endMin; m += 60) hours.push(m);
  const tag = o.interactive ? 'button' : 'div';
  const now = day.isToday && day.nowMinutes >= startMin && day.nowMinutes <= endMin;
  return html`<div class="tl" data-height="${y(endMin)}">
    ${startMin < s.workStart ? html`<div class="tl-off" data-top="0px" data-height="${y(s.workStart)}"></div>` : ''}
    ${endMin > s.workEnd ? html`<div class="tl-off" data-top="${y(s.workEnd)}" data-height="${`${Math.round((endMin - s.workEnd) * PPM)}px`}"></div>` : ''}
    ${hours.map((m) => html`<div class="tl-hour" data-top="${y(m)}"><span>${hm(m)}</span></div>`)}
    ${blocks.map((/** @type {any} */ b) => {
      const cls = [
        'tl-block',
        b.kind === 'event' ? 'is-event' : '',
        b.kind === 'break' ? 'is-break' : '',
        b.status === 'done' ? 'is-done' : '',
        b.status === 'missed' ? 'is-missed' : '',
        conflictIds.has(b.id) ? 'is-conflict' : '',
        b.projectColor ? `c-${b.projectColor}` : 'c-violet',
      ].join(' ');
      const label = `${b.title}, ${hm(b.start)} to ${hm(b.end)}${b.status !== 'planned' ? `, ${b.status}` : ''}`;
      return html`<${raw(tag)} class="${cls}" data-block-id="${b.id}" data-top="${y(b.start)}" data-height="${`${Math.max(18, Math.round((b.end - b.start) * PPM) - 3)}px`}" ${o.interactive ? raw(`type="button" aria-label="${esc(label)}"`) : ''}>
        ${b.kind === 'task' ? html`<span class="tick"></span>` : ''}
        <span class="tl-block-main"><span class="tl-block-title">${b.title}</span><span class="tl-block-meta">${hm(b.start)} – ${hm(b.end)}${b.projectName ? ` · ${b.projectName}` : ''}${b.status === 'missed' ? ' · missed' : ''}</span></span>
        ${b.locked ? icon('lock', 'lock') : ''}
      </${raw(tag)}>`;
    })}
    ${now ? html`<div class="tl-now" data-top="${y(day.nowMinutes)}"></div>` : ''}
  </div>`;
}

/** Scrolls a timeline container so "now" (or the first block) is visible. @param {HTMLElement} wrap */
export function scrollTimeline(wrap) {
  const target = /** @type {HTMLElement | null} */ (wrap.querySelector('.tl-now') || wrap.querySelector('.tl-block:not(.is-done)'));
  if (target) wrap.scrollTop = Math.max(0, target.offsetTop - 80);
}

/**
 * Block details / edit dialog.
 * @param {any} block
 * @param {() => void} onChange
 */
export function blockModal(block, onChange) {
  const isTask = block.kind === 'task';
  openModal({
    title: block.title,
    subtitle: `${fmtDate(block.date)} · ${hm(block.start)} – ${hm(block.end)} · ${block.kind === 'break' ? 'break' : block.kind}${block.locked ? ' · locked' : ''}`,
    body: html`<form novalidate>
      ${!isTask && block.kind !== 'break' ? html`<div class="field"><label class="label" for="bm-title">Name</label><input class="input" id="bm-title" name="title" value="${block.title}" maxlength="120" /></div>` : ''}
      <div class="form-row">
        <div class="field"><label class="label" for="bm-date">Date</label><input class="input" id="bm-date" name="date" type="date" value="${block.date}" required /></div>
        <div class="field"><label class="label" for="bm-start">Start</label><input class="input" id="bm-start" name="start" type="time" step="300" value="${hm(block.start)}" required /></div>
        <div class="field"><label class="label" for="bm-end">End</label><input class="input" id="bm-end" name="end" type="time" step="300" value="${hm(block.end)}" required /></div>
      </div>
      <label class="check"><input type="checkbox" name="locked" ${block.locked ? raw('checked') : ''} /> <span>Lock this block — re-planning will keep it where it is.</span></label>
      <div class="form-actions">
        <button type="button" class="btn btn-danger" data-delete>${icon('trash')}Remove</button>
        <span class="spacer"></span>
        ${block.status !== 'done' && block.kind !== 'break' ? html`<button type="button" class="btn" data-done>${icon('check')}Mark done</button>` : ''}
        ${block.status !== 'planned' ? html`<button type="button" class="btn" data-planned>Back to planned</button>` : ''}
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`,
    onOpen: (el, close) => {
      const form = /** @type {HTMLFormElement} */ (el.querySelector('form'));
      const patch = async (/** @type {any} */ body, /** @type {string} */ msg) => {
        try {
          await api.patch(`/api/app/schedule/blocks/${block.id}`, body);
          toast(msg);
          close();
          dataChanged();
          onChange();
        } catch (err) {
          showErrors(form, err);
        }
      };
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const d = formData(form);
        const start = parseHm(d.start);
        const end = parseHm(d.end);
        if (start === null || end === null || end <= start) {
          showErrors(form, { code: 'validation_error', details: { fields: { end: 'End must be after start.' } } });
          return;
        }
        patch({ date: d.date, start, end, locked: !!d.locked, ...(d.title ? { title: d.title } : {}) }, 'Block updated');
      });
      el.querySelector('[data-done]')?.addEventListener('click', () => patch({ status: 'done' }, 'Marked as done — nice.'));
      el.querySelector('[data-planned]')?.addEventListener('click', () => patch({ status: 'planned' }, 'Block restored'));
      el.querySelector('[data-delete]')?.addEventListener('click', async () => {
        try {
          await api.del(`/api/app/schedule/blocks/${block.id}`);
          toast('Block removed');
          close();
          dataChanged();
          onChange();
        } catch (err) {
          showErrors(form, err);
        }
      });
    },
  });
}

/**
 * Add a fixed event or a manual task block.
 * @param {string} date
 * @param {() => void} onChange
 */
export async function addBlockModal(date, onChange) {
  const tasks = (await api.get('/api/app/tasks?status=open')).tasks;
  openModal({
    title: 'Add to schedule',
    subtitle: 'Manual blocks are locked: the planner works around them.',
    body: html`<form novalidate>
      <div class="segmented" role="group" aria-label="Block type"><button type="button" aria-pressed="true" data-kind="event">Event / meeting</button><button type="button" aria-pressed="false" data-kind="task">Work on a task</button></div>
      <input type="hidden" name="kind" value="event" />
      <div class="field" data-for="event"><label class="label" for="ab-title">Name</label><input class="input" id="ab-title" name="title" maxlength="120" placeholder="e.g. Client call" autofocus /></div>
      <div class="field" data-for="task" hidden><label class="label" for="ab-task">Task</label><select class="select" id="ab-task" name="taskId">${tasks.map((/** @type {any} */ t) => html`<option value="${t.id}">${t.title}</option>`)}</select></div>
      <div class="form-row">
        <div class="field"><label class="label" for="ab-date">Date</label><input class="input" id="ab-date" name="date" type="date" value="${date}" required /></div>
        <div class="field"><label class="label" for="ab-start">Start</label><input class="input" id="ab-start" name="start" type="time" step="300" value="10:00" required /></div>
        <div class="field"><label class="label" for="ab-end">End</label><input class="input" id="ab-end" name="end" type="time" step="300" value="10:30" required /></div>
      </div>
      <div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" class="btn btn-primary">Add block</button></div>
    </form>`,
    onOpen: (el, close) => {
      const form = /** @type {HTMLFormElement} */ (el.querySelector('form'));
      form.querySelector('.segmented')?.classList.add('field');
      $$('[data-kind]', form).forEach((b) =>
        b.addEventListener('click', () => {
          const kind = b.dataset.kind || 'event';
          /** @type {HTMLInputElement} */ (form.elements.namedItem('kind')).value = kind;
          $$('[data-kind]', form).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          $$('[data-for]', form).forEach((x) => (x.hidden = x.dataset.for !== kind));
        }),
      );
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = formData(form);
        const start = parseHm(d.start);
        const end = parseHm(d.end);
        if (start === null || end === null || end <= start) {
          showErrors(form, { code: 'validation_error', details: { fields: { end: 'End must be after start.' } } });
          return;
        }
        const btn = /** @type {HTMLButtonElement} */ (form.querySelector('[type="submit"]'));
        setLoading(btn, true);
        try {
          await api.post('/api/app/schedule/blocks', {
            date: d.date,
            start,
            end,
            kind: d.kind,
            ...(d.kind === 'task' ? { taskId: Number(d.taskId) } : { title: d.title }),
          });
          toast('Added to schedule');
          close();
          dataChanged();
          onChange();
        } catch (err) {
          showErrors(form, err);
        } finally {
          setLoading(btn, false);
        }
      });
    },
  });
}

/* ---------- Plan results ---------- */
/** @param {any} r response of plan / replan */
export function planSummary(r) {
  const items = [];
  for (const m of r.missed || []) items.push(html`<li><span class="tag is-missed">Missed</span><span><strong>${m.title}</strong> — priority raised</span></li>`);
  for (const c of r.changes || []) {
    if (c.type === 'moved') items.push(html`<li><span class="tag">Moved</span><span><strong>${c.title}</strong> ${hm(c.from)} → ${hm(c.to)}</span></li>`);
    else if (c.type === 'added') items.push(html`<li><span class="tag is-added">Added</span><span><strong>${c.title}</strong> at ${hm(c.to)}</span></li>`);
    else items.push(html`<li><span class="tag is-removed">Out</span><span><strong>${c.title}</strong> no longer fits this day</span></li>`);
  }
  if (r.next?.carried?.length) items.push(html`<li><span class="tag is-rolled">Rolled</span><span>${r.next.carried.join(', ')} → ${fmtDate(r.next.date)}</span></li>`);
  if (r.overflow?.length && !r.next) items.push(html`<li><span class="tag is-rolled">Overflow</span><span>${r.overflow.length} task(s) didn't fit: ${r.overflow.slice(0, 3).map((/** @type {any} */ o) => o.title).join(', ')}</span></li>`);
  if (!items.length) items.push(html`<li><span class="muted">No changes were needed.</span></li>`);
  return html`<ul class="change-list">${items}</ul>`;
}

/** @param {any[]} risks */
export function riskList(risks) {
  if (!risks.length) return html`<div class="empty">${raw('<div class="empty-icon">')}${icon('check')}${raw('</div>')}<p>No deadline risks. Everything due fits your working hours.</p></div>`;
  return html`<div class="risk-list">${risks.map(
    (r) => html`<div class="risk ${r.type === 'overdue' ? 'is-overdue' : ''}">${icon('alert')}<span><strong>${r.title}</strong><br /><span class="muted">${
      r.type === 'overdue' ? `Overdue since ${fmtDate(r.dueDate)}` : `Due ${fmtDate(r.dueDate)} — about ${duration(r.shortByMinutes)} short of free time`
    }</span></span></div>`,
  )}</div>`;
}

/** Plan / re-plan actions with a result dialog. */
export async function runPlan(/** @type {'plan' | 'replan'} */ kind, /** @type {string} */ date, /** @type {() => void} */ onDone, /** @type {HTMLButtonElement | null} */ btn) {
  setLoading(btn, true);
  try {
    const r = kind === 'replan' ? await api.post('/api/app/schedule/replan') : await api.post('/api/app/schedule/plan', { date });
    const n = r.day.blocks.filter((/** @type {any} */ b) => b.kind === 'task' && b.status === 'planned').length;
    openModal({
      title: kind === 'replan' ? 'Day re-planned' : `Plan for ${fmtDate(r.day.date)}`,
      subtitle: r.workDay === false ? 'This is not one of your working days — nothing was scheduled.' : `${n} focus block${n === 1 ? '' : 's'} · ${duration(r.used || 0)} of ${duration(r.capacity || 0)} free time used`,
      body: html`${planSummary(r)}<div class="form-actions"><button class="btn btn-primary" data-close>Got it</button></div>`,
    });
    dataChanged();
    onDone();
  } catch (err) {
    toast(/** @type {Error} */ (err).message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

/** @param {string} today */
export const tomorrowOf = (today) => addDays(today, 1);

/** Plan badge text for the current session. */
export function planLabel() {
  const a = store.session?.access;
  if (!a?.plan) return '';
  return a.endsAt ? `${a.plan.name} · until ${new Date(a.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : a.plan.name;
}

export { esc, mount, $ };
