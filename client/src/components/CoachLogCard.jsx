// The coach's log for a client (slice 6): private, dated journal notes. The
// coach adds observations over time; they're shown newest first and deletable.
import { useState } from 'react';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CoachLogCard({ notes, onAdd, onDelete }) {
  const [text, setText] = useState('');
  const [date, setDate] = useState(todayStr());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) {
      setError('Write a note first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAdd(text.trim(), date);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-slate-800 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-300">Coach's log</h3>
        <span className="text-xs text-slate-600">Private</span>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 space-y-2">
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Private note about this client…"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
            aria-label="Note date"
          />
          <button
            type="submit"
            disabled={saving}
            className="ml-auto rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add note'}
          </button>
        </div>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      {notes.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No notes yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-slate-700/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">{n.date}</span>
                <button
                  type="button"
                  onClick={() => onDelete(n.id)}
                  className="text-xs text-slate-600 transition hover:text-red-400"
                >
                  Delete
                </button>
              </div>
              <p className="mt-1 text-sm text-slate-300">{n.note}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}