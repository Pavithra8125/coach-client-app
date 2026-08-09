// The client's current daily macro targets (slice 5). Shows a compact target
// summary; "Set targets" / "Edit" opens a modal. Saving is an upsert — one
// plan per client.
import { useState } from 'react';

const fieldCls =
  'mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 focus:border-slate-500 focus:outline-none';
const labelCls = 'block text-xs font-medium text-slate-400';

const TARGET_ROWS = [
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'calories', label: 'Calories', unit: 'kcal' },
];

export default function MealPlanCard({ mealPlan, onSave, onDelete }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', protein: '', carbs: '', fat: '', calories: '', notes: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function openEditor() {
    setForm({
      name: mealPlan?.name ?? '',
      protein: mealPlan?.protein ? String(mealPlan.protein) : '',
      carbs: mealPlan?.carbs ? String(mealPlan.carbs) : '',
      fat: mealPlan?.fat ? String(mealPlan.fat) : '',
      calories: mealPlan?.calories ? String(mealPlan.calories) : '',
      notes: mealPlan?.notes ?? '',
    });
    setError(null);
    setOpen(true);
  }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const data = {
      name: form.name.trim() || undefined,
      protein: form.protein === '' ? undefined : Number(form.protein),
      carbs: form.carbs === '' ? undefined : Number(form.carbs),
      fat: form.fat === '' ? undefined : Number(form.fat),
      calories: form.calories === '' ? undefined : Number(form.calories),
      notes: form.notes.trim() || undefined,
    };
    try {
      await onSave(data);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!window.confirm('Clear this meal plan?')) return;
    onDelete().catch((err) => setError(err.message));
  }

  return (
    <div className="rounded-2xl bg-slate-800 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-300">Meal plan</h3>
        <button
          type="button"
          onClick={mealPlan ? handleDelete : undefined}
          className="text-xs text-slate-600 transition hover:text-red-400"
        >
          Clear
        </button>
      </div>

      {mealPlan ? (
        <div className="mt-3">
          {mealPlan.name && <p className="text-sm font-medium text-slate-200">{mealPlan.name}</p>}
          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TARGET_ROWS.map((row) => (
              <div key={row.key} className="rounded-xl border border-slate-700/60 p-2 text-center">
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">{row.label}</dt>
                <dd className="mt-0.5 text-lg font-semibold text-slate-100">
                  {mealPlan[row.key]}
                  <span className="ml-0.5 text-xs font-normal text-slate-500">{row.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
          {mealPlan.notes && <p className="mt-2 text-sm text-slate-400">{mealPlan.notes}</p>}
          <button
            type="button"
            onClick={openEditor}
            className="mt-3 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            Edit targets
          </button>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-slate-500">No daily targets set yet.</p>
          <button
            type="button"
            onClick={openEditor}
            className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Set targets
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-800 p-5">
            <h3 className="text-lg font-semibold text-slate-200">{mealPlan ? 'Edit meal plan' : 'Set meal plan'}</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className={labelCls} htmlFor="mp-name">
                  Plan name (optional)
                </label>
                <input
                  id="mp-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Cut · 2000 kcal"
                  className={fieldCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TARGET_ROWS.slice(0, 3).map((row) => (
                  <div key={row.key}>
                    <label className={labelCls} htmlFor={`mp-${row.key}`}>
                      {row.label} ({row.unit}/day)
                    </label>
                    <input
                      id={`mp-${row.key}`}
                      type="number"
                      min="0"
                      step="0.1"
                      value={form[row.key]}
                      onChange={(e) => set(row.key, e.target.value)}
                      placeholder="0"
                      className={fieldCls}
                    />
                  </div>
                ))}
                <div>
                  <label className={labelCls} htmlFor="mp-calories">
                    Calories ({'kcal/day'})
                  </label>
                  <input
                    id="mp-calories"
                    type="number"
                    min="0"
                    step="1"
                    value={form.calories}
                    onChange={(e) => set('calories', e.target.value)}
                    placeholder="0"
                    className={fieldCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="mp-notes">
                  Notes
                </label>
                <textarea
                  id="mp-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="e.g. higher carbs on leg day"
                  className={fieldCls}
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
