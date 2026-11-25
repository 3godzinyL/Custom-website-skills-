import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from '../lib/rateLimit.js';
import { addDays, isValidTimeZone, zonedParts } from '../lib/time.js';
import { parse, v } from '../lib/validate.js';
import { HttpError } from '../lib/errors.js';
import { extractTasks } from '../services/ai/demo.js';
import { listPlans } from '../services/plans.js';
import { checkFormToken, confirmWaitlist, issueFormToken, joinWaitlist } from '../services/waitlist.js';

/** @param {import('../app.js').Deps} deps */
export function publicRoutes(deps) {
  const { db, config, mailer, logger } = deps;
  const r = Router();
  const disabled = config.rateLimits.disabled;

  r.get('/health', (_req, res) => {
    db.get('SELECT 1 AS ok');
    res.json({ ok: true, ai: deps.ai.status().mode });
  });

  // Public plan catalogue for the pricing section (limits are admin-managed).
  r.get('/plans', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
      plans: listPlans(db)
        .filter((p) => p.is_active)
        .map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          priceCents: p.price_cents,
          currency: p.currency,
          interval: p.billing_interval,
          limits: { projects: p.max_projects, openTasks: p.max_open_tasks, aiDaily: p.ai_daily_limit, analyticsDays: p.analytics_days },
          features: p.features,
        })),
    });
  });

  // ---------- Waitlist ----------
  r.get('/waitlist/token', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ token: issueFormToken(config.secret) });
  });

  const joinLimit = rateLimit({ windowMs: 3600000, max: 5, disabled, message: 'Too many sign-ups from this network. Please try again later.' });
  const joinSchema = z.object({
    email: v.email(),
    acceptPrivacy: z.literal(true, { errorMap: () => ({ message: 'Please confirm you have read the Privacy Policy.' }) }),
    marketing: z.boolean().optional().default(false),
    token: z.string().max(200),
    website: z.string().max(200).optional().default(''), // honeypot: must stay empty
    source: z.string().max(40).regex(/^[a-z0-9_-]*$/i).optional().default('landing'),
  });
  const OK = { ok: true, message: "You're on the list. Check your inbox to confirm your address." };

  r.post('/waitlist', joinLimit, async (req, res) => {
    const body = parse(joinSchema, req.body);
    // Bots: respond exactly like a success so they learn nothing.
    if (body.website) {
      logger.info('waitlist honeypot triggered');
      return res.status(202).json(OK);
    }
    const tokenState = checkFormToken(config.secret, body.token);
    if (tokenState !== 'ok') {
      throw new HttpError(400, 'form_token', tokenState === 'too_fast' ? 'That was quick! Please try again in a moment.' : 'The form expired. Reload the page and try again.');
    }
    const out = joinWaitlist(db, { email: body.email, marketing: body.marketing, source: body.source });
    if (out.created && out.confirmToken) {
      await mailer.waitlistConfirm(body.email, `${config.baseUrl}/waitlist/confirm?token=${encodeURIComponent(out.confirmToken)}`);
    }
    res.status(202).json(OK);
  });

  r.post('/waitlist/confirm', rateLimit({ windowMs: 3600000, max: 30, disabled }), (req, res) => {
    const { token } = parse(z.object({ token: z.string().min(10).max(100) }), req.body);
    res.json({ ok: confirmWaitlist(db, token) });
  });

  // ---------- Landing page live demo ----------
  // Runs only the rule-based parser (no model, nothing stored) so visitors can
  // see how a sentence becomes tasks. Clearly labelled as demo on the page.
  const demoLimit = rateLimit({ windowMs: 60000, max: 20, disabled, message: 'Easy there — try again in a minute.' });
  r.post('/demo/parse', demoLimit, (req, res) => {
    const b = parse(z.object({ text: v.text(400, 3), timezone: z.string().max(64).optional() }), req.body);
    const tz = b.timezone && isValidTimeZone(b.timezone) ? b.timezone : 'UTC';
    const today = zonedParts(Date.now(), tz).date;
    const tasks = extractTasks(b.text, today).slice(0, 8);
    res.json({ mode: 'demo', today, tomorrow: addDays(today, 1), tasks });
  });

  return r;
}
