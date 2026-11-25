import nodemailer from 'nodemailer';

/**
 * Transactional e-mail. With SMTP_* configured, mail is sent through SMTP and
 * only metadata is kept in email_outbox. Without SMTP (development), messages
 * are printed to the console and stored in the outbox so links can be used.
 * @param {{ config: import('../config.js').AppConfig, db: import('../db/index.js').Db, logger: import('../lib/logger.js').Logger }} deps
 */
export function createMailer({ config, db, logger }) {
  const smtp =
    config.mail.transport === 'smtp'
      ? nodemailer.createTransport({
          host: config.mail.smtp.host,
          port: config.mail.smtp.port,
          secure: config.mail.smtp.secure,
          auth: config.mail.smtp.user ? { user: config.mail.smtp.user, pass: config.mail.smtp.pass } : undefined,
        })
      : null;

  /** @type {((m: { to: string, subject: string, text: string, template: string }) => void) | null} */
  let captureHook = null;

  /**
   * @param {{ to: string, subject: string, text: string, template: string }} m
   */
  async function send(m) {
    const keepBody = !smtp && !config.isProd;
    let status = 'logged';
    let error = null;
    try {
      if (smtp) {
        await smtp.sendMail({ from: config.mail.from, to: m.to, subject: m.subject, text: m.text });
        status = 'sent';
      } else if (!config.isTest) {
        logger.info('email (log transport)', { to: m.to, subject: m.subject, body: m.text });
      }
    } catch (err) {
      status = 'failed';
      error = String(/** @type {Error} */ (err).message || err).slice(0, 300);
      logger.error('email send failed', { to: m.to, template: m.template, error });
    }
    db.run(
      'INSERT INTO email_outbox (to_email, template, subject, body_text, transport, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      m.to,
      m.template,
      m.subject,
      keepBody ? m.text : null,
      smtp ? 'smtp' : 'log',
      status,
      error,
      Date.now(),
    );
    captureHook?.(m);
    return status !== 'failed';
  }

  const sign = `\n\n— Kedgely\n${config.baseUrl}`;

  return {
    send,
    /** Test helper: observe outgoing messages. @param {typeof captureHook} fn */
    onSend(fn) {
      captureHook = fn;
    },
    /** @param {string} to @param {string} link */
    passwordReset: (to, link) =>
      send({
        to,
        template: 'password_reset',
        subject: 'Reset your Kedgely password',
        text: `Someone (hopefully you) asked to reset the password for this Kedgely account.\n\nReset it here within 30 minutes:\n${link}\n\nIf it wasn't you, ignore this e-mail — your password stays unchanged.${sign}`,
      }),
    /** @param {string} to @param {string} link */
    waitlistConfirm: (to, link) =>
      send({
        to,
        template: 'waitlist_confirm',
        subject: 'Confirm your spot on the Kedgely waitlist',
        text: `Thanks for your interest in Kedgely.\n\nPlease confirm your e-mail address to keep your place on the early-access list:\n${link}\n\nIf you didn't sign up, ignore this message and your address will be removed automatically.${sign}`,
      }),
    /** @param {string} to @param {string} code @param {number} days */
    waitlistInvite: (to, code, days) =>
      send({
        to,
        template: 'waitlist_invite',
        subject: 'Your Kedgely early access is ready',
        text: `Good news — a spot opened up in the Kedgely beta.\n\nCreate your account at ${config.baseUrl}/signup and enter this personal invite code:\n\n${code}\n\nThe code gives you ${days} days of access and works only with this e-mail address.${sign}`,
      }),
    /** @param {string} to @param {string} planName @param {number | null} endsAt */
    accessGranted: (to, planName, endsAt) =>
      send({
        to,
        template: 'access_granted',
        subject: 'Your Kedgely access is active',
        text: `Your Kedgely ${planName} access is now active${endsAt ? ` until ${new Date(endsAt).toUTCString()}` : ''}.\n\nSign in: ${config.baseUrl}/login${sign}`,
      }),
  };
}
/** @typedef {ReturnType<typeof createMailer>} Mailer */
