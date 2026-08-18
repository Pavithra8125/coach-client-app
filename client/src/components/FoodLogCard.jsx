// Daily food log (slice 5). Add food items for the track date; each row shows
// its macros with a delete button. A summary row compares the day's totals
// against the client's meal-plan targets.
import { useState } from 'react';
import { addFood, deleteFood } from '../api/diet.js';

const fieldCls =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 focus:border-slate-500 focus:outline-none';
const labelCls = 'block text-xs font-medium text-slate-400';
const macroCls =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 focus:border-slate-500 focus:outline-none';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];

function fmtMacro(n) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

const TOTALS = [
  { key: 'protein', label: 'Protein', unit: 'g', theme: { bar: 'from-blue-500 to-cyan-400', text: 'text-blue-400' } },
  { key: 'carbs', label: 'Carbs', unit: 'g', theme: { bar: 'from-amber-500 to-yellow-400', text: 'text-amber-400' } },
  { key: 'fat', label: 'Fat', unit: 'g', theme: { bar: 'from-purple-500 to-fuchsia-400', text: 'text-purple-400' } },
  { key: 'calories', label: 'Calories', unit: 'kcal', theme: { bar: 'from-orange-500 to-red-400', text: 'text-orange-400' } },
];

function TotalsRow({ totals, targets }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {TOTALS.map((row) => {
        const target = targets?.[row.key] ?? 0;
        const value = totals[row.key] ?? 0;
        const over = target > 0 && value > target;
        
        let progress = 0;
        if (target > 0) {
          progress = Math.min(100, (value / target) * 100);
        }

        return (
          <div key={row.key} className="group relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-800/90 p-3.5 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-600 hover:shadow-md">
            <div className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${row.theme.bar}`} />
            
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{row.label}</div>
            <div className={`mt-1 text-2xl font-extrabold tracking-tight ${over ? row.theme.text : 'text-white'}`}>
              {fmtMacro(value)}
            </div>
            
            <div className="mt-1 text-xs text-slate-500">
              {target > 0 ? `target ${fmtMacro(target)} ${row.unit}` : 'no target'}
            </div>

            {target > 0 && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-700/50">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r ${row.theme.bar} transition-all duration-500 ease-out`} 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FoodLogCard({ clientId, date, entries, totals, targets, onChanged }) {
  const [meal, setMeal] = useState('');
  const [foodName, setFoodName] = useState('');
  const [form, setForm] = useState({ protein: '', carbs: '', fat: '', calories: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function setMacro(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const name = foodName.trim();
    if (!name) {
      setError('Add a food name.');
      return;
    }
    const data = {
      date,
      food_name: name,
      meal_label: meal || null,
      protein: form.protein === '' ? 0 : Number(form.protein),
      carbs: form.carbs === '' ? 0 : Number(form.carbs),
      fat: form.fat === '' ? 0 : Number(form.fat),
      calories: form.calories === '' ? 0 : Number(form.calories),
    };
    setSaving(true);
    setError(null);
    try {
      await addFood(clientId, data);
      setFoodName('');
      setForm({ protein: '', carbs: '', fat: '', calories: '' });
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry) {
    if (!window.confirm(`Remove "${entry.food_name}" from this day?`)) return;
    try {
      await deleteFood(clientId, entry.id);
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  const grouped = MEALS.map((m) => ({
    meal: m,
    items: entries.filter((e) => (e.meal_label ?? '') === m),
  }));
  const snacks = entries.filter((e) => !e.meal_label || !MEALS.includes(e.meal_label));

  return (
    <div className="rounded-2xl bg-slate-800 p-4">
      <h3 className="font-semibold text-slate-300">Food log</h3>

      <div className="mt-3">
        <TotalsRow totals={totals} targets={targets} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-2 rounded-xl border border-slate-700/60 p-3">
        <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
          <div>
            <label className={labelCls} htmlFor="fl-meal">
              Meal
            </label>
            <select id="fl-meal" value={meal} onChange={(e) => setMeal(e.target.value)} className={fieldCls}>
              <option value="">Any</option>
              {MEALS.map((m) => (
                <option key={m} value={m}>
                  {m[0].toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className={labelCls} htmlFor="fl-name">
              Food
            </label>
            <input
              id="fl-name"
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="e.g. oats with whey"
              className={fieldCls}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {TOTALS.slice(0, 3).map((row) => (
            <div key={row.key}>
              <label className={labelCls} htmlFor={`fl-${row.key}`}>
                {row.label} ({row.unit})
              </label>
              <input
                id={`fl-${row.key}`}
                type="number"
                min="0"
                step="0.1"
                value={form[row.key]}
                onChange={(e) => setMacro(row.key, e.target.value)}
                placeholder="0"
                className={macroCls}
              />
            </div>
          ))}
          <div>
            <label className={labelCls} htmlFor="fl-calories">
              Calories (kcal)
            </label>
            <input
              id="fl-calories"
              type="number"
              min="0"
              step="1"
              value={form.calories}
              onChange={(e) => setMacro('calories', e.target.value)}
              placeholder="0"
              className={macroCls}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Adding…' : 'Add food'}
        </button>
      </form>

      <div className="mt-4 space-y-4">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing logged for this day yet.</p>
        ) : (
          <>
            {grouped
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <div key={g.meal}>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {g.meal[0].toUpperCase() + g.meal.slice(1)}
                  </h4>
                  <ul className="space-y-1.5">
                    {g.items.map((entry) => (
                      <FoodRow key={entry.id} entry={entry} onDelete={handleDelete} />
                    ))}
                  </ul>
                </div>
              ))}
            {snacks.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Other</h4>
                <ul className="space-y-1.5">
                  {snacks.map((entry) => (
                    <FoodRow key={entry.id} entry={entry} onDelete={handleDelete} />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FoodRow({ entry, onDelete }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/60 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-200">{entry.food_name}</p>
        <p className="text-xs text-slate-500">
          {fmtMacro(entry.protein)}g P · {fmtMacro(entry.carbs)}g C · {fmtMacro(entry.fat)}g F ·{' '}
          {fmtMacro(entry.calories)} kcal
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDelete(entry)}
        className="shrink-0 text-xs text-slate-600 transition hover:text-red-400"
        aria-label={`Remove ${entry.food_name}`}
      >
        Remove
      </button>
    </li>
  );
}
