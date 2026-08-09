// Supplement tracker (slice 5). Each supplement is a row with a "taken today"
// checkbox; toggling it saves the whole day's taken set. Add new supplements
// inline; remove them from the list with ×.
import { useState } from 'react';

const inputCls =
  'flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 focus:border-slate-500 focus:outline-none';

export default function SupplementCard({ supplements, taken, onSetTaken, onAdd, onDelete }) {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function toggle(supp, checked) {
    const next = checked ? [...taken, supp.id] : taken.filter((id) => id !== supp.id);
    setError(null);
    setBusy(true);
    onSetTaken(next)
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    try {
      await onAdd(trimmed);
      setName('');
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDelete(supp) {
    if (!window.confirm(`Remove "${supp.name}" from the supplement list?`)) return;
    setError(null);
    onDelete(supp.id).catch((err) => setError(err.message));
  }

  return (
    <div className="rounded-2xl bg-slate-800 p-4">
      <h3 className="font-semibold text-slate-300">Supplements</h3>

      <ul className="mt-3 space-y-1.5">
        {supplements.length === 0 ? (
          <p className="text-sm text-slate-500">No supplements on the list yet.</p>
        ) : (
          supplements.map((supp) => {
            const checked = taken.includes(supp.id);
            return (
              <li
                key={supp.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-700/60 px-3 py-2"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={busy}
                    onChange={(e) => toggle(supp, e.target.checked)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  <span className={`truncate text-sm ${checked ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                    {supp.name}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => handleDelete(supp)}
                  className="shrink-0 text-xs text-slate-600 transition hover:text-red-400"
                  aria-label={`Remove ${supp.name}`}
                >
                  ×
                </button>
              </li>
            );
          })
        )}
      </ul>

      <form onSubmit={handleAdd} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add supplement…"
          className={inputCls}
          autoComplete="off"
        />
        <button
          type="submit"
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Add
        </button>
      </form>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}
