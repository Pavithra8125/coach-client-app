// Water intake for the track date (slice 5). Quick +1/−1 steppers or a typed
// value, saved on change (upsert per client per day).
import { useEffect, useState } from 'react';

const inputCls =
  'w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-center text-sm text-slate-100 ' +
  'focus:border-slate-500 focus:outline-none';

export default function WaterCard({ water, onSet }) {
  const [value, setValue] = useState(water?.glasses != null ? String(water.glasses) : '');
  const [error, setError] = useState(null);

  // Keep the input in sync when the parent reloads (e.g. after any save).
  useEffect(() => {
    setValue(water?.glasses != null ? String(water.glasses) : '');
  }, [water?.glasses]);

  async function save(n) {
    if (!Number.isFinite(n) || n < 0) {
      setError('Enter a number ≥ 0.');
      return;
    }
    setError(null);
    try {
      await onSet(n);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    save(Number(value));
  }

  const current = water?.glasses ?? 0;

  return (
    <div className="rounded-2xl bg-slate-800 p-4">
      <h3 className="font-semibold text-slate-300">Water</h3>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => save(Math.max(0, current - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 text-lg text-slate-300 transition hover:bg-slate-700"
          aria-label="Remove a glass"
        >
          −
        </button>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputCls}
            aria-label="Glasses of water"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            Save
          </button>
        </form>
        <button
          type="button"
          onClick={() => save(current + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 text-lg text-slate-300 transition hover:bg-slate-700"
          aria-label="Add a glass"
        >
          +
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {current === 0 ? 'No water logged yet.' : `${current} glass${current === 1 ? '' : 'es'} today`}
      </p>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}
