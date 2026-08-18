// Per-client gamification panel (slice 7): streak counters, a GitHub-style
// workout heatmap, achievement badges, and coach-set milestone countdowns.
// Everything is derived server-side from existing workout / weight data.
// Rendered inside ClientDetail.
import { useCallback, useEffect, useState } from 'react';
import {
  createMilestone,
  deleteMilestone,
  getGamification,
  getMilestones,
  updateMilestone,
} from '../api/gamification.js';
import { listExercises } from '../api/workouts.js';
import MilestoneModal from './MilestoneModal.jsx';

// Heatmap color ramp — high-contrast electric green-to-lime ramp
const HEAT = [
  '#0f172a', // 0 sets: slate-900
  '#064e3b', // 1 set: emerald-900
  '#047857', // 2 sets: emerald-700
  '#059669', // 3 sets: emerald-600
  '#10b981', // 4 sets: emerald-500
  '#22c55e', // 5 sets: green-500
  '#84cc16', // 6+ sets: electric lime
];

function heatColor(count) {
  if (count == null || count <= 0) return HEAT[0];
  if (count === 1) return HEAT[1];
  if (count <= 2) return HEAT[2];
  if (count <= 3) return HEAT[3];
  if (count <= 4) return HEAT[4];
  if (count <= 5) return HEAT[5];
  return HEAT[6];
}

function fmtDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Build week columns (Mon→Sun) from the dense day list the server returns.
function buildWeeks(heatmap) {
  const { start, end, days } = heatmap ?? {};
  if (!days?.length) return [];
  const countByDate = new Map(days.map((d) => [d.date, d.count]));
  const last = new Date(`${end}T00:00:00Z`);
  const lastMonday = new Date(last);
  lastMonday.setUTCDate(last.getUTCDate() - ((last.getUTCDay() + 6) % 7));
  const weeks = [];
  for (let w = new Date(`${start}T00:00:00Z`); w <= lastMonday; w.setUTCDate(w.getUTCDate() + 7)) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(w);
      dt.setUTCDate(w.getUTCDate() + d);
      const iso = dt.toISOString().slice(0, 10);
      // Days outside [start, end] (e.g. future cells in the last week) are blank.
      cells.push({ date: iso, count: iso < start || iso > end ? null : countByDate.get(iso) ?? 0 });
    }
    weeks.push({ monday: w.toISOString().slice(0, 10), cells });
  }
  return weeks;
}

// Label the column where the month of the week's Monday changes.
function monthLabels(weeks) {
  const labels = [];
  let prev = null;
  weeks.forEach((week, i) => {
    const month = MONTHS[new Date(`${week.monday}T00:00:00Z`).getUTCMonth()];
    if (month !== prev) {
      labels.push({ index: i, label: month });
      prev = month;
    }
  });
  return labels;
}

function Heatmap({ heatmap }) {
  const weeks = buildWeeks(heatmap);
  if (weeks.length === 0) {
    return (
      <p className="mt-3 rounded-xl border border-dashed border-slate-700/80 px-3 py-4 text-center text-sm text-slate-400">
        No workouts logged yet — the calendar fills in as sessions are added.
      </p>
    );
  }
  const labels = monthLabels(weeks);
  return (
    <div className="mt-3 overflow-x-auto">
      <div className="flex">
        <div className="flex w-6 flex-col gap-[3px] pt-5 text-[10px] font-medium leading-3 text-slate-400">
          {['Mon', '', 'Wed', '', 'Fri', '', ''].map((l, i) => (
            <span key={i} className="h-3">
              {l}
            </span>
          ))}
        </div>
        <div>
          <div className="relative h-4 text-[10px] font-medium text-slate-400">
            {labels.map(({ index, label }) => (
              <span key={index} className="absolute" style={{ left: `${index * 15}px` }}>
                {label}
              </span>
            ))}
          </div>
          <div className="mt-1 flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.cells.map((cell, ci) =>
                  cell.count === null ? (
                    <div key={ci} className="h-3 w-3 rounded-[3px] opacity-0" />
                  ) : (
                    <div key={ci} className="group relative">
                      <div
                        className="h-3 w-3 rounded-[3px] border border-black/20 transition-transform duration-150 hover:scale-125"
                        style={{ background: heatColor(cell.count) }}
                      />
                      <div className="pointer-events-none invisible absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-medium text-slate-200 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100">
                        {fmtDate(cell.date)} ·{' '}
                        {cell.count === 0 ? 'No workout' : `${cell.count} ${cell.count === 1 ? 'set' : 'sets'}`}
                      </div>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] font-medium text-slate-400">
        <span>Less</span>
        {HEAT.map((color) => (
          <span
            key={color}
            className="h-3 w-3 rounded-[3px] border border-black/20"
            style={{ background: color }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function StreakCard({ icon, label, value, unit, accent }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-800/90 p-4.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-600 hover:shadow-md">
      {/* Top accent bar */}
      <div className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${accent.bar}`} />

      <div className="flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg shadow-sm ${accent.badge}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-xs text-slate-500">{unit}</p>
    </div>
  );
}

function BadgeTile({ badge }) {
  const locked = !badge.earned;
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        locked
          ? 'border-slate-800 bg-slate-900/50 opacity-75 hover:border-slate-700 hover:opacity-100'
          : 'border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 to-slate-800/90 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl border text-2xl transition-transform duration-200 group-hover:scale-105 ${
            locked
              ? 'border-slate-800 bg-slate-800/60 grayscale opacity-50'
              : 'border-emerald-500/30 bg-emerald-500/10 shadow-sm'
          }`}
        >
          {badge.icon}
        </div>
        {badge.earned ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
            ✓ Earned
          </span>
        ) : (
          <span className="rounded-full border border-slate-800 bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
            Locked
          </span>
        )}
      </div>

      <p className={`mt-3 text-sm font-bold tracking-tight ${locked ? 'text-slate-400' : 'text-slate-100'}`}>
        {badge.name}
      </p>
      <p className="mt-0.5 text-xs text-slate-400">{badge.description}</p>

      {badge.earned && badge.earned_at && (
        <p className="mt-2 text-[11px] font-medium text-emerald-400/90">
          Unlocked {fmtDate(badge.earned_at)}
        </p>
      )}

      {locked && badge.progress_pct != null && (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-slate-950/80 p-0.5 border border-slate-800/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, badge.progress_pct))}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-slate-400">{badge.progress_label}</p>
        </div>
      )}
    </div>
  );
}

function MilestoneRow({ m, onEdit, onDelete }) {
  const title = m.label || (m.type === 'exercise' ? m.exercise_name : 'Body weight');
  const hasProgress = m.progress_pct != null;
  return (
    <li className="group rounded-xl border border-slate-700/60 bg-slate-800/60 p-3.5 transition-all duration-200 hover:border-slate-600 hover:bg-slate-800/90">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-100">{title}</p>
          <p className="text-xs text-slate-400">
            {m.current != null ? (
              <span className="font-semibold text-slate-200">{m.current} {m.unit}</span>
            ) : (
              'No data logged yet'
            )}
            <span className="text-slate-500"> · target {m.target} {m.unit}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {m.reached ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
              Reached 🎉
            </span>
          ) : (
            m.current != null &&
            m.remaining != null && (
              <span className="whitespace-nowrap text-xs font-medium text-slate-300">
                <span className="font-bold text-white">{m.remaining}</span> {m.unit} to go
              </span>
            )
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(m)}
              className="text-xs font-medium text-slate-400 transition hover:text-slate-200"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(m)}
              className="text-xs font-medium text-slate-500 transition hover:text-red-400"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
      {hasProgress && (
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-950/80 p-0.5 border border-slate-800/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, m.progress_pct))}%` }}
          />
        </div>
      )}
    </li>
  );
}

export default function ClientGamification({ clientId }) {
  const [streak, setStreak] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [badges, setBadges] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null, or { milestone } for add/edit
  const [exercises, setExercises] = useState([]);

  const reload = useCallback(() => {
    return Promise.all([getGamification(clientId), getMilestones(clientId)])
      .then(([g, m]) => {
        setStreak(g.streak);
        setHeatmap(g.heatmap);
        setBadges(g.badges);
        setMilestones(m.milestones);
      })
      .catch((err) => setError(err.message));
  }, [clientId]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  // The milestone modal needs the exercise library for lift targets; fetch it
  // lazily when the modal opens rather than on every page load.
  async function openModal(milestone) {
    setError(null);
    try {
      const { exercises: ex } = await listExercises();
      setExercises(ex);
      setModal({ milestone: milestone ?? null });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSave(data) {
    const editing = modal.milestone;
    if (editing) await updateMilestone(clientId, editing.id, data);
    else await createMilestone(clientId, data);
    setModal(null);
    await reload();
  }

  async function handleDelete(m) {
    if (!window.confirm(`Delete the "${m.label || 'target'}" milestone?`)) return;
    setError(null);
    try {
      await deleteMilestone(clientId, m.id);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="mt-8 text-slate-400">Loading gamification…</p>;

  const streakStats = streak
    ? [
        {
          icon: '🔥',
          label: 'Current streak',
          value: streak.current_days,
          unit: streak.current_days === 1 ? 'day logged in a row' : 'days logged in a row',
          accent: {
            bar: 'from-orange-500 to-amber-500',
            badge: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
          },
        },
        {
          icon: '🏅',
          label: 'Best streak',
          value: streak.best_days,
          unit: 'days',
          accent: {
            bar: 'from-amber-500 to-yellow-400',
            badge: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
          },
        },
        {
          icon: '📅',
          label: 'Current week streak',
          value: streak.current_weeks,
          unit: streak.current_weeks === 1 ? 'week in a row' : 'weeks in a row',
          accent: {
            bar: 'from-emerald-500 to-teal-400',
            badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
          },
        },
        {
          icon: '🌟',
          label: 'Best week streak',
          value: streak.best_weeks,
          unit: 'weeks',
          accent: {
            bar: 'from-blue-500 to-cyan-400',
            badge: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
          },
        },
      ]
    : [];

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-slate-200">Gamification</h2>

      {error && <p className="mb-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>}

      {/* Streaks */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {streakStats.map((s) => (
          <StreakCard key={s.label} {...s} />
        ))}
      </div>

      {/* Heatmap */}
      <div className="mt-4 rounded-2xl border border-slate-700/80 bg-slate-800/90 p-4 shadow-sm">
        <h3 className="font-semibold text-slate-200">Workout calendar</h3>
        <p className="text-xs text-slate-400">Sets logged per day, over the last six months.</p>
        <Heatmap heatmap={heatmap} />
      </div>

      {/* Badges */}
      <div className="mt-4 rounded-2xl border border-slate-700/80 bg-slate-800/90 p-4 shadow-sm">
        <h3 className="font-semibold text-slate-200">Achievements</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {badges.map((b) => (
            <BadgeTile key={b.id} badge={b} />
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="mt-4 rounded-2xl border border-slate-700/80 bg-slate-800/90 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-200">Milestones</h3>
            <p className="text-xs text-slate-400">
              Coach-set targets with live progress toward them.
            </p>
          </div>
          <button
            onClick={() => openModal(null)}
            className="shrink-0 rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow"
          >
            Add target
          </button>
        </div>
        {milestones.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-700/80 px-3 py-4 text-center text-sm text-slate-400">
            No targets set yet — add a body-weight or lift target to track.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {milestones.map((m) => (
              <MilestoneRow key={m.id} m={m} onEdit={(milestone) => openModal(milestone)} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </div>

      {modal !== null && (
        <MilestoneModal
          milestone={modal.milestone}
          exercises={exercises}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </section>
  );
}
