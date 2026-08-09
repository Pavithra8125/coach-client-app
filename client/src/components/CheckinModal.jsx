// Add/edit modal for a weekly check-in (slice 6): date + 1-10 ratings for
// energy / soreness / sleep, an adherence %, and notes. Saving is an upsert —
// a later check-in for the same date replaces the earlier one.
import { useState } from 'react';

const fieldCls =
  'mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 focus:border-slate-500 focus:outline-none';
const labelCls = 'block text-xs font-medium text-slate-400';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const RATING_ROWS = [
  { key: 'energy', label: 'Energy', min: 1, max: 10, unit: '/10' },
  { key: 'soreness', label: 'Soreness', min: 1, max: 10, unit: '/10' },
  { key: 'sleep', label: 'Sleep', min: 1, max: 10, unit: '/10' },
  { key: 'adherence', label: 'Adherence', min: 0, max: 100, unit: '%' },
];

export default function CheckinModal({ checkin, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    date: checkin?.date ?? todayStr(),
    energy: checkin?.energy != null ? String(checkin.energy) : '',
    soreness: checkin?.soreness != null ? String(checkin.soreness) : '',
    sleep: checkin?.sleep != null ? String(checkin.sleep) : '',
    adherence: checkin?.adherence != null ? String(checkin.adherence) : '',
    notes: checkin?.notes ?? '',
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
      date: form.date,
      energy: form.energy === '' ? undefined : Number(form.energy),
      soreness: form.soreness === '' ? undefined : Number(form.soreness),
      sleep: form.sleep === '' ? undefined : Number(form.sleep),
      adherence: form.adherence === '' ? undefined : Number(form.adherence),
      notes: form.notes.trim() || undefined,
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
          {checkin ? `Edit check-in · ${checkin.date}` : 'New check-in'}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className={labelCls} htmlFor="ci-date">
              Date
            </label>
            <input
              id="ci-date"
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              className={fieldCls}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {RATING_ROWS.map((row) => (
              <div key={row.key}>
                <label className={labelCls} htmlFor={`ci-${row.key}`}>
                  {row.label} ({row.unit.slice(1)})
                </label>
                <input
                  id={`ci-${row.key}`}
                  type="number"
                  min={row.min}
                  max={row.max}
                  step="1"
                  value={form[row.key]}
                  onChange={(e) => set(row.key, e.target.value)}
                  placeholder={`${row.min}–${row.max}`}
                  className={fieldCls}
                />
              </div>
            ))}
          </div>

          <div>
            <label className={labelCls} htmlFor="ci-notes">
              Notes (optional)
            </label>
            <textarea
              id="ci-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="How the week went, anything to adjust…"
              className={fieldCls}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <p className="text-xs text-slate-500">
            Saving a check-in replaces any earlier check-in on the same date.
          </p>

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
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save check-in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}