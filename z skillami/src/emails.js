import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml as e, linkKey } from './security.js';
import { now } from './db.js';

const DAY = 86_400_000;

const T = {
  pl: {
    confirm: (d) => ({
      subject: 'Potwierdź zapis na betę Ogarnij',
      lines: ['Cześć!', 'Ktoś (mamy nadzieję, że Ty) zapisał ten adres na listę oczekujących Ogarnij.',
        'Kliknij, żeby potwierdzić i dostać swoje miejsce w kolejce:'],
      cta: ['Potwierdzam zapis', d.confirmUrl],
      after: ['Link działa 72 godziny. Jeśli to nie Ty — zignoruj tę wiadomość, nic więcej nie wyślemy.'],
    }),
    welcome: (d) => ({
      subject: `Jesteś na liście — miejsce ${d.position}`,
      lines: [`Gotowe. Twoje miejsce w kolejce: ${d.position}.`,
        'Każda osoba, która potwierdzi zapis z Twojego linku, przesuwa Cię o 5 miejsc w górę:', d.refUrl],
      cta: ['Zobacz swoje miejsce', d.queueUrl],
      after: ['Napiszemy, kiedy ruszy beta. Bez spamu.'],
    }),
    drip3: () => ({
      subject: 'Jak działa Plan B (2 minuty czytania)',
      lines: ['Najczęstsze pytanie z listy: „co, jeśli dzień się posypie?”',
        'Ogarnij przelicza resztę dnia, zostawia w miejscu sprawy o stałej godzinie i mówi wprost, co się nie zmieści. Ty decydujesz: przenieść, skrócić czy odpuścić.'],
      cta: ['Przeczytaj w poradniku', '{base}/poradnik/plan-b-kiedy-dzien-sie-sypie'],
      after: [],
    }),
    drip7: (d) => ({
      subject: 'Znasz kogoś, komu plan rozsypuje się do południa?',
      lines: ['Polecenia skracają kolejkę: każde potwierdzone to 5 miejsc w górę.', `Twój link: ${d.refUrl}`],
      cta: ['Sprawdź swoje miejsce', d.queueUrl],
      after: [],
    }),
    order_created: (d) => ({
      subject: `Zamówienie ${d.orderId} — czeka na płatność`,
      lines: [`Pakiet założycielski Ogarnij Plus · ${d.amount}.`, 'Jeśli płatność nie przeszła, możesz ją dokończyć z tej strony:'],
      cta: ['Status zamówienia', d.orderUrl],
      after: ['Masz 14 dni na odstąpienie od umowy bez podania przyczyny — szczegóły w regulaminie przedsprzedaży.'],
    }),
    order_paid: (d) => ({
      subject: `Dziękujemy! Zamówienie ${d.orderId} opłacone`,
      lines: [`Płatność ${d.amount} przyjęta.`, 'Pakiet aktywujemy na Twoim koncie w dniu startu bety. Potwierdzenie do druku znajdziesz pod linkiem.'],
      cta: ['Potwierdzenie zamówienia', d.orderUrl],
      after: ['Możesz odstąpić od umowy w ciągu 14 dni — odpisz na tę wiadomość.'],
    }),
    order_refunded: (d) => ({
      subject: `Zwrot za zamówienie ${d.orderId}`,
      lines: [`Zwróciliśmy ${d.amount}. Pieniądze wrócą tą samą metodą płatności w ciągu kilku dni roboczych.`],
      cta: ['Status zamówienia', d.orderUrl],
      after: [],
    }),
    footer: 'Ogarnij · projekt fikcyjny — strona demonstracyjna.',
    unsub: 'Wypisz mnie',
  },
  en: {
    confirm: (d) => ({
      subject: 'Confirm your spot on the Ogarnij beta',
      lines: ['Hi!', 'Someone (hopefully you) added this address to the Ogarnij waitlist.', 'Click to confirm and get your place in the queue:'],
      cta: ['Confirm my signup', d.confirmUrl],
      after: ['The link works for 72 hours. If this wasn’t you, ignore this e-mail and we won’t write again.'],
    }),
    welcome: (d) => ({
      subject: `You’re on the list — spot ${d.position}`,
      lines: [`Done. Your place in the queue: ${d.position}.`, 'Everyone who confirms from your link moves you up 5 spots:', d.refUrl],
      cta: ['See your spot', d.queueUrl],
      after: ['We’ll write when the beta starts. No spam.'],
    }),
    drip3: () => ({
      subject: 'How Plan B works (2-minute read)',
      lines: ['The most common question: “what if my day falls apart?”',
        'Ogarnij recalculates the rest of the day, keeps fixed-time things in place and tells you plainly what won’t fit. You decide: move, shorten or drop.'],
      cta: ['Read more', '{base}/en/'],
      after: [],
    }),
    drip7: (d) => ({
      subject: 'Know someone whose plan falls apart by noon?',
      lines: ['Referrals shorten the queue: each confirmed one moves you up 5 spots.', `Your link: ${d.refUrl}`],
      cta: ['Check your spot', d.queueUrl],
      after: [],
    }),
    order_created: (d) => ({
      subject: `Order ${d.orderId} — awaiting payment`,
      lines: [`Ogarnij Plus founder pack · ${d.amount}.`, 'If the payment didn’t go through, you can finish it here:'],
      cta: ['Order status', d.orderUrl],
      after: ['You can withdraw within 14 days without giving a reason — see the pre-sale terms.'],
    }),
    order_paid: (d) => ({
      subject: `Thank you! Order ${d.orderId} paid`,
      lines: [`Payment of ${d.amount} received.`, 'We’ll activate the pack on your account when the beta starts.'],
      cta: ['Order confirmation', d.orderUrl],
      after: ['You can withdraw within 14 days — just reply to this e-mail.'],
    }),
    order_refunded: (d) => ({
      subject: `Refund for order ${d.orderId}`,
      lines: [`We refunded ${d.amount}. It will reach your payment method within a few business days.`],
      cta: ['Order status', d.orderUrl],
      after: [],
    }),
    footer: 'Ogarnij · fictional project — demo website.',
    unsub: 'Unsubscribe',
  },
};

export function renderEmail(kind, lang, data, baseUrl) {
  const L = T[lang] || T.pl;
  const t = L[kind](data);
  const fix = (s) => String(s).replaceAll('{base}', baseUrl);
  const [ctaLabel, ctaUrl] = t.cta;
  const unsub = data.unsubUrl ? `<p style="margin:24px 0 0;font-size:12px;color:#6b6873"><a href="${e(fix(data.unsubUrl))}" style="color:#6b6873">${e(L.unsub)}</a></p>` : '';
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#18171c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px" cellpadding="0" cellspacing="0"><tr><td style="padding:32px">
<p style="margin:0 0 24px;font-weight:bold;font-size:20px">Ogarnij</p>
${t.lines.map((l) => `<p style="margin:0 0 12px;font-size:16px;line-height:1.5">${e(fix(l))}</p>`).join('\n')}
<p style="margin:24px 0"><a href="${e(fix(ctaUrl))}" style="display:inline-block;background:#18171c;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:bold">${e(ctaLabel)}</a></p>
${t.after.map((l) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#4a4752">${e(fix(l))}</p>`).join('\n')}
<p style="margin:24px 0 0;font-size:12px;color:#6b6873">${e(L.footer)}</p>${unsub}
</td></tr></table></td></tr></table></body></html>`;
  const text = [...t.lines.map(fix), '', `${ctaLabel}: ${fix(ctaUrl)}`, '', ...t.after.map(fix), '', L.footer,
    data.unsubUrl ? `${L.unsub}: ${fix(data.unsubUrl)}` : ''].join('\n');
  return { subject: t.subject, html, text };
}

export function enqueueEmail(db, { to, kind, lang, data, baseUrl, subscriberId = null, delayMs = 0 }) {
  const m = renderEmail(kind, lang, data, baseUrl);
  const t = now();
  return db.prepare(`INSERT INTO emails(subscriber_id, to_addr, kind, subject, html, text, send_after, created_at)
    VALUES(?,?,?,?,?,?,?,?)`).run(subscriberId, to, kind, m.subject, m.html, m.text, t + delayMs, t).lastInsertRowid;
}

export const DRIP = [{ kind: 'drip3', delay: 3 * DAY }, { kind: 'drip7', delay: 7 * DAY }];

export function cancelPendingEmails(db, subscriberId, kinds = null) {
  const q = kinds
    ? db.prepare(`UPDATE emails SET cancelled_at = ? WHERE subscriber_id = ? AND sent_at IS NULL AND cancelled_at IS NULL AND kind IN (${kinds.map(() => '?').join(',')})`)
    : db.prepare('UPDATE emails SET cancelled_at = ? WHERE subscriber_id = ? AND sent_at IS NULL AND cancelled_at IS NULL');
  return q.run(now(), subscriberId, ...(kinds || [])).changes;
}

export function createMailer(config, log) {
  const { transport, outboxDir, from, resendKey } = config.mail;
  // RFC 8058 one-click unsubscribe for waitlist mail (Gmail/Yahoo bulk-sender rule). POST /wypisz accepts the key in the query.
  const listUnsubscribe = (row) => {
    if (!row.subscriber_id || row.kind === 'confirm') return undefined;
    const url = `${config.baseUrl}/wypisz?key=${linkKey(config.appSecret, 'sub', row.subscriber_id)}`;
    return { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
  };
  async function deliver(row) {
    if (transport === 'none') return;
    if (transport === 'resend') {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [row.to_addr], subject: row.subject, html: row.html, text: row.text, headers: listUnsubscribe(row) }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) throw new Error(`resend ${r.status}`);
      return;
    }
    fs.mkdirSync(outboxDir, { recursive: true });
    const base = `${new Date().toISOString().replace(/[:.]/g, '-')}_${row.id}_${row.kind}`;
    fs.writeFileSync(path.join(outboxDir, base + '.html'), row.html);
    fs.writeFileSync(path.join(outboxDir, base + '.json'), JSON.stringify({ to: row.to_addr, subject: row.subject, text: row.text }, null, 2));
  }

  async function processQueue(db, limit = 20) {
    const due = db.prepare(`SELECT * FROM emails WHERE sent_at IS NULL AND cancelled_at IS NULL AND send_after <= ? AND attempts < 5
      ORDER BY send_after LIMIT ?`).all(now(), limit);
    let sent = 0;
    for (const row of due) {
      try {
        await deliver(row);
        db.prepare('UPDATE emails SET sent_at = ?, attempts = attempts + 1 WHERE id = ?').run(now(), row.id);
        sent++;
      } catch (err) {
        // Exponential backoff: 1, 4, 16, 64 minutes.
        const backoff = 60_000 * 4 ** row.attempts;
        db.prepare('UPDATE emails SET attempts = attempts + 1, last_error = ?, send_after = ? WHERE id = ?')
          .run(String(err.message).slice(0, 300), now() + backoff, row.id);
        log.error('mail', err);
      }
    }
    return sent;
  }
  return { processQueue };
}
