// Self-contained slice 7 verification: seed test data directly, then exercise
// the HTTP API (gamification + milestone CRUD) and assert the computed values.
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4000';
const CLIENT = 4;
const EXERCISE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const db = new Database('/home/pavithra/Documents/coach-client-app/server/db/app.sqlite');
db.pragma('foreign_keys = ON');

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  → ' + JSON.stringify(detail) : ''}`);
}

// ---- seed test data (direct DB; real data preserved) -----------------------
// Remove any leftover sessions from my test date windows.
db.prepare('DELETE FROM workout_sessions WHERE client_id = ? AND date BETWEEN ? AND ?').run(CLIENT, '2026-07-20', '2026-08-08');
// Remove leftover test weight entries (Jul 20 / Jul 27) if any.
db.prepare('DELETE FROM weight_entries WHERE client_id = ? AND date IN (?, ?)').run(CLIENT, '2026-07-20', '2026-07-27');

const upsertSession = db.prepare(
  'INSERT INTO workout_sessions (client_id, date, workout_day_id) VALUES (?, ?, ?) ' +
  'ON CONFLICT(client_id, date) DO UPDATE SET workout_day_id = excluded.workout_day_id, updated_at = datetime(\'now\')'
);
const findSession = db.prepare('SELECT id FROM workout_sessions WHERE client_id = ? AND date = ?');
const addSet = db.prepare('INSERT INTO workout_sets (session_id, exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?, ?)');
const log = db.transaction((date, weight, reps, sets) => {
  upsertSession.run(CLIENT, date, 8);
  const sid = findSession.get(CLIENT, date).id;
  db.prepare('DELETE FROM workout_sets WHERE session_id = ?').run(sid);
  for (let i = 0; i < sets; i++) addSet.run(sid, EXERCISE, i + 1, weight, reps);
});

// Run A: Jul 20-27, 8 consecutive days; bench ramps up for PRs.
log('2026-07-20', 40, 10, 4);
log('2026-07-21', 45, 8, 4);
log('2026-07-22', 50, 8, 4);
log('2026-07-23', 55, 8, 4);
for (let d = 24; d <= 27; d++) log(`2026-07-${d}`, 50, 8, 4);
// Run B: Aug 3-8, 6 more days (Aug 9 is the client's real session).
for (let d = 3; d <= 8; d++) log(`2026-08-0${d}`, 50, 8, 4);
// Test weight entries trending down toward a target.
const upsertWeight = db.prepare(
  'INSERT INTO weight_entries (client_id, date, weight) VALUES (?, ?, ?) ' +
  'ON CONFLICT(client_id, date) DO UPDATE SET weight = excluded.weight'
);
upsertWeight.run(CLIENT, '2026-07-20', 58.0);
upsertWeight.run(CLIENT, '2026-07-27', 56.5);

console.log('seeded test data — sessions:', db.prepare('SELECT date FROM workout_sessions WHERE client_id = ? ORDER BY date').all(CLIENT).map((r) => r.date).join(', '));
console.log('real Aug 9 sets:', db.prepare('SELECT weight, reps FROM workout_sets WHERE session_id = 9').all());

// ---- HTTP helpers ----------------------------------------------------------
let cookie = '';
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

// --- login ---
const env = readFileSync('/home/pavithra/Documents/coach-client-app/server/.env', 'utf8');
const username = (env.match(/^COACH_USERNAME=(.*)$/m) || [])[1] ?? 'coach';
const password = (env.match(/^COACH_PASSWORD=(.*)$/m) || [])[1] ?? 'dev';
const login = await api('/api/auth/login', { method: 'POST', body: { username, password } });
check('login succeeds', login.status === 200, login.status);

// ---- date helpers (mirror the server's so expectations stay correct regardless of run date) ----
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseDate(iso) {
  return new Date(`${iso}T00:00:00Z`);
}
function toISO(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function mondayOf(iso) {
  const d = parseDate(iso);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return toISO(addDays(d, -dow));
}
// Current consecutive-day streak: the run ending today (or yesterday when today
// isn't logged yet — the day isn't over), or 0 when neither is logged.
function expectedCurrentDays(dates) {
  const set = new Set(dates);
  const t = todayLocal();
  const anchor = set.has(t) ? t : toISO(addDays(parseDate(t), -1));
  if (!set.has(anchor)) return 0;
  let run = 0;
  let d = anchor;
  while (set.has(d)) {
    run += 1;
    d = toISO(addDays(parseDate(d), -1));
  }
  return run;
}

// --- gamification ---
const g = (await api(`/api/clients/${CLIENT}/gamification`)).data;
const sessionDates = db.prepare('SELECT date FROM workout_sessions WHERE client_id = ? ORDER BY date').all(CLIENT).map((r) => r.date);
const T = todayLocal();
const heatStart = toISO(addDays(parseDate(mondayOf(T)), -25 * 7)); // Monday 26 weeks back, same as server
const heatLen = Math.round((parseDate(T) - parseDate(heatStart)) / DAY_MS) + 1;
check('streak.current_days == expected (' + expectedCurrentDays(sessionDates) + ')', g.streak?.current_days === expectedCurrentDays(sessionDates), g.streak);
check('streak.best_days == 8', g.streak?.best_days === 8, g.streak?.best_days);
check('streak.current_weeks == 3', g.streak?.current_weeks === 3, g.streak?.current_weeks);
check('streak.best_weeks == 3', g.streak?.best_weeks === 3, g.streak?.best_weeks);
check('heatmap spans 26 weeks (days == ' + heatLen + ')', g.heatmap?.days?.length === heatLen, g.heatmap?.days?.length);
check('heatmap start == ' + heatStart, g.heatmap?.start === heatStart, g.heatmap?.start);
check('heatmap end == today (' + T + ')', g.heatmap?.end === T, g.heatmap?.end);
check('heatmap Aug 9 has count >= 1', g.heatmap?.days?.find((d) => d.date === '2026-08-09')?.count >= 1, g.heatmap?.days?.find((d) => d.date === '2026-08-09'));
check('heatmap start day has count 0', g.heatmap?.days?.find((d) => d.date === heatStart)?.count === 0, g.heatmap?.days?.find((d) => d.date === heatStart));

const byId = (id) => g.badges?.find((b) => b.id === id);
check('badge first_workout earned Jul 20', byId('first_workout')?.earned && byId('first_workout').earned_at === '2026-07-20', byId('first_workout'));
check('badge first_pr earned Jul 21', byId('first_pr')?.earned && byId('first_pr').earned_at === '2026-07-21', byId('first_pr'));
check('badge streak_7 earned Jul 26', byId('streak_7')?.earned && byId('streak_7').earned_at === '2026-07-26', byId('streak_7'));
check('badge streak_30 not earned, progress 8', !byId('streak_30')?.earned && byId('streak_30')?.progress === 8, byId('streak_30'));
check('badge volume_10k earned', !!byId('volume_10k')?.earned, byId('volume_10k'));
check('badge sessions_50 not earned, progress 15', !byId('sessions_50')?.earned && byId('sessions_50')?.progress === 15, byId('sessions_50'));

// --- milestone CRUD ---
const w = await api(`/api/clients/${CLIENT}/milestones`, { method: 'POST', body: { type: 'weight', label: 'Drop to 52', target: 52 } });
check('POST weight milestone 201', w.status === 201, w.status);
check('weight milestone computed: current 55.4, remaining 3.4, pct 43',
  w.data.milestone.current === 55.4 && w.data.milestone.remaining === 3.4 && w.data.milestone.progress_pct === 43 && !w.data.milestone.reached,
  w.data.milestone);
const weightId = w.data.milestone.id;

const ex = await api(`/api/clients/${CLIENT}/milestones`, { method: 'POST', body: { type: 'exercise', label: 'Bench 80', target: 80, exercise_id: EXERCISE } });
check('POST exercise milestone 201', ex.status === 201, ex.status);
check('exercise milestone computed: current 69.7, remaining 10.3, pct 87',
  ex.data.milestone.current === 69.7 && ex.data.milestone.remaining === 10.3 && ex.data.milestone.progress_pct === 87 && ex.data.milestone.exercise_name === 'Bench Press',
  ex.data.milestone);
const exId = ex.data.milestone.id;

check('POST milestone bad type 400', (await api(`/api/clients/${CLIENT}/milestones`, { method: 'POST', body: { type: 'nope', target: 50 } })).status === 400);
check('POST exercise milestone missing exercise 400', (await api(`/api/clients/${CLIENT}/milestones`, { method: 'POST', body: { type: 'exercise', target: 80 } })).status === 400);
check('POST milestone bad target 400', (await api(`/api/clients/${CLIENT}/milestones`, { method: 'POST', body: { type: 'weight', target: -3 } })).status === 400);

const up = await api(`/api/clients/${CLIENT}/milestones/${weightId}`, { method: 'PUT', body: { target: 53 } });
check('PUT milestone recomputes remaining 2.4', up.data.milestone.remaining === 2.4, up.data.milestone);

const list = await api(`/api/clients/${CLIENT}/milestones`);
check('GET milestones returns 2', list.data.milestones.length === 2, list.data.milestones.length);

const del1 = await api(`/api/clients/${CLIENT}/milestones/${weightId}`, { method: 'DELETE' });
const del2 = await api(`/api/clients/${CLIENT}/milestones/${exId}`, { method: 'DELETE' });
check('DELETE milestones ok', del1.data.ok === true && del2.data.ok === true);
const list2 = await api(`/api/clients/${CLIENT}/milestones`);
check('GET milestones empty after delete', list2.data.milestones.length === 0, list2.data.milestones.length);

// --- auth guard ---
const anon = await fetch(`${BASE}/api/clients/${CLIENT}/gamification`);
check('gamification requires auth (401/403)', anon.status === 401 || anon.status === 403, anon.status);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);