import { useState, useEffect } from 'react';

const labelCls = 'block text-xs font-medium text-slate-400';
const fieldCls = 'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 sm:py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MeasurementForm({ initialData, onSubmit, onCancel }) {
  const [fields, setFields] = useState({
    logged_date: todayStr(),
    weight_kg: '',
    body_fat_pct: '',
    waist_cm: '',
    chest_cm: '',
    notes: '',
  });

  useEffect(() => {
    if (initialData) {
      setFields({
        logged_date: initialData.logged_date || todayStr(),
        weight_kg: initialData.weight_kg ?? '',
        body_fat_pct: initialData.body_fat_pct ?? '',
        waist_cm: initialData.waist_cm ?? '',
        chest_cm: initialData.chest_cm ?? '',
        notes: initialData.notes ?? '',
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(fields);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="m-date">Date</label>
          <input
            id="m-date"
            type="date"
            value={fields.logged_date}
            onChange={(e) => setFields((f) => ({ ...f, logged_date: e.target.value }))}
            className={fieldCls}
            required
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="m-weight">Weight (kg)</label>
          <input
            id="m-weight"
            type="number"
            min="0"
            step="0.1"
            value={fields.weight_kg}
            onChange={(e) => setFields((f) => ({ ...f, weight_kg: e.target.value }))}
            className={fieldCls}
            placeholder="e.g. 79.4"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="m-bf">Body Fat (%)</label>
          <input
            id="m-bf"
            type="number"
            min="0"
            step="0.1"
            value={fields.body_fat_pct}
            onChange={(e) => setFields((f) => ({ ...f, body_fat_pct: e.target.value }))}
            className={fieldCls}
            placeholder="e.g. 15.5"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="m-waist">Waist (cm)</label>
          <input
            id="m-waist"
            type="number"
            min="0"
            step="0.1"
            value={fields.waist_cm}
            onChange={(e) => setFields((f) => ({ ...f, waist_cm: e.target.value }))}
            className={fieldCls}
            placeholder="e.g. 85"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="m-chest">Chest (cm)</label>
          <input
            id="m-chest"
            type="number"
            min="0"
            step="0.1"
            value={fields.chest_cm}
            onChange={(e) => setFields((f) => ({ ...f, chest_cm: e.target.value }))}
            className={fieldCls}
            placeholder="e.g. 100"
          />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="m-notes">Notes</label>
        <textarea
          id="m-notes"
          value={fields.notes}
          onChange={(e) => setFields((f) => ({ ...f, notes: e.target.value }))}
          className={`${fieldCls} h-20 resize-none`}
          placeholder="Any extra notes (e.g., Arms: 35cm)"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-5 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:from-blue-400 hover:to-blue-500"
        >
          {initialData ? 'Save Changes' : 'Log Measurement'}
        </button>
      </div>
    </form>
  );
}
