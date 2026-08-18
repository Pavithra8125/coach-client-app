// Per-client check-ins + coach's log panel (slice 6). Weekly check-ins capture
// energy / soreness / sleep / adherence ratings; the coach's log holds private
// dated journal notes. Rendered inside ClientDetail.
import { useCallback, useEffect, useState } from 'react';
import { deleteCheckin, getCheckins, saveCheckin } from '../api/checkins.js';
import { addCoachNote, deleteCoachNote, getCoachNotes } from '../api/coachNotes.js';
import CheckinModal from './CheckinModal.jsx';
import CoachLogCard from './CoachLogCard.jsx';

function Metric({ label, value, unit }) {
  return (
    <div className="rounded-xl border border-slate-700/60 px-2 py-1.5 text-center">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-100">
        {value != null ? `${value}${unit}` : '—'}
      </div>
    </div>
  );
}

export default function ClientCheckins({ clientId }) {
  const [checkins, setCheckins] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null, or { checkin } for edit

  const reload = useCallback(() => {
    return Promise.all([getCheckins(clientId), getCoachNotes(clientId)])
      .then(([ch, nt]) => {
        setCheckins(ch.checkins);
        setNotes(nt.notes);
      })
      .catch((err) => setError(err.message));
  }, [clientId]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  async function handleSave(data) {
    await saveCheckin(clientId, data);
    setModal(null);
    setError(null);
    reload();
  }

  async function handleDeleteCheckin(checkin) {
    if (!window.confirm(`Delete the check-in for ${checkin.date}?`)) return;
    try {
      await deleteCheckin(clientId, checkin.id);
      setError(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddNote(note, date) {
    await addCoachNote(clientId, { note, date });
    setError(null);
    reload();
  }

  async function handleDeleteNote(id) {
    if (!window.confirm('Delete this note?')) return;
    try {
      await deleteCoachNote(clientId, id);
      setError(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <p className="mt-8 text-slate-400">Loading check-ins…</p>;
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight text-white">Check-ins &amp; coach's log</h2>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-slate-800 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-300">Weekly check-ins</h3>
            <button
              type="button"
              onClick={() => setModal({})}
              className="rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:from-blue-400 hover:to-blue-500 hover:shadow-xl"
            >
              New check-in
            </button>
          </div>

          {checkins.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No check-ins yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {checkins.map((c) => (
                <li key={c.id} className="rounded-xl border border-slate-700/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-200">{c.date}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setModal({ checkin: c })}
                        className="text-xs text-slate-500 transition hover:text-slate-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCheckin(c)}
                        className="text-xs text-slate-500 transition hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    <Metric label="Energy" value={c.energy} unit="/10" />
                    <Metric label="Soreness" value={c.soreness} unit="/10" />
                    <Metric label="Sleep" value={c.sleep} unit="/10" />
                    <Metric label="Adhere" value={c.adherence} unit="%" />
                  </div>
                  {c.notes && <p className="mt-2 text-sm text-slate-400">{c.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <CoachLogCard notes={notes} onAdd={handleAddNote} onDelete={handleDeleteNote} />
      </div>

      {modal !== null && (
        <CheckinModal
          checkin={modal.checkin ?? null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </section>
  );
}