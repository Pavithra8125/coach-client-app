// End-to-end browser verification of slice 6 (check-ins + coach's log).
// Retry run: reset console/error buffers AFTER login so pre-login wall hits
// (401 from /api/auth/me, favicon 404) don't pollute the slice-6 signal.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const USERNAME = process.env.CI_USER;
const PASSWORD = process.env.CI_PASS;
const BASE = process.env.CI_BASE ?? 'http://localhost:5173';

let passed = 0;
const failed = [];
function ok(name, cond, extra) {
  if (cond) { passed++; }
  else { failed.push(name); }
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
}

const chromePath = [
  '/opt/google/chrome/chrome', '/opt/google/chrome/google-chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find((p) => { try { return readFileSync(p).length > 0; } catch { return false; } });
if (!chromePath) { console.log('NO CHROME BINARY FOUND'); process.exit(2); }

const browser = await chromium.launch({ executablePath: chromePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1900 } });
page.on('dialog', (d) => d.accept());

// Buffers, cleared after login.
let pageErrors = [];
let consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  // Clear the pre-login auth-wall noise.
  pageErrors = [];
  consoleErrors = [];

  await page.fill('#username', USERNAME);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Clients', { timeout: 15000 });
  ok('login reaches dashboard', true);

  await page.click('a:has-text("Pavi")');
  await page.waitForSelector('h2:has-text("Check-ins")', { timeout: 25000 });
  ok('client page renders check-ins section', true);

  // Create a check-in.
  await page.click('button:has-text("New check-in")');
  await page.waitForSelector('#ci-date', { timeout: 5000 });
  await page.fill('#ci-date', '2026-08-09');
  await page.fill('#ci-energy', '8');
  await page.fill('#ci-soreness', '3');
  await page.fill('#ci-sleep', '7');
  await page.fill('#ci-adherence', '90');
  await page.fill('#ci-notes', 'Great week — bench added 2.5kg.');
  await page.click('button:has-text("Save check-in")');
  await page.waitForSelector('li:has-text("2026-08-09")', { timeout: 8000 });
  ok('check-in saved & listed', true);

  // Edit it.
  await page.click('li:has-text("2026-08-09") button:has-text("Edit")');
  await page.waitForSelector('#ci-energy', { timeout: 5000 });
  ok('edit modal pre-fills energy', (await page.inputValue('#ci-energy')) === '8');
  await page.fill('#ci-energy', '9');
  await page.click('button:has-text("Save check-in")');
  await page.waitForSelector('li:has-text("2026-08-09")', { timeout: 8000 });
  ok('check-in updated', true);

  // Add a coach note.
  await page.fill('textarea[placeholder^="Private note"]', 'Deadlift form: cue chest up next session.');
  await page.click('button:has-text("Add note")');
  await page.waitForSelector('text=cue chest up', { timeout: 8000 });
  ok('coach note added', true);
  ok('note date pre-filled', (await page.inputValue('input[aria-label="Note date"]')).length === 10);

  // Delete the coach note.
  await page.click('li:has-text("cue chest up") button:has-text("Delete")');
  await page.waitForSelector('text=cue chest up', { state: 'detached', timeout: 8000 }).catch(() => {});
  ok('coach note deleted', (await page.locator('text=cue chest up').count()) === 0);

  // Delete check-in via UI.
  await page.click('li:has-text("2026-08-09") button:has-text("Delete")');
  await page.waitForSelector('li:has-text("2026-08-09")', { state: 'detached', timeout: 8000 }).catch(() => {});
  ok('check-in deleted via UI', (await page.locator('li:has-text("2026-08-09")').count()) === 0);

  // Reload fresh + assert no new runtime errors during slice-6 interaction.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h2:has-text("Check-ins")', { timeout: 20000 });
  ok('no uncaught page errors', pageErrors.length === 0, pageErrors.join('; ') || 'none');
  const meaningful = consoleErrors.filter((e) => /checkin|coach|meal|workout|clients|progress/i.test(e));
  ok('no slice-6 API console errors', meaningful.length === 0, meaningful.join('; ') || 'none');
} catch (err) {
  ok(`exception: ${err.message}`, false);
} finally {
  await browser.close();
}

console.log(`\n${passed}/${passed + failed.length} checks passed (${failed.length} failed)`);
process.exit(failed.length ? 1 : 0);