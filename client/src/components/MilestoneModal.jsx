// Add/edit modal for a coach-set milestone target (slice 7). Two kinds: a body
// weight goal (progress from the weight log) or a lift goal (progress from the
// best estimated 1RM on a chosen exercise). The coach enters the target in kg.
import { useState } from 'react';

const fieldCls =
  'mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 focus:border-slate-500 focus:outline-none';
const labelCls = 'block text-xs font-medium text-slate-400';

export default function MilestoneModal({ milestone, exercises, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    type: milestone?.type ?? 'weight',
    label: milestone?.label ?? '',
    target: milestone ? String(milestone.target) : '',
    exercise_id: milestone?.exercise_id ? String(milestone.exercise_id) : '',
  }));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const data = {
      type: form.type,
      label: form.label.trim() || undefined,
      target: Number(form.target),
      exercise_id: form.type === 'exercise' ? Number(form.exercise_id) : null,
    };
    try {
      await onSave(data);
      // Parent closes the modal on success.
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 p-5">
        <h3 className="text-lg font-semibold text-slate-200">
          {milestone ? 'Edit target' : 'New target'}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className={labelCls} htmlFor="ms-type">
              Track
            </label>
            <select
              id="ms-type"
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className={fieldCls}
            >
              <option value="weight">Body weight</option>
              <option value="exercise">Lift PR (est. 1RM)</option>
            </select>
          </div>

          {form.type === 'exercise' && (
            <div>
              <label className={labelCls} htmlFor="ms-exercise">
                Exercise
              </label>
              <select
                id="ms-exercise"
                value={form.exercise_id}
                onChange={(e) => set('exercise_id', e.target.value)}
                className={fieldCls}
                required
              >
                <option value="">Select exercise…</option>
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelCls} htmlFor="ms-target">
              Target (kg)
            </label>
            <input
              id="ms-target"
              type="number"
              min="0.5"
              step="0.1"
              value={form.target}
              onChange={(e) => set('target', e.target.value)}
              placeholder="e.g. 80"
              className={fieldCls}
              required
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="ms-label">
              Label (optional)
            </label>
            <input
              id="ms-label"
              type="text"
              value={form.label}
              onChange={(e) => set('label', e.target.value)}
              placeholder="e.g. Get under 80 kg"
              className={fieldCls}
            />
          </div>

          {form.type === 'weight' && (
            <p className="text-xs text-slate-500">
              Progress is measured from the client&apos;s first logged weight toward the target.
            </p>
          )}
          {form.type === 'exercise' && (
            <p className="text-xs text-slate-500">
              Progress uses the best estimated 1RM across logged sets for that exercise.
            </p>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
