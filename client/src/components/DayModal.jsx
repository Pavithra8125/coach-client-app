// Add/edit a workout plan day. The shared exercise library is listed as
// checkboxes; new exercises can be added inline (they join the library, then
// get checked). onSave is called on success — let it throw to show the error.
import { useState } from 'react';

const CATEGORIES = ['chest', 'legs', 'back', 'shoulders', 'arms', 'core'];

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 ' +
  'placeholder-slate-500 outline-none focus:border-slate-500';

export default function DayModal({ day, exercises, onAddExercise, onSave, onClose }) {
  const [name, setName] = useState(day?.name ?? '');
  const [checked, setChecked] = useState(() => new Set((day?.exercises ?? []).map((ex) => ex.id)));
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(day);

  function toggle(exerciseId) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  }

  async function handleAddNew(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      const exercise = await onAddExercise(newName.trim(), newCategory || null);
      setChecked((prev) => new Set(prev).add(exercise.id));
      setNewName('');
      setNewCategory('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Give the day a name');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({ dayId: day?.id ?? null, name: name.trim(), exerciseIds: [...checked] });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/50 bg-white/95 p-6 backdrop-blur-xl shadow-2xl"
      >
        <h2 className="text-xl font-bold text-slate-900">
          {isEdit ? 'Edit workout day' : 'Add workout day'}
        </h2>

        <label htmlFor="day-name" className="mt-4 block text-sm font-medium text-slate-800">
          Day name *
        </label>
        <input
          id="day-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder="e.g. Pull Day"
          className={inputClass}
        />

        <p className="mt-4 text-sm font-medium text-slate-800">Exercises</p>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200">
          {exercises.length === 0 ? (
            <p className="p-3 text-sm text-slate-700">No exercises in the library yet — add one below.</p>
          ) : (
            <ul className="divide-y divide-slate-700/60">
              {exercises.map((exercise) => (
                <li key={exercise.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition hover:bg-slate-100/40">
                    <input
                      type="checkbox"
                      checked={checked.has(exercise.id)}
                      onChange={() => toggle(exercise.id)}
                      className="h-4 w-4 accent-slate-900"
                    />
                    <span className="text-slate-700">{exercise.name}</span>
                    {exercise.category && <span className="text-xs text-slate-700">{exercise.category}</span>}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleAddNew} className="mt-3 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New exercise…"
            className={`${inputClass} mt-0`}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className={`${inputClass} mt-0 w-36`}
          >
            <option value="">No category</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
          >
            Add
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add day'}
          </button>
        </div>
      </div>
    </div>
  );
}
