// End-to-end check in a real browser (Chrome). Needs `playwright-core` (npm i -D playwright-core)
// and a running server with its own DATA_DIR. Usage:
//   BASE=http://127.0.0.1:3710 DATA_DIR=<server data dir> ADMIN_EMAIL=… ADMIN_PASSWORD=… [SHOTS=dir] node scripts/e2e.mjs
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright-core');
const BASE = process.env.BASE || 'http://127.0.0.1:3700';
const DATA = process.env.DATA_DIR;
const SHOTS = process.env.SHOTS || '';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const results = [];
const ok = (name, cond, extra = '') => { results.push({ name, pass: !!cond, extra }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };

const browser = await chromium.launch({ executablePath: CHROME });
async function page(width = 1280, height = 900) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'pl-PL' });
  const p = await ctx.newPage();
  p.problems = [];
  p.on('console', (m) => { if (m.type() === 'error' || /Content Security Policy/i.test(m.text())) p.problems.push(m.text()); });
  p.on('pageerror', (e) => p.problems.push(e.message));
  return p;
}
const settle = async (p) => { await p.evaluate(() => { document.querySelectorAll('.reveal,.js-strike').forEach((n) => n.classList.add('is-on')); document.querySelectorAll('.anim .slot').forEach((n) => n.classList.add('is-in')); }); await p.waitForTimeout(900); };
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true }); };
const noHScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// 1. Landing at four widths
for (const w of [360, 768, 1280, 1920]) {
  const p = await page(w, w < 500 ? 740 : 900);
  await p.goto(`${BASE}/?v=a`, { waitUntil: 'networkidle' });
  const h1 = await p.locator('h1').boundingBox();
  ok(`landing ${w}px: H1 above the fold`, h1 && h1.y + h1.height <= (w < 500 ? 740 : 900));
  ok(`landing ${w}px: no horizontal scroll`, await noHScroll(p));
  await settle(p);
  await shot(p, `landing-${w}`);
  ok(`landing ${w}px: no console/CSP errors`, p.problems.length === 0, p.problems.join(' | '));
  await p.context().close();
}

// 2. Interactions on desktop
{
  const p = await page(1280, 900);
  await p.goto(`${BASE}/?v=b`, { waitUntil: 'networkidle' });
  ok('A/B variant b rendered', (await p.locator('h1').textContent()).includes('Minuta mówienia'));
  await p.click('.js-demo button[type="submit"]');
  const slots = await p.locator('.js-demo-out .slot').count();
  const times = await p.locator('.js-demo-out time').allTextContents();
  ok('demo builds a plan', slots >= 6, `${slots} slots: ${times.join(', ')}`);
  ok('demo keeps the fixed 10:00 call', times.includes('10:00'));
  await p.fill('#demo-text', '<img src=x onerror=alert(1)>, o 9 spotkanie');
  await p.click('.js-demo button[type="submit"]');
  ok('demo escapes user input', (await p.locator('.js-demo-out img').count()) === 0);
  await p.click('.js-late');
  ok('plan B toggles', await p.locator('#track.is-late').count() === 1 && (await p.locator('.js-tomorrow').textContent()).includes('Jutro'));
  await p.click('.js-billing[data-period="y"]');
  ok('pricing yearly toggle', (await p.locator('.plan--main .js-price').textContent()).includes('149'));
  ok('desktop: no console errors', p.problems.length === 0, p.problems.join(' | '));
  await p.context().close();
}

// 3. Mobile menu
{
  const p = await page(390, 844);
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await p.click('#menuBtn');
  ok('mobile menu opens', await p.locator('#nav.is-open').isVisible());
  await settle(p);
  await shot(p, 'menu-390');
  await p.keyboard.press('Escape');
  ok('mobile menu closes on Escape', (await p.locator('#nav.is-open').count()) === 0);
  await p.context().close();
}

// 4. Signup → confirm → queue → survey
const email = `e2e-${Date.now()}@poczta.pl`;
{
  const p = await page(390, 844);
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await p.fill('#email-hero', 'zly-adres');
  await p.click('#email-hero ~ button');
  ok('signup validates e-mail', (await p.locator('#email-hero-msg').textContent()).length > 0);
  await p.fill('#email-hero', email);
  await Promise.all([p.waitForURL('**/dziekujemy'), p.click('#email-hero ~ button')]);
  ok('signup → thank-you page', p.url().endsWith('/dziekujemy'));
  await shot(p, 'thanks-390');
  await new Promise((r) => setTimeout(r, 6500)); // mail queue runs every 5 s
  const outbox = path.join(DATA, 'outbox');
  const files = fs.existsSync(outbox) ? fs.readdirSync(outbox).filter((f) => f.endsWith('.json')) : [];
  const conf = files.map((f) => JSON.parse(fs.readFileSync(path.join(outbox, f), 'utf8'))).find((m) => m.to === email);
  ok('confirmation e-mail in outbox', !!conf);
  const link = conf?.text.match(/https?:\/\/\S+potwierdz\?token=\S+/)?.[0];
  await p.goto(link, { waitUntil: 'networkidle' });
  await p.waitForURL('**/kolejka?key=*', { timeout: 5000 }).catch(() => {});
  ok('confirm link → queue page', p.url().includes('/kolejka?key='));
  ok('queue shows a position', /^\d+$/.test((await p.locator('.big-num').textContent()).trim()));
  await p.click('.js-survey button[value="kartki"]');
  await p.waitForTimeout(500);
  ok('survey saved', (await p.locator('.js-survey .form-msg').textContent()).includes('Dzięki'));
  await shot(p, 'queue-390');
  ok('flow: no console errors', p.problems.length === 0, p.problems.join(' | '));
  await p.context().close();
}

// 5. Presale → sandbox payment → order page
{
  const p = await page(1280, 900);
  await p.goto(`${BASE}/zamow`, { waitUntil: 'networkidle' });
  await p.fill('#o-code', 'NIEMA');
  await p.click('.js-apply-code');
  await p.waitForTimeout(300);
  ok('invalid discount code reported', (await p.locator('.js-code-msg').textContent()).length > 0);
  await p.fill('#o-code', '');
  await p.fill('#o-email', email);
  await p.click('.js-order button[type="submit"]');
  ok('terms required', (await p.locator('.js-order-msg').textContent()).length > 0);
  await p.check('input[name="acceptTerms"]');
  await shot(p, 'presale-1280');
  await Promise.all([p.waitForURL('**/platnosc-testowa/**'), p.click('.js-order button[type="submit"]')]);
  await shot(p, 'sandbox-1280');
  await Promise.all([p.waitForURL('**/zamowienie/**'), p.click('.js-sandbox button[value="success"]')]);
  ok('paid order page', (await p.locator('.badge').textContent()).includes('opłacone'));
  await shot(p, 'order-1280');
  ok('presale: no console errors', p.problems.length === 0, p.problems.join(' | '));
  await p.context().close();
}

// 6. Admin panel
{
  const p = await page(1440, 900);
  await p.goto(`${BASE}/admin`, { waitUntil: 'load' });
  await p.waitForSelector('#l-email');
  p.problems = p.problems.filter((x) => !x.includes('401')); // expected: not logged in yet
  await p.fill('#l-email', process.env.ADMIN_EMAIL);
  await p.fill('#l-pass', 'zle-haslo');
  await p.click('.login button');
  await p.waitForTimeout(400);
  ok('admin rejects wrong password', (await p.locator('.login .msg').textContent()).length > 0);
  await p.fill('#l-pass', process.env.ADMIN_PASSWORD);
  await p.click('.login button');
  await p.waitForSelector('.kpi');
  ok('admin dashboard renders', (await p.locator('.kpi').count()) >= 6);
  await shot(p, 'admin-dashboard-1440');
  await p.click('text=Lista oczekujących');
  await p.waitForSelector('table');
  ok('admin list shows the e2e signup', (await p.locator('td', { hasText: email }).count()) === 1);
  await p.click('text=Zamówienia');
  await p.waitForSelector('table');
  ok('admin orders show paid order', (await p.locator('.pill--paid').count()) >= 1);
  await shot(p, 'admin-orders-1440');
  await p.click('text=Zdrowie systemu');
  await p.waitForSelector('.kpi');
  p.problems = p.problems.filter((x) => !x.includes('status of 401')); // wrong-password check above
  ok('admin: no console errors', p.problems.length === 0, p.problems.join(' | '));
  await p.context().close();
}

// 7. Other pages
for (const [url, name] of [['/en/', 'en'], ['/poradnik', 'blog'], ['/poradnik/plan-b-kiedy-dzien-sie-sypie', 'post'], ['/prywatnosc', 'privacy'], ['/nie-ma', '404']]) {
  for (const w of [390, 1440]) {
    const p = await page(w, 900);
    const r = await p.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
    await settle(p);
    ok(`${name} ${w}px loads (${r.status()})`, name === '404' ? r.status() === 404 : r.ok());
    ok(`${name} ${w}px: no horizontal scroll`, await noHScroll(p));
    if (name === '404') p.problems = p.problems.filter((x) => !x.includes('status of 404'));
    ok(`${name} ${w}px: no console errors`, p.problems.length === 0, p.problems.join(' | '));
    await shot(p, `${name}-${w}`);
    await p.context().close();
  }
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
