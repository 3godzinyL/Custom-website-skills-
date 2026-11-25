import { addDays, fmtMinutes, weekdayOf } from '../../lib/time.js';
import { fmtDuration } from './actions.js';

/**
 * DEMO MODE — a deterministic, rule-based interpreter used when no AI provider
 * is configured. It understands a useful subset of English and Polish and
 * produces the same structured actions as the live model. Responses are always
 * labelled as demo output in the API and UI; it never pretends to be a model.
 */

/** @param {string} s */
const fold = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');

const PL_HINT = /[ąćęłńóśźż]|\b(musze|muszę|zaplanuj|jutro|dzisiaj|dzis|zadani|projekt\w|przeorganizuj|podziel|skonczy|zrobi|oferte|ofert|piatku|powinienem|czy|mnie|mam)\b/i;

const WEEKDAYS = [
  { n: 0, re: /\b(niedziel\w*|sunday|sun)\b/ },
  { n: 1, re: /\b(poniedzial\w*|monday|mon)\b/ },
  { n: 2, re: /\b(wtor\w*|tuesday|tue)\b/ },
  { n: 3, re: /\b(srod\w*|wednesday|wed)\b/ },
  { n: 4, re: /\b(czwart\w*|thursday|thu)\b/ },
  { n: 5, re: /\b(piat\w*|friday|fri)\b/ },
  { n: 6, re: /\b(sobot\w*|saturday|sat)\b/ },
];

/**
 * Finds a date expression in folded text. Returns the date and the matched
 * phrase (so it can be removed from a task title).
 * @param {string} f folded text
 * @param {string} today
 * @returns {{ date: string, phrase: RegExp } | null}
 */
export function detectDate(f, today) {
  const wd = weekdayOf(today);
  /** @type {[RegExp, () => string][]} */
  const rules = [
    [/\b(pojutrze|day after tomorrow)\b/, () => addDays(today, 2)],
    [/\b(na |do |by |until |before )?(jutra|jutro|jutrzejsz\w*|tomorrow('?s)?)\b/, () => addDays(today, 1)],
    [/\b(na |do |by |until |before )?(dzis|dzisiaj|dzisiejsz\w*|today('?s)?|tonight|wieczorem)\b/, () => today],
    [/\b(do |by |before |until )?(konca tygodnia|end of (the )?week|this week|w tym tygodniu)\b/, () => addDays(today, (5 - wd + 7) % 7)],
    [/\b(next week|w przyszlym tygodniu|przyszly tydzien)\b/, () => addDays(today, ((1 - wd + 7) % 7 || 7) + 4)],
    [/\b(za|in) (\d{1,2}) (dni|dnia|days?)\b/, () => addDays(today, Number(/(\d{1,2})/.exec(f.match(/\b(za|in) (\d{1,2}) (dni|dnia|days?)\b/)?.[0] ?? '1')?.[1] ?? 1))],
  ];
  for (const [re, fn] of rules) if (re.test(f)) return { date: fn(), phrase: re };

  const iso = /\b(?:do |by |on |na )?(\d{4})-(\d{2})-(\d{2})\b/.exec(f);
  if (iso) return { date: `${iso[1]}-${iso[2]}-${iso[3]}`, phrase: /\b(?:do |by |on |na )?\d{4}-\d{2}-\d{2}\b/ };
  const dm = /\b(?:do |by |on |na )?(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/.exec(f);
  if (dm) {
    const day = Number(dm[1]);
    const month = Number(dm[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      let year = dm[3] ? Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]) : Number(today.slice(0, 4));
      let date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!dm[3] && date < today) date = `${++year}${date.slice(4)}`;
      return { date, phrase: /\b(?:do |by |on |na )?\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?\b/ };
    }
  }
  for (const d of WEEKDAYS) {
    if (d.re.test(f)) {
      const next = /\b(next|przyszl\w*)\b/.test(f);
      let ahead = (d.n - wd + 7) % 7;
      if (next && ahead === 0) ahead = 7;
      const phrase = new RegExp(`\\b(?:(?:do|na|w|we|by|on|until|before|next|przyszl\\w*)\\s+)*${d.re.source.slice(2, -2)}\\b`);
      return { date: addDays(today, ahead), phrase };
    }
  }
  return null;
}

const ESTIMATES = [
  { re: /(stron\w* (internetow|www)|website|landing|web ?site|sklep internetowy|online store|aplikacj|\bapp\b)/, min: 480, big: true, kind: 'website' },
  { re: /(ofert|proposal|\boffer|quote|wycen)/, min: 120, kind: 'proposal' },
  { re: /(prezentacj|presentation|\bdeck\b|slajd|slides)/, min: 120, kind: 'presentation' },
  { re: /(przeanaliz|analiz|analy[sz]|raport|report|wynik|results|metrics|statystyk)/, min: 90, kind: 'analysis' },
  { re: /(napisa|write|artykul|article|blog|post|copy|tekst)/, min: 90, kind: 'writing' },
  { re: /(design|makiet|mockup|grafik|logo)/, min: 120, kind: 'design' },
  { re: /(mail|e-mail|odpisa|reply|wiadomosc|message|slack)/, min: 15, kind: 'comms' },
  { re: /(zadzwon|telefon|\bcall\b|spotkani|meeting|sync)/, min: 30, kind: 'meeting' },
  { re: /(faktur|invoice|rachun|platnosc|\bpay\b|przelew)/, min: 20, kind: 'admin' },
  { re: /(nauczy|learn|kurs|course|study|przeczyta|read)/, min: 60, kind: 'learning' },
];

/** @param {string} f */
function estimateFor(f) {
  const h = /(\d+(?:[.,]\d+)?)\s?(h|godz\w*|hours?|hrs?)\b/.exec(f);
  if (h) return { min: Math.min(600, Math.round(Number(h[1].replace(',', '.')) * 60)), big: false, kind: 'explicit' };
  const m = /(\d+)\s?(min\w*)\b/.exec(f);
  if (m) return { min: Math.min(600, Math.max(5, Number(m[1]))), big: false, kind: 'explicit' };
  const hit = ESTIMATES.find((e) => e.re.test(f));
  return hit ? { min: hit.min, big: !!hit.big, kind: hit.kind } : { min: 45, big: false, kind: 'generic' };
}

/** @param {string} f @param {string | null} due @param {string} today */
function priorityFor(f, due, today) {
  if (/(pilne|pilnie|asap|urgent|natychmiast|krytyczn|critical|na wczoraj)/.test(f)) return 1;
  if (/(wazne|important|high priority|priorytet)/.test(f)) return 2;
  if (/(kiedys|someday|low priority|przy okazji|if time)/.test(f)) return 4;
  if (due && due <= addDays(today, 2)) return 2;
  return 3;
}

const FILLER = [
  /^(a |and |then |i |oraz |potem |a potem |also |plus )/,
  /^(ja |i )?(musze|muszę|trzeba|mam|chce|chcę|powinienem|powinnam|i need to|i have to|i must|i should|need to|have to|please|prosze|proszę|remind me to|przypomnij mi|dodaj zadanie|add (a )?task:?|add)\s+/i,
];

/**
 * Splits a free-form sentence into candidate tasks.
 * @param {string} message
 * @param {string} today
 */
export function extractTasks(message, today) {
  const cleaned = message
    .replace(/^(hej|hey|hi|cześć|czesc)[,!]?\s*/i, '')
    .replace(/[“”"]/g, '');
  const parts = cleaned
    .split(/\n|;|,|\.\s+|\s+(?:oraz|i|and|then|a potem|a także|plus)\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const tasks = [];
  for (let raw of parts) {
    let title = raw;
    for (const re of FILLER) title = title.replace(re, '');
    // Strip the same filler in folded form (handles missing diacritics).
    title = title.replace(/^(musze|trzeba|mam|chce)\s+/i, '');
    const f = fold(title);
    const due = detectDate(f, today);
    const est = estimateFor(f);
    if (due) {
      // Remove the date phrase from the title using folded indices.
      const m = due.phrase.exec(f);
      if (m) title = (title.slice(0, m.index) + title.slice(m.index + m[0].length)).trim();
    }
    title = title
      .replace(/\b(pilne|pilnie|asap|urgent|wazne|ważne|important)\b/gi, '')
      .replace(/\(?\b\d+(?:[.,]\d+)?\s?(h|godz\w*|hours?|hrs?|min\w*)\b\)?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s\-–:]+|[\s\-–:.!?]+$/g, '');
    if (title.length < 3 || /^(to|i|a|and|the|zrobic|do)$/i.test(title)) continue;
    title = title.charAt(0).toUpperCase() + title.slice(1);
    raw = raw.trim();
    tasks.push({
      title: title.slice(0, 120),
      dueDate: due?.date ?? null,
      priority: priorityFor(f, due?.date ?? null, today),
      estimateMinutes: est.min,
      big: est.big,
      kind: est.kind,
    });
  }
  return tasks;
}

const BREAKDOWNS = {
  website: [
    ['Brief, goals and audience', 'Brief, cele i grupa docelowa', 60],
    ['Sitemap and content plan', 'Mapa strony i plan treści', 60],
    ['Wireframes of key pages', 'Makiety kluczowych podstron', 90],
    ['Visual design', 'Projekt graficzny', 120],
    ['Build and connect pages', 'Wdrożenie podstron', 180],
    ['Copy, SEO and analytics', 'Teksty, SEO i analityka', 60],
    ['QA, fixes and launch', 'Testy, poprawki i publikacja', 60],
  ],
  proposal: [
    ['Collect client requirements', 'Zebrać wymagania klienta', 30],
    ['Define scope and pricing', 'Ustalić zakres i wycenę', 60],
    ['Write the proposal draft', 'Napisać szkic oferty', 90],
    ['Review and polish', 'Przejrzeć i dopracować', 30],
    ['Send and schedule follow-up', 'Wysłać i zaplanować follow-up', 15],
  ],
  analysis: [
    ['Collect the data', 'Zebrać dane', 45],
    ['Clean and organise', 'Uporządkować dane', 45],
    ['Analyse key metrics', 'Przeanalizować kluczowe wskaźniki', 60],
    ['Write up findings', 'Spisać wnioski', 60],
    ['Share the summary', 'Udostępnić podsumowanie', 20],
  ],
  presentation: [
    ['Outline the story', 'Ułożyć konspekt', 30],
    ['Draft the slides', 'Przygotować slajdy', 90],
    ['Add visuals and data', 'Dodać wizualizacje i dane', 60],
    ['Rehearse', 'Przećwiczyć wystąpienie', 30],
  ],
  generic: [
    ['Define scope and "done"', 'Określić zakres i kryterium ukończenia', 30],
    ['Gather inputs and research', 'Zebrać materiały', 45],
    ['First draft / first pass', 'Pierwsza wersja', 90],
    ['Review and refine', 'Przegląd i poprawki', 45],
    ['Finish and deliver', 'Domknąć i oddać', 30],
  ],
};

/** @param {string} kind */
const breakdownFor = (kind) => BREAKDOWNS[/** @type {keyof typeof BREAKDOWNS} */ (kind)] ?? BREAKDOWNS.generic;

/** Token-overlap similarity used to find the task/project a user refers to. */
function bestMatch(text, items) {
  const words = new Set(fold(text).split(/[^a-z0-9]+/).filter((w) => w.length > 2));
  let best = null;
  let bestScore = 0;
  for (const it of items) {
    const iw = fold(it.title ?? it.name).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    if (!iw.length) continue;
    const hits = iw.filter((w) => words.has(w) || [...words].some((x) => x.length > 4 && (x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5))))).length;
    const score = hits / iw.length;
    if (score > bestScore) {
      bestScore = score;
      best = it;
    }
  }
  return bestScore >= 0.34 ? best : null;
}

/**
 * @param {string} message
 * @param {any} ctx context built by the AI service
 * @returns {{ intent: string, reply: string, actions: object[] }}
 */
export function interpretDemo(message, ctx) {
  const f = fold(message);
  const pl = PL_HINT.test(message);
  const T = (/** @type {string} */ en, /** @type {string} */ plText) => (pl ? plText : en);
  const today = ctx.today;

  // 1. Re-plan after slipping.
  if (/(przeorganizuj|przebuduj|przeplanuj|replan|re-plan|reorgani[sz]e|reshuffle|nie zdazyl|didn'?t (finish|manage|get to|make it)|behind( schedule)?|running late|fell behind|missed|spozni|zaleglosc)/.test(f)) {
    return {
      intent: 'replan',
      reply: T(
        `Understood — I'll rebuild the rest of today from ${fmtMinutes(ctx.nowMinutes)}. Unfinished blocks from earlier get marked as missed and move up in priority; anything that no longer fits rolls over to ${ctx.nextWorkDay}.`,
        `Jasne — przebuduję resztę dnia od ${fmtMinutes(ctx.nowMinutes)}. Niewykonane wcześniejsze bloki oznaczę jako pominięte i podniosę ich priorytet; to, co się nie zmieści, przeniosę na ${ctx.nextWorkDay}.`,
      ),
      actions: [{ type: 'replan_today' }],
    };
  }

  // 2. Breakdown of a project or task.
  if (/(podziel|rozbij|rozpisz|break (it |this |that )?down|breakdown|split|subtasks|podzadani|smaller tasks|mniejsze zadania|kroki|steps)/.test(f)) {
    const project = bestMatch(message, ctx.projects);
    const task = project ? null : bestMatch(message, ctx.tasks);
    const subject = project?.name ?? task?.title ?? message.replace(/^.*?(podziel|rozbij|rozpisz|break down|split)\s*/i, '').replace(/(na (mniejsze )?(zadania|kroki)|into (smaller )?(tasks|steps)|projekt|project|ten|this|the)\s*/gi, '').trim();
    const kind = estimateFor(fold(subject || message)).kind;
    const steps = breakdownFor(kind);
    const due = project?.dueDate ?? task?.dueDate ?? null;
    /** @type {object[]} */
    const actions = [];
    let projectTarget = {};
    if (project) projectTarget = { projectId: project.id };
    else if (task?.projectId) projectTarget = { projectId: task.projectId };
    else {
      const name = (subject || T('New project', 'Nowy projekt')).replace(/^./, (c) => c.toUpperCase()).slice(0, 100);
      actions.push({ type: 'create_project', ref: 'p1', name, dueDate: due });
      projectTarget = { projectRef: 'p1' };
    }
    steps.forEach(([en, plTitle, min], i) => {
      const stepDue = due ? addDays(due, -(steps.length - 1 - i)) : null;
      actions.push({
        type: 'create_task',
        title: pl ? plTitle : en,
        estimateMinutes: min,
        priority: i === 0 ? 2 : 3,
        dueDate: stepDue && stepDue >= today ? stepDue : due,
        ...projectTarget,
      });
    });
    if (task) actions.push({ type: 'delete_task', taskId: task.id });
    const total = steps.reduce((s, x) => s + Number(x[2]), 0);
    return {
      intent: 'breakdown',
      reply: T(
        `Here's a breakdown of “${project?.name ?? task?.title ?? subject}” into ${steps.length} steps (~${fmtDuration(total)} in total).${due ? ' Step deadlines are spread backwards from the due date.' : ''}${task ? ' The original task can be removed once the steps exist — untick that action if you want to keep it.' : ''}`,
        `Rozbiłem „${project?.name ?? task?.title ?? subject}” na ${steps.length} kroków (łącznie ~${fmtDuration(total)}).${due ? ' Terminy kroków rozłożyłem wstecz od terminu końcowego.' : ''}${task ? ' Pierwotne zadanie można usunąć — odznacz tę akcję, jeśli chcesz je zostawić.' : ''}`,
      ),
      actions,
    };
  }

  // 3. Mark something as done.
  if (/(skonczyl|zrobil|ukonczyl|zakonczyl|done with|finished|completed|mark .* (as )?done|oznacz .* (jako )?(zrobione|gotowe))/.test(f)) {
    const task = bestMatch(message, ctx.tasks);
    if (task) {
      return {
        intent: 'complete',
        reply: T(`Nice work. I'll mark “${task.title}” as done and free up its remaining blocks.`, `Świetnie. Oznaczę „${task.title}” jako ukończone i zwolnię jego pozostałe bloki.`),
        actions: [{ type: 'complete_task', taskId: task.id }],
      };
    }
  }

  // 4. Plan a day (unless the message also lists several new tasks).
  const PLAN_RE = /^(.*?)(zaplanuj|rozplanuj|uloz|plan|schedule|organi[sz]e)( mi| me| my| out| the)*( (jutrzejszy|dzisiejszy|today'?s|tomorrow'?s|jutro|dzis|dzisiaj|today|tomorrow))?( (dzien|day|plan|schedule))?[:\s-]*/;
  const planWords = /\b(zaplanuj|rozplanuj|uloz mi|plan (my|me|the|out|today|tomorrow)|schedule (my|the|today|tomorrow)|organi[sz]e my)\b/.test(f);
  const listed = planWords ? extractTasks(message.slice((PLAN_RE.exec(f)?.[0] ?? '').length), today) : [];
  if (planWords && listed.length < 2) {
    const d = detectDate(f, today);
    const date = d && d.date >= today ? d.date : today;
    const open = ctx.tasks.length;
    if (!open) {
      return {
        intent: 'plan',
        reply: T('Your task list is empty, so there is nothing to schedule yet. Tell me what you need to get done and I will turn it into tasks.', 'Lista zadań jest pusta, więc nie ma czego planować. Napisz, co masz do zrobienia, a zamienię to na zadania.'),
        actions: [],
      };
    }
    return {
      intent: 'plan',
      reply: T(
        `I'll build a schedule for ${date === today ? 'today' : date} from your ${open} open tasks — ranked by priority, deadline pressure and anything that slipped before, with ${ctx.bufferMinutes}-minute buffers between blocks.`,
        `Ułożę plan na ${date === today ? 'dziś' : date} z ${open} otwartych zadań — według priorytetu, presji terminów i tego, co już wcześniej się przesunęło, z ${ctx.bufferMinutes}-minutowymi buforami między blokami.`,
      ),
      actions: [{ type: 'plan_day', date }],
    };
  }

  // 5. What to do first.
  if (/(co powinienem|co powinnam|od czego zacz|co najpierw|what should i|where (do|should) i start|what('?s| is) (next|most important)|prioryt|priorit|najwazniejsz|first)/.test(f)) {
    const top = ctx.priorities.slice(0, 3);
    if (!top.length) {
      return { intent: 'prioritize', reply: T('You have no open tasks — a rare clean slate.', 'Nie masz otwartych zadań — rzadki czysty start.'), actions: [] };
    }
    const why = (/** @type {any} */ t) => {
      const bits = [];
      if (t.dueDate && t.dueDate < today) bits.push(T('overdue', 'po terminie'));
      else if (t.dueDate === today) bits.push(T('due today', 'termin dziś'));
      else if (t.dueDate) bits.push(T(`due ${t.dueDate}`, `termin ${t.dueDate}`));
      if (t.priority <= 2) bits.push(T(t.priority === 1 ? 'urgent' : 'high priority', t.priority === 1 ? 'pilne' : 'wysoki priorytet'));
      if (t.missedCount) bits.push(T(`slipped ${t.missedCount}×`, `przesunięte ${t.missedCount}×`));
      bits.push(`~${fmtDuration(t.remaining)}`);
      return bits.join(', ');
    };
    const lines = top.map((t, i) => `${i + 1}. ${t.title} — ${why(t)}`).join('\n');
    return {
      intent: 'prioritize',
      reply: T(`Start with these, in order:\n${lines}\n\nAsk me to “plan my day” and I'll put them on the timeline.`, `Zacznij od tych, w tej kolejności:\n${lines}\n\nNapisz „zaplanuj mi dzień”, a ułożę je na osi czasu.`),
      actions: [],
    };
  }

  // 6. Summary.
  if (/(podsumuj|podsumowanie|summary|summari[sz]e|how did i do|jak mi poszlo|recap|status)/.test(f)) {
    const s = ctx.stats;
    const risks = ctx.risks.slice(0, 3).map((r) => `• ${r.title} (${r.type === 'overdue' ? T('overdue', 'po terminie') : T(`at risk, due ${r.dueDate}`, `zagrożone, termin ${r.dueDate}`)})`).join('\n');
    return {
      intent: 'summary',
      reply: T(
        `Today: ${s.doneToday} task(s) completed, ${s.focusToday} min of focused work logged, ${s.plannedLeft} block(s) still planned. ${ctx.tasks.length} open task(s) overall.${risks ? `\n\nWatch out for:\n${risks}` : '\n\nNo deadline risks detected.'}`,
        `Dziś: ukończone zadania: ${s.doneToday}, zarejestrowana praca: ${s.focusToday} min, zaplanowane bloki do końca dnia: ${s.plannedLeft}. Otwartych zadań łącznie: ${ctx.tasks.length}.${risks ? `\n\nUważaj na:\n${risks}` : '\n\nBrak zagrożonych terminów.'}`,
      ),
      actions: [],
    };
  }

  // 7. Free-form → tasks (+ a plan for today when there's time left).
  const found = listed.length ? listed : extractTasks(message, today);
  if (found.length) {
    /** @type {object[]} */
    const actions = found.map((t) => ({ type: 'create_task', title: t.title, dueDate: t.dueDate, priority: t.priority, estimateMinutes: Math.min(t.estimateMinutes, 600) }));
    const requested = listed.length ? detectDate(fold(PLAN_RE.exec(f)?.[0] ?? ''), today) : null;
    const planDate = requested && requested.date >= today
      ? requested.date
      : ctx.isWorkDayToday && ctx.nowMinutes < ctx.workEnd - 30 ? today : ctx.nextWorkDay;
    actions.push({ type: 'plan_day', date: planDate });
    const big = found.filter((t) => t.big);
    const lines = found
      .map((t) => `• ${t.title} — ${['', T('urgent', 'pilne'), T('high', 'wysoki'), T('medium', 'średni'), T('low', 'niski')][t.priority]}, ~${fmtDuration(t.estimateMinutes)}${t.dueDate ? `, ${T('due', 'termin')} ${t.dueDate}` : ''}`)
      .join('\n');
    return {
      intent: 'create',
      reply: T(
        `I found ${found.length} task${found.length === 1 ? '' : 's'}:\n${lines}\n\nAfter adding them I'll schedule ${planDate === today ? 'the rest of today' : planDate}.${big.length ? `\n\n“${big[0].title}” is a big one — ask me to break it down into steps.` : ''}`,
        `Rozpoznałem zadania (${found.length}):\n${lines}\n\nPo dodaniu ułożę plan na ${planDate === today ? 'resztę dnia' : planDate}.${big.length ? `\n\n„${big[0].title}” to duże zadanie — poproś, żebym rozbił je na kroki.` : ''}`,
      ),
      actions,
    };
  }

  return {
    intent: 'help',
    reply: T(
      'I can turn a sentence into tasks, plan a day, re-plan when you fall behind, break projects into steps and tell you what to do first. Try: “Plan my day tomorrow” or “I need to send the invoice and prepare slides by Friday”.',
      'Potrafię zamienić zdanie w zadania, zaplanować dzień, przebudować plan, gdy coś się przesunie, rozbić projekt na kroki i podpowiedzieć, od czego zacząć. Spróbuj: „Zaplanuj mi jutrzejszy dzień” albo „Muszę wysłać fakturę i przygotować slajdy do piątku”.',
    ),
    actions: [],
  };
}
