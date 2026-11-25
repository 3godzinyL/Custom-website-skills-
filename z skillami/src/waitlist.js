import { randomToken, sha256, validEmail, emailKey, linkKey } from './security.js';
import { now, tx } from './db.js';
import { enqueueEmail, cancelPendingEmails, DRIP } from './emails.js';
import { HttpError } from './http.js';

const CONFIRM_TTL = 72 * 3600_000;
export const REFERRAL_BOOST = 5;
// Cap on referrals that move someone up — limits queue farming with catch-all domains. Admin sees the real count.
export const REFERRAL_CAP = 20;
export const SURVEY_OPTIONS = ['kartki', 'aplikacja', 'kalendarz', 'glowa', 'nic'];

export const subKey = (config, id) => linkKey(config.appSecret, 'sub', id);
const refCodeFor = () => randomToken(6).replace(/[-_]/g, 'x').slice(0, 8);

function links(baseUrl, lang, { confirmToken, key, refCode }) {
  const p = lang === 'en' ? '/en' : '';
  return {
    confirmUrl: confirmToken && `${baseUrl}${p}/potwierdz?token=${confirmToken}`,
    queueUrl: key && `${baseUrl}${p}/kolejka?key=${key}`,
    unsubUrl: key && `${baseUrl}/wypisz?key=${key}`,
    refUrl: refCode && `${baseUrl}${p}/?ref=${refCode}`,
  };
}

/**
 * Sign up (or re-send confirmation). Always answers the same way to the caller,
 * so the endpoint can't be used to check whether an address is on the list.
 */
export function signup(db, config, input) {
  const email = String(input.email || '').trim();
  if (!validEmail(email)) throw new HttpError(422, 'invalid_email');
  const lang = input.lang === 'en' ? 'en' : 'pl';
  const key = emailKey(email);
  const t = now();
  const variant = /^[a-c]$/.test(input.variant || '') ? input.variant : null;
  const source = String(input.source || '').slice(0, 40) || null;

  return tx(db, () => {
    const existing = db.prepare('SELECT * FROM subscribers WHERE email_key = ?').get(key);
    const confirmToken = randomToken();
    if (existing) {
      if (existing.status === 'confirmed') {
        // Mail the owner their private link again; the caller learns nothing.
        const l = links(config.baseUrl, existing.lang, { key: subKey(config, existing.id), refCode: existing.ref_code });
        enqueueEmail(db, { to: existing.email, kind: 'welcome', lang: existing.lang, baseUrl: config.baseUrl, subscriberId: existing.id,
          data: { ...l, position: positionOf(db, existing.id) } });
        return { status: 'already' };
      }
      // pending or unsubscribed: fresh confirmation link (rate limited by the route)
      db.prepare(`UPDATE subscribers SET status = 'pending', confirm_token_hash = ?, confirm_expires_at = ?, lang = ?,
        consent_marketing = ?, unsubscribed_at = NULL WHERE id = ?`)
        .run(sha256(confirmToken), t + CONFIRM_TTL, lang, input.consentMarketing === true ? 1 : 0, existing.id);
      enqueueEmail(db, { to: existing.email, kind: 'confirm', lang, baseUrl: config.baseUrl, subscriberId: existing.id,
        data: links(config.baseUrl, lang, { confirmToken }) });
      return { status: 'resent' };
    }
    let referredBy = null;
    if (input.ref && /^[A-Za-z0-9]{4,12}$/.test(input.ref)) {
      referredBy = db.prepare("SELECT id FROM subscribers WHERE ref_code = ? AND status = 'confirmed'").get(input.ref)?.id ?? null;
    }
    const id = db.prepare(`INSERT INTO subscribers(email, email_key, lang, consent_marketing, confirm_token_hash, confirm_expires_at,
      referred_by, variant, source, created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .run(email, key, lang, input.consentMarketing === true ? 1 : 0, sha256(confirmToken), t + CONFIRM_TTL, referredBy, variant, source, t).lastInsertRowid;
    enqueueEmail(db, { to: email, kind: 'confirm', lang, baseUrl: config.baseUrl, subscriberId: id,
      data: links(config.baseUrl, lang, { confirmToken }) });
    return { status: 'created', id: Number(id) };
  });
}

export function confirm(db, config, token) {
  if (!token || typeof token !== 'string' || token.length > 100) return { ok: false, reason: 'invalid' };
  return tx(db, () => {
    const s = db.prepare('SELECT * FROM subscribers WHERE confirm_token_hash = ?').get(sha256(token));
    if (!s) return { ok: false, reason: 'invalid' };
    if (s.confirm_expires_at < now()) return { ok: false, reason: 'expired', email: s.email };
    const key = subKey(config, s.id);
    let refCode = s.ref_code;
    while (!refCode) {
      const c = refCodeFor();
      if (!db.prepare('SELECT 1 FROM subscribers WHERE ref_code = ?').get(c)) refCode = c;
    }
    const t = now();
    db.prepare(`UPDATE subscribers SET status = 'confirmed', confirmed_at = COALESCE(confirmed_at, ?), confirm_token_hash = NULL,
      confirm_expires_at = NULL, private_key_hash = ?, ref_code = ? WHERE id = ?`).run(t, sha256(key), refCode, s.id);
    const position = positionOf(db, s.id);
    const l = links(config.baseUrl, s.lang, { key, refCode });
    enqueueEmail(db, { to: s.email, kind: 'welcome', lang: s.lang, baseUrl: config.baseUrl, subscriberId: s.id,
      data: { ...l, position } });
    if (s.consent_marketing) {
      for (const d of DRIP) enqueueEmail(db, { to: s.email, kind: d.kind, lang: s.lang, baseUrl: config.baseUrl, subscriberId: s.id, delayMs: d.delay, data: l });
    }
    return { ok: true, key, position, refCode, lang: s.lang };
  });
}

/** Position: order of confirmation minus REFERRAL_BOOST per confirmed referral (ties: the referrer passes the person they caught up with). */
const POSITIONS = `
    WITH refs AS (SELECT referred_by AS id, COUNT(*) n FROM subscribers WHERE status = 'confirmed' AND referred_by IS NOT NULL GROUP BY referred_by),
    c AS (
      SELECT s.id, ROW_NUMBER() OVER (ORDER BY s.confirmed_at, s.id) AS seq, MIN(COALESCE(refs.n, 0), ${REFERRAL_CAP}) AS refs
      FROM subscribers s LEFT JOIN refs ON refs.id = s.id WHERE s.status = 'confirmed'
    ), r AS (SELECT id, ROW_NUMBER() OVER (ORDER BY seq - ${REFERRAL_BOOST} * refs, refs DESC, seq) AS pos FROM c)`;

export function positionOf(db, id) {
  const row = db.prepare(`${POSITIONS} SELECT pos FROM r WHERE id = ?`).get(id);
  return row ? Number(row.pos) : null;
}

/** All positions in one pass (admin lists) instead of one query per row. */
export function positionsMap(db) {
  return new Map(db.prepare(`${POSITIONS} SELECT id, pos FROM r`).all().map((x) => [x.id, Number(x.pos)]));
}

export function byKey(db, key) {
  if (!key || typeof key !== 'string' || key.length > 100) return null;
  return db.prepare('SELECT * FROM subscribers WHERE private_key_hash = ?').get(sha256(key)) || null;
}

export function me(db, config, key) {
  const s = byKey(db, key);
  if (!s || s.status !== 'confirmed') return null;
  const referrals = db.prepare("SELECT COUNT(*) n FROM subscribers WHERE referred_by = ? AND status = 'confirmed'").get(s.id).n;
  const total = db.prepare("SELECT COUNT(*) n FROM subscribers WHERE status = 'confirmed'").get().n;
  return {
    position: positionOf(db, s.id), total, referrals, boost: REFERRAL_BOOST,
    refUrl: links(config.baseUrl, s.lang, { refCode: s.ref_code }).refUrl,
    surveyAnswered: !!s.survey_answer, lang: s.lang,
  };
}

export function saveSurvey(db, key, answer) {
  if (!SURVEY_OPTIONS.includes(answer)) throw new HttpError(422, 'invalid_answer');
  const s = byKey(db, key);
  if (!s) throw new HttpError(404, 'not_found');
  db.prepare('UPDATE subscribers SET survey_answer = ? WHERE id = ?').run(answer, s.id);
  return { ok: true };
}

export function unsubscribe(db, key) {
  const s = byKey(db, key);
  if (!s) return false;
  db.prepare("UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ?, consent_marketing = 0 WHERE id = ?").run(now(), s.id);
  cancelPendingEmails(db, s.id);
  return true;
}

/** Public counter: only above the threshold, rounded down to tens (no fake precision). */
export function publicStats(db, config) {
  const n = db.prepare("SELECT COUNT(*) n FROM subscribers WHERE status = 'confirmed'").get().n;
  return { count: n >= config.publicCountThreshold ? Math.floor(n / 10) * 10 : null };
}
