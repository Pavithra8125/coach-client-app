// Gamification (slice 7): streaks, a workout heatmap, achievement badges, and
// coach-set milestone countdowns. Everything is derived from existing data
// (workout_sessions, workout_sets, weight_entries) except the milestone
// targets themselves, which live in the small milestone_targets table.
// Mounted at /api/clients, behind requireAuth.
import { Router } from 'express';
import { db } from '../db.js';

export const gamificationRouter = Router();

const DAY_MS = 24 * 60 * 60 * 1000;

function requireClient(req, res) {
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.clientId);
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return null;
  }
  return client;
}

function toPosNum(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toPosInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Estimated one-rep max (Epley) — same formula the workout PR view uses.
function e1rm(weight, reps) {
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// ---- date helpers -----------------------------------------------------------
// Dates are stored as local YYYY-MM-DD strings; arithmetic happens in UTC on
// the midnight-parsed value so adding days is exact regardless of timezone.
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

// Today in local time — matches the browser's date input default.
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Monday of the ISO week containing `iso` (date string → date string).
function mondayOf(iso) {
  const d = parseDate(iso);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return toISO(addDays(d, -dow));
}

// ---- streaks ----------------------------------------------------------------

// Consecutive-day streaks. Current = the run ending today (or yesterday, when
// today isn't logged yet but yesterday was — the day isn't over). Best = the
// longest run anywhere in history.
function dayStreaks(dates) {
  const set = new Set(dates);
  const t = today();

  let current = 0;
  if (set.has(t)) {
    let d = t;
    while (set.has(d)) {
      current += 1;
      d = toISO(addDays(parseDate(d), -1));
    }
  } else {
    const yesterday = toISO(addDays(parseDate(t), -1));
    if (set.has(yesterday)) {
      let d = yesterday;
      while (set.has(d)) {
        current += 1;
        d = toISO(addDays(parseDate(d), -1));
      }
    }
  }

  let best = 0;
  let run = 0;
  let prev = null;
  for (const date of dates) {
    if (prev && parseDate(date) - parseDate(prev) === DAY_MS) run += 1;
    else run = 1;
    if (run > best) best = run;
    prev = date;
  }

  return { current_days: current, best_days: best };
}

// Consecutive-week streaks — a week counts if it contains at least one logged
// workout. Same alive-until-over rule as days for the current run.
function weekStreaks(dates) {
  const weeks = new Set(dates.map((date) => mondayOf(date)));
  const t = today();
  let currentWeek = mondayOf(t);
  if (!weeks.has(currentWeek)) {
    currentWeek = toISO(addDays(parseDate(currentWeek), -7));
  }

  let current = 0;
  if (weeks.has(currentWeek)) {
    let w = currentWeek;
    while (weeks.has(w)) {
      current += 1;
      w = toISO(addDays(parseDate(w), -7));
    }
  }

  const sorted = [...weeks].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const wk of sorted) {
    if (prev && parseDate(wk) - parseDate(prev) === 7 * DAY_MS) run += 1;
    else run = 1;
    if (run > best) best = run;
    prev = wk;
  }

  return { current_weeks: current, best_weeks: best };
}

// ---- heatmap ----------------------------------------------------------------

// GitHub-style grid data: a dense list of { date, count } for every day in the
// window (count = sets logged that day, 0 = rest day). The window is the last
// `weeks` full weeks starting on a Monday, ending today.
function heatmap(countsByDate, weeks = 26) {
  const t = today();
  const end = t;
  const start = toISO(addDays(parseDate(mondayOf(t)), -(weeks - 1) * 7));
  const days = [];
  for (let d = parseDate(start); toISO(d) <= end; d = addDays(d, 1)) {
    const iso = toISO(d);
    days.push({ date: iso, count: countsByDate.get(iso) ?? 0 });
  }
  return { start, end, days };
}

// ---- badges ----------------------------------------------------------------

const BADGE_DEFS = [
  { id: 'first_workout', name: 'First Session', icon: '🎉', description: 'Logged their first workout.' },
  { id: 'first_pr', name: 'New Personal Best', icon: '🏆', description: 'Beat their own best on a lift.' },
  { id: 'streak_7', name: '7-Day Streak', icon: '🔥', description: 'Worked out 7 days in a row.' },
  { id: 'streak_30', name: '30-Day Streak', icon: '💪', description: 'Worked out 30 days in a row.' },
  { id: 'volume_10k', name: '10-Tonne Club', icon: '🏋️', description: 'Lifted 10,000 kg in total.' },
  { id: 'sessions_50', name: '50 Workouts', icon: '🎯', description: 'Logged 50 workout sessions.' },
];

function computeBadges(clientId, bestDays) {
  const sessions = db
    .prepare('SELECT id, date FROM workout_sessions WHERE client_id = ? ORDER BY date, id')
    .all(clientId);
  const setRows = db
    .prepare(
      `SELECT st.exercise_id, st.weight, st.reps, s.date
       FROM workout_sets st
       JOIN workout_sessions s ON s.id = st.session_id
       WHERE s.client_id = ?
       ORDER BY s.date, s.id, st.set_number`
    )
    .all(clientId);

  const dates = sessions.map((s) => s.date);
  const firstDate = dates[0] ?? null;
  const sessionCount = sessions.length;
  const totalVolume = setRows.reduce((sum, r) => sum + r.weight * r.reps, 0);

  // First PR = the first time a set beats the best previously logged for that
  // same exercise (the first-ever set establishes a baseline, not a PR).
  let firstPrDate = null;
  {
    const bestByExercise = new Map();
    for (const row of setRows) {
      const est = e1rm(row.weight, row.reps);
      const best = bestByExercise.get(row.exercise_id);
      if (best === undefined) {
        bestByExercise.set(row.exercise_id, est);
      } else if (est > best) {
        bestByExercise.set(row.exercise_id, est);
        if (!firstPrDate || row.date < firstPrDate) firstPrDate = row.date;
      }
    }
  }

  // First date on which a consecutive-day run first reached `n`.
  function firstStreakReached(n) {
    let run = 0;
    let prev = null;
    for (const date of dates) {
      if (prev && parseDate(date) - parseDate(prev) === DAY_MS) run += 1;
      else run = 1;
      if (run >= n) return date;
      prev = date;
    }
    return null;
  }

  // First date cumulative volume passed `target` kg.
  function firstVolumeReached(target) {
    let acc = 0;
    for (const row of setRows) {
      acc += row.weight * row.reps;
      if (acc >= target) return row.date;
    }
    return null;
  }

  function firstSessionReached(n) {
    return sessionCount >= n ? sessions[n - 1].date : null;
  }

  const earnedAt = {
    first_workout: firstDate,
    first_pr: firstPrDate,
    streak_7: firstStreakReached(7),
    streak_30: firstStreakReached(30),
    volume_10k: firstVolumeReached(10000),
    sessions_50: firstSessionReached(50),
  };

  // Progress shown on locked badges so a milestone feels within reach.
  const progress = {
    volume_10k: { value: totalVolume, pct: Math.min(100, Math.round((totalVolume / 10000) * 100)), label: `${Math.round(totalVolume).toLocaleString()} / 10,000 kg` },
    sessions_50: { value: sessionCount, pct: Math.min(100, Math.round((sessionCount / 50) * 100)), label: `${sessionCount} / 50 workouts` },
    streak_7: { value: bestDays, pct: Math.min(100, Math.round((bestDays / 7) * 100)), label: `${bestDays} / 7 days` },
    streak_30: { value: bestDays, pct: Math.min(100, Math.round((bestDays / 30) * 100)), label: `${bestDays} / 30 days` },
  };

  return BADGE_DEFS.map((def) => {
    const earnedDate = earnedAt[def.id];
    const p = progress[def.id];
    return {
      ...def,
      earned: !!earnedDate,
      earned_at: earnedDate,
      progress: p?.value ?? null,
      progress_pct: p && !earnedDate ? p.pct : null,
      progress_label: p && !earnedDate ? p.label : null,
    };
  });
}

// ---- milestones -------------------------------------------------------------

const M_COLS =
  'id, client_id, type, label, target, unit, exercise_id, created_at, updated_at';

function getMilestone(id, clientId) {
  return db
    .prepare(`SELECT ${M_COLS} FROM milestone_targets WHERE id = ? AND client_id = ?`)
    .get(id, clientId);
}

// Turn a stored target row into what the client renders: the current value
// pulled from live data, the distance remaining, and a 0-100 progress pct.
// Weight targets measure from the client's first logged weight (direction from
// there to the target); lift targets measure from 0 toward the target 1RM.
function computeMilestone(m) {
  if (m.type === 'exercise') {
    const exercise = db.prepare('SELECT name FROM exercises WHERE id = ?').get(m.exercise_id);
    const rows = db
      .prepare(
        `SELECT st.weight, st.reps FROM workout_sets st
         JOIN workout_sessions s ON s.id = st.session_id
         WHERE s.client_id = ? AND st.exercise_id = ?
         ORDER BY s.date, s.id, st.set_number`
      )
      .all(m.client_id, m.exercise_id);
    let current = null;
    for (const row of rows) {
      const est = e1rm(row.weight, row.reps);
      if (current === null || est > current) current = est;
    }
    const reached = current !== null && current >= m.target;
    const remaining = current === null ? null : Math.max(0, Math.round((m.target - current) * 10) / 10);
    const progressPct =
      current === null ? null : Math.min(100, Math.max(0, Math.round((current / m.target) * 100)));
    return {
      ...m,
      exercise_name: exercise?.name ?? null,
      current,
      current_label: 'Best 1RM',
      remaining,
      reached,
      progress_pct: reached ? 100 : progressPct,
    };
  }

  // type 'weight'
  const entries = db
    .prepare('SELECT date, weight FROM weight_entries WHERE client_id = ? ORDER BY date, id')
    .all(m.client_id);
  const start = entries.length ? entries[0].weight : null;
  const current = entries.length ? entries[entries.length - 1].weight : null;

  let remaining = null;
  let reached = false;
  let progressPct = null;
  if (current !== null) {
    if (start === null) {
      // No reference point to draw a progress bar — just show the distance.
      remaining = Math.max(0, Math.round((m.target - current) * 10) / 10);
      reached = current === m.target;
    } else if (m.target < start) {
      // Losing weight toward a lower target.
      const total = start - m.target;
      reached = current <= m.target;
      remaining = Math.max(0, Math.round((current - m.target) * 10) / 10);
      progressPct = total > 0 ? Math.min(100, Math.max(0, Math.round(((start - current) / total) * 100))) : 100;
    } else if (m.target > start) {
      // Gaining toward a higher target.
      const total = m.target - start;
      reached = current >= m.target;
      remaining = Math.max(0, Math.round((m.target - current) * 10) / 10);
      progressPct = total > 0 ? Math.min(100, Math.max(0, Math.round(((current - start) / total) * 100))) : 100;
    } else {
      // Target equals the starting weight — met unless now above it.
      reached = current <= m.target;
      remaining = Math.max(0, Math.round((m.target - current) * 10) / 10);
      progressPct = 100;
    }
  }

  return {
    ...m,
    exercise_name: null,
    current,
    current_label: 'Latest weight',
    remaining,
    reached,
    progress_pct: reached ? 100 : progressPct,
  };
}

// ---- endpoints --------------------------------------------------------------

// GET /api/clients/:clientId/gamification — streaks + heatmap + badges in one
// call; everything derived from existing workout data.
gamificationRouter.get('/:clientId/gamification', (req, res) => {
  if (!requireClient(req, res)) return;
  const dates = db
    .prepare('SELECT date FROM workout_sessions WHERE client_id = ? ORDER BY date')
    .all(req.params.clientId)
    .map((r) => r.date);
  const setCounts = db
    .prepare(
      `SELECT s.date, COUNT(st.id) AS n
       FROM workout_sessions s
       JOIN workout_sets st ON st.session_id = s.id
       WHERE s.client_id = ?
       GROUP BY s.date`
    )
    .all(req.params.clientId);
  const countsByDate = new Map(setCounts.map((r) => [r.date, r.n]));

  const streak = { ...dayStreaks(dates), ...weekStreaks(dates) };
  const hmap = heatmap(countsByDate);
  const badges = computeBadges(req.params.clientId, streak.best_days);
  res.json({ streak, heatmap: hmap, badges });
});

// GET /api/clients/:clientId/milestones — all coach-set targets, each with its
// live current value and progress.
gamificationRouter.get('/:clientId/milestones', (req, res) => {
  if (!requireClient(req, res)) return;
  const rows = db
    .prepare('SELECT ' + M_COLS + ' FROM milestone_targets WHERE client_id = ? ORDER BY id')
    .all(req.params.clientId);
  res.json({ milestones: rows.map(computeMilestone) });
});

// POST /api/clients/:clientId/milestones — create a target.
// Body: { type: 'weight'|'exercise', target (kg), label?, exercise_id? }
gamificationRouter.post('/:clientId/milestones', (req, res) => {
  if (!requireClient(req, res)) return;
  const body = req.body ?? {};
  const type = body.type;
  if (type !== 'weight' && type !== 'exercise') {
    return res.status(400).json({ error: 'type must be "weight" or "exercise"' });
  }
  const target = toPosNum(body.target);
  if (target === null) return res.status(400).json({ error: 'target must be a positive number (kg)' });
  const unit = typeof body.unit === 'string' && body.unit.trim() ? body.unit.trim() : 'kg';
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : null;

  let exerciseId = null;
  if (type === 'exercise') {
    exerciseId = toPosInt(body.exercise_id);
    if (exerciseId === null) return res.status(400).json({ error: 'exercise_id is required for exercise targets' });
    const exercise = db.prepare('SELECT id FROM exercises WHERE id = ?').get(exerciseId);
    if (!exercise) return res.status(400).json({ error: 'exercise does not exist' });
  }

  const result = db
    .prepare(
      'INSERT INTO milestone_targets (client_id, type, label, target, unit, exercise_id) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(req.params.clientId, type, label, target, unit, exerciseId);
  res.status(201).json({ milestone: computeMilestone(getMilestone(result.lastInsertRowid, req.params.clientId)) });
});

// PUT /api/clients/:clientId/milestones/:id — update a target. Any subset of
// type / target / label / unit / exercise_id may be sent. Type changes are
// validated together with exercise_id (an exercise target always needs one).
gamificationRouter.put('/:clientId/milestones/:id', (req, res) => {
  if (!requireClient(req, res)) return;
  const m = getMilestone(req.params.id, req.params.clientId);
  if (!m) return res.status(404).json({ error: 'Milestone not found' });

  const body = req.body ?? {};
  let type = m.type;
  if (body.type !== undefined) {
    if (body.type !== 'weight' && body.type !== 'exercise') {
      return res.status(400).json({ error: 'type must be "weight" or "exercise"' });
    }
    type = body.type;
  }
  let exerciseId = m.exercise_id;
  if (body.exercise_id !== undefined) {
    exerciseId = toPosInt(body.exercise_id);
    if (exerciseId === null) return res.status(400).json({ error: 'exercise_id must be a positive integer' });
  }
  if (type === 'exercise') {
    if (exerciseId === null) return res.status(400).json({ error: 'exercise_id is required for exercise targets' });
    const exercise = db.prepare('SELECT id FROM exercises WHERE id = ?').get(exerciseId);
    if (!exercise) return res.status(400).json({ error: 'exercise does not exist' });
  } else {
    exerciseId = null;
  }

  const updates = [];
  const params = [];
  if (type !== m.type) {
    updates.push('type = ?');
    params.push(type);
  }
  if (exerciseId !== m.exercise_id) {
    updates.push('exercise_id = ?');
    params.push(exerciseId);
  }
  if (body.target !== undefined) {
    const target = toPosNum(body.target);
    if (target === null) return res.status(400).json({ error: 'target must be a positive number (kg)' });
    updates.push('target = ?');
    params.push(target);
  }
  if (body.label !== undefined) {
    const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : null;
    updates.push('label = ?');
    params.push(label);
  }
  if (body.unit !== undefined) {
    const unit = typeof body.unit === 'string' && body.unit.trim() ? body.unit.trim() : 'kg';
    updates.push('unit = ?');
    params.push(unit);
  }
  if (updates.length === 0) return res.status(400).json({ error: 'nothing to update' });

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id, req.params.clientId);
  db.prepare(`UPDATE milestone_targets SET ${updates.join(', ')} WHERE id = ? AND client_id = ?`).run(...params);
  res.json({ milestone: computeMilestone(getMilestone(req.params.id, req.params.clientId)) });
});

// DELETE /api/clients/:clientId/milestones/:id
gamificationRouter.delete('/:clientId/milestones/:id', (req, res) => {
  if (!requireClient(req, res)) return;
  const result = db
    .prepare('DELETE FROM milestone_targets WHERE id = ? AND client_id = ?')
    .run(req.params.id, req.params.clientId);
  if (result.changes === 0) return res.status(404).json({ error: 'Milestone not found' });
  res.json({ ok: true });
});
