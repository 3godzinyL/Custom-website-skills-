import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:3592';
const out = {};
const browser = await chromium.launch({ channel: 'chrome' });

// 1) Landing: client-side surface + XSS through the live demo + CSP violations.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [];
  let dialogs = 0;
  page.on('dialog', async (d) => { dialogs++; await d.dismiss(); });
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  out.surface = await page.evaluate(() => ({
    storage: Object.keys(localStorage),
    cookiesReadableByJs: document.cookie.split(';').map((c) => c.trim().split('=')[0]).filter(Boolean),
    hiddenInputs: [...document.querySelectorAll('input[type=hidden]')].map((i) => i.name),
    forms: [...document.forms].map((f) => `${(f.getAttribute('method') || 'GET').toUpperCase()} ${f.getAttribute('action') || '(same page)'}`),
    inlineHandlers: document.querySelectorAll('[onclick],[onload],[onerror]').length,
    thirdPartyScripts: [...document.scripts].map((s) => s.src).filter((s) => s && !s.startsWith(location.origin)),
    iframes: document.querySelectorAll('iframe').length,
  }));
  await page.fill('#demo-text', '<img src=x onerror=alert(document.domain)>, "><svg onload=alert(1)> and call <b>bold</b> tomorrow');
  await page.click('[data-demo-form] button[type=submit]');
  await page.waitForTimeout(1200);
  out.demoXss = { dialogs, injectedImg: await page.locator('.demo-out img').count(), injectedB: await page.locator('.demo-out b').count(), text: (await page.locator('.demo-out').innerText()).slice(0, 160) };
  out.landingConsoleErrors = errs;
  await ctx.close();
}

// 2) Forms before JS runs: what does a plain submit leak?
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(BASE + '/login');
  await page.fill('#email', 'victim@audit.test');
  await page.fill('#password', 'Secret-Password-123');
  await page.press('#password', 'Enter');
  await page.waitForLoadState('load');
  out.loginWithoutJs = page.url();
  await page.goto(BASE + '/');
  await page.fill('#wl-email', 'nojs@audit.test');
  await page.press('#wl-email', 'Enter');
  await page.waitForLoadState('load');
  out.waitlistWithoutJs = page.url();
  await ctx.close();
}

// 3) Open redirect via ?next= after login (needs a real account on this instance).
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  for (const next of ['https://evil.example', '//evil.example', '/app/../../evil', '/\\evil.example', 'javascript:alert(1)']) {
    await page.goto(BASE + '/login?next=' + encodeURIComponent(next));
    await page.fill('#email', 'yvonne@audit.test');
    await page.fill('#password', 'Correct-Horse-Battery-77');
    await Promise.all([page.waitForURL(/.*/, { timeout: 8000 }).catch(() => {}), page.click('button[type=submit]')]);
    await page.waitForTimeout(800);
    (out.openRedirect ||= []).push({ next, landed: new URL(page.url()).origin === new URL(BASE).origin ? new URL(page.url()).pathname : page.url() });
    await ctx.clearCookies();
  }
  await ctx.close();
}

// 4) The signed-in app shell: does it actually render?
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const fails = [];
  page.on('response', (r) => { if (r.status() >= 400) fails.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  await page.goto(BASE + '/login');
  await page.fill('#email', 'yvonne@audit.test');
  await page.fill('#password', 'Correct-Horse-Battery-77');
  await page.click('button[type=submit]');
  await page.waitForTimeout(2500);
  out.appShell = { url: new URL(page.url()).pathname, failedRequests: fails, bodyText: (await page.locator('body').innerText()).slice(0, 80) };
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 2));
