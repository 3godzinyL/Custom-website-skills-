import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { createApp } from '../src/app.js';

const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
});

/** Starts an isolated app (own temp data dir, own port, no background jobs). */
export async function startTestApp(extra = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogarnij-test-'));
  const port = await freePort();
  const app = createApp({
    DATA_DIR: dataDir, PORT: String(port), HOST: '127.0.0.1', BASE_URL: `http://127.0.0.1:${port}`,
    JOBS: '0', MAIL_TRANSPORT: 'none', ADMIN_EMAIL: 'owner@test.local', ADMIN_PASSWORD: 'owner-password-123',
    PUBLIC_COUNT_THRESHOLD: '3', NODE_ENV: 'test', RATE_LIMIT_SCALE: '50', STRIPE_SECRET_KEY: '', ...extra,
  }, { quiet: true });
  await app.listen();
  const base = `http://127.0.0.1:${port}`;
  const jar = { cookie: '' };
  async function req(method, url, { body, headers = {}, form, cookie = true } = {}) {
    const h = { ...headers };
    let payload;
    if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    if (form) { h['Content-Type'] = 'application/x-www-form-urlencoded'; payload = new URLSearchParams(form).toString(); }
    if (cookie && jar.cookie) h.Cookie = jar.cookie;
    const r = await fetch(base + url, { method, headers: h, body: payload, redirect: 'manual' });
    const set = r.headers.get('set-cookie');
    if (set && cookie) jar.cookie = set.split(';')[0];
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    return { status: r.status, headers: r.headers, text, data };
  }
  return {
    app, base, req, jar,
    async close() { await app.close(); fs.rmSync(dataDir, { recursive: true, force: true }); },
    lastEmail(to, kind) {
      return app.db.prepare('SELECT * FROM emails WHERE to_addr = ? AND kind = ? ORDER BY id DESC LIMIT 1').get(to, kind);
    },
  };
}

export const tokenFrom = (html, param) => {
  const m = html.match(new RegExp(`[?&]${param}=([A-Za-z0-9_-]+)`));
  return m ? m[1] : null;
};
