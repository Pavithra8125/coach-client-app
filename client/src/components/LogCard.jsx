// Log / edit a workout session for a date (slice 4). Picking a plan day
// pre-fills its exercises; each exercise gets a dynamic list of weight×reps
// sets. Saving is an upsert — saving again for the same date replaces that
// day's session. Recent sessions can be loaded back into the form or deleted.
import { useState } from 'react';
import { deleteSession, logSession } from '../api/workouts.js';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const fieldCls =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 focus:border-slate-500 focus:outline-none';
const setCls =
  'w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 ' +
  'focus:border-slate-500 focus:outline-none';
const labelCls = 'block text-xs font-medium text-slate-400';

export default function LogCard({ clientId, plan, exercises, sessions, onSaved }) {
  const [date, setDate] = useState(todayStr());
  const [dayId, setDayId] = useState('');
  const [manualEx, setManualEx] = useState('');
  const [rows, setRows] = useState([]); // [{ key, exercise_id, sets: [{ weight, reps }] }]
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const exerciseName = (id) => exercises.find((ex) => ex.id === id)?.name ?? 'Exercise';

  function loadDay(id) {
    setDayId(id);
    // Select option values are strings; day ids are numbers.
    const day = plan.find((d) => String(d.id) === id);
    setRows(
      (day?.exercises ?? []).map((ex) => ({
        key: crypto.randomUUID(),
        exercise_id: ex.id,
        sets: [{ weight: '', reps: '' }],
      }))
    );
  }

  function addManualExercise() {
    const id = Number(manualEx);
    if (!id || rows.some((row) => row.exercise_id === id)) return;
    setRows((prev) => [
      ...prev,
      { key: crypto.randomUUID(), exercise_id: id, sets: [{ weight: '', reps: '' }] },
    ]);
    setManualEx('');
  }

  function addSet(rowKey) {
    setRows((prev) =>
      prev.map((row) =>
        row.key === rowKey ? { ...row, sets: [...row.sets, { weight: '', reps: '' }] } : row
      )
    );
  }

  function removeSet(rowKey, idx) {
    setRows((prev) =>
      prev.map((row) =>
        row.key === rowKey
          ? { ...row, sets: row.sets.length > 1 ? row.sets.filter((_, i) => i !== idx) : row.sets }
          : row
      )
    );
  }

  function setRowField(rowKey, idx, field, value) {
    setRows((prev) =>
      prev.map((row) =>
        row.key === rowKey
          ? { ...row, sets: row.sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) }
          : row
      )
    );
  }

  function removeRow(rowKey) {
    setRows((prev) => prev.filter((row) => row.key !== rowKey));
  }

  function loadSession(session) {
    setDate(session.date);
    setDayId(session.workout_day_id ? String(session.workout_day_id) : '');
    setNotes(session.notes ?? '');
    setRows(
      session.exercises.map((ex) => ({
        key: crypto.randomUUID(),
        exercise_id: ex.id,
        sets: ex.sets.map((s) => ({ weight: String(s.weight), reps: String(s.reps) })),
      }))
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const sets = [];
    for (const row of rows) {
      for (const s of row.sets) {
        if (s.weight === '' && s.reps === '') continue; // blank row = unused
        const weight = Number(s.weight);
        const reps = Number(s.reps);
        if (!Number.isFinite(weight) || weight <= 0 || !Number.isInteger(reps) || reps <= 0) {
          setError('Each set needs a positive weight (kg) and whole-number reps.');
          return;
        }
        sets.push({ exercise_id: row.exercise_id, weight, reps });
      }
    }
    if (sets.length === 0) {
      setError('Add at least one set before saving.');
      return;
    }

    setSaving(true);
    try {
      await logSession(clientId, { date, workout_day_id: dayId || null, notes: notes || null, sets });
      setRows([]);
      setNotes('');
      setDate(todayStr());
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(session) {
    if (!window.confirm(`Delete the ${fmtDate(session.date)} workout?`)) return;
    try {
      await deleteSession(clientId, session.id);
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  const totalSets = sessions.reduce((n, s) => n + s.exercises.reduce((m, ex) => m + ex.sets.length, 0), 0);

  return (
    <div className="rounded-2xl bg-slate-800 p-4">
      <h3 className="font-semibold text-slate-300">Log workout</h3>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelCls} htmlFor="log-date">
              Date
            </label>
            <input
              id="log-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={fieldCls}
              required
            />
          </div>
          <div className="flex-1">
            <label className={labelCls} htmlFor="log-day">
              Plan day (optional)
            </label>
            <select id="log-day" value={dayId} onChange={(e) => loadDay(e.target.value)} className={fieldCls}>
              <option value="">— no plan day —</option>
              {plan.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">
            Pick a plan day above, or add an exercise below to log a free session.
          </p>
        ) : null}

        {rows.map((row) => (
          <div key={row.key} className="rounded-xl border border-slate-700/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">{exerciseName(row.exercise_id)}</span>
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                className="text-xs text-slate-500 transition hover:text-red-400"
              >
                Remove
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {row.sets.map((set, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-10 text-xs text-slate-500">Set {idx + 1}</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    kg
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={set.weight}
                      onChange={(e) => setRowField(row.key, idx, 'weight', e.target.value)}
                      placeholder="0"
                      className={setCls}
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    reps
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={set.reps}
                      onChange={(e) => setRowField(row.key, idx, 'reps', e.target.value)}
                      placeholder="0"
                      className={setCls}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeSet(row.key, idx)}
                    disabled={row.sets.length === 1}
                    className="text-xs text-slate-600 transition hover:text-red-400 disabled:opacity-30"
                    aria-label="Remove set"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addSet(row.key)}
              className="mt-2 text-xs text-blue-400 transition hover:text-blue-300"
            >
              + Add set
            </button>
          </div>
        ))}

        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label className={labelCls} htmlFor="manual-ex">
              Add an exercise
            </label>
            <select
              id="manual-ex"
              value={manualEx}
              onChange={(e) => setManualEx(e.target.value)}
              className={fieldCls}
            >
              <option value="">Pick from library…</option>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={addManualExercise}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            Add
          </button>
        </div>

        <div>
          <label className={labelCls} htmlFor="log-notes">
            Notes
          </label>
          <textarea
            id="log-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. felt strong today"
            className={fieldCls}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save workout'}
        </button>
        <p className="text-xs text-slate-500">
          Saving again for the same date replaces that day&apos;s workout.
        </p>
      </form>

      <div className="mt-5">
        <h4 className="mb-2 text-sm font-semibold text-slate-300">
          Recent sessions{sessions.length > 0 ? ` (${totalSets} sets)` : ''}
        </h4>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">No sessions logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((session) => (
              <li key={session.id} className="rounded-xl border border-slate-700/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200">{fmtDate(session.date)}</p>
                    <p className="truncate text-xs text-slate-500">
                      {session.day_name ?? 'Free session'} · {session.exercises.length}{' '}
                      exercise{session.exercises.length === 1 ? '' : 's'} ·{' '}
                      {session.exercises.reduce((n, ex) => n + ex.sets.length, 0)} sets
                      {session.notes ? ` — ${session.notes}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => loadSession(session)}
                      className="text-xs text-slate-500 transition hover:text-slate-300"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(session)}
                      className="text-xs text-slate-500 transition hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
