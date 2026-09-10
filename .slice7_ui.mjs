// Throwaway UI smoke check for slice 7: log in, open client 4, screenshot the
// gamification panel, and surface any console errors / missing sections.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = process.env.UI_BASE ?? 'http://localhost:5173';
const env = readFileSync(new URL('./server/.env', import.meta.url), 'utf8');
const username = (env.match(/^COACH_USERNAME=(.*)$/m) || [])[1] ?? 'coach';
const password = (env.match(/^COACH_PASSWORD=(.*)$/m) || [])[1] ?? 'dev';

const browser = await chromium.launch({
  args: ['--no-sandbox'],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

async function step(label, fn) {
  try {
    await fn();
    console.log(`PASS  ${label}`);
  } catch (err) {
    console.log(`FAIL  ${label}  → ${err.message.split('\n')[0]}`);
  }
}

await step('login page loads', async () => {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type="password"], input[name="password"], form', { timeout: 10000 });
});

await step('login as coach', async () => {
  // Find username/password inputs robustly.
  const inputs = await page.locator('input').all();
  const textInput = await page.locator('input[type="text"], input:not([type])').first();
  const passInput = await page.locator('input[type="password"]').first();
  await textInput.fill(username);
  await passInput.fill(password);
  await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 10000 });
  console.log('  → landed on', page.url());
});

await step('open client 4 detail page', async () => {
  await page.goto(BASE + '/clients/4', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Gamification', { timeout: 15000 });
});

await step('gamification panel rendered (streaks + badges + milestones)', async () => {
  await page.waitForSelector('text=Current streak', { timeout: 10000 });
  await page.waitForSelector('text=Workout calendar', { timeout: 10000 });
  await page.waitForSelector('text=Achievements', { timeout: 10000 });
  await page.waitForSelector('text=Milestones', { timeout: 10000 });
  const badges = await page.locator('text=Achievements').locator('..').locator('text=First Session, New Personal Best').count();
  console.log('  → section headers found');
});

await step('screenshot gamification + full page', async () => {
  await page.screenshot({ path: '/tmp/slice7_gamification.png', fullPage: false });
  // Scroll the gamification section into view for a targeted shot.
  const gam = page.locator('section', { hasText: 'Gamification' }).first();
  await gam.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/slice7_gamification_scrolled.png' });
});

await step('no console errors', () => {
  const real = consoleErrors.filter((e) => !/favicon|net::ERR/.test(e));
  if (real.length) throw new Error(real.join(' | '));
});

console.log('\nconsole errors (if any):', consoleErrors.length ? consoleErrors : 'none');
await browser.close();
console.log('screenshots: /tmp/slice7_gamification.png, /tmp/slice7_gamification_scrolled.png');
