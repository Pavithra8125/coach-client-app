// Per-client workout panel (slice 4): plan builder, session logging, and the
// progressive-overload + PR view. Rendered inside ClientDetail.
import { useCallback, useEffect, useState } from 'react';
import {
  createExercise,
  createPlanDay,
  deletePlanDay,
  getLiftHistory,
  getPlan,
  getSessions,
  listExercises,
  updatePlanDay,
} from '../api/workouts.js';
import PlanCard from './PlanCard.jsx';
import DayModal from './DayModal.jsx';
import LogCard from './LogCard.jsx';
import LiftHistoryCard from './LiftHistoryCard.jsx';

export default function ClientWorkouts({ clientId }) {
  const [exercises, setExercises] = useState([]);
  const [plan, setPlan] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [liftHistory, setLiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dayModal, setDayModal] = useState(null); // null, or { day } for edit

  const reload = useCallback(() => {
    return Promise.all([
      listExercises(),
      getPlan(clientId),
      getSessions(clientId),
      getLiftHistory(clientId),
    ])
      .then(([ex, pl, se, lh]) => {
        setExercises(ex.exercises);
        setPlan(pl.days);
        setSessions(se.sessions);
        setLiftHistory(lh.exercises);
      })
      .catch((err) => setError(err.message));
  }, [clientId]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  // Adds an exercise to the shared library and returns it (so the modal can
  // check it). Throws on failure (e.g. duplicate name) — the modal shows it.
  async function handleAddExercise(name, category) {
    const { exercise } = await createExercise({ name, category });
    setExercises((prev) => [...prev, exercise]);
    return exercise;
  }

  async function handleSaveDay({ dayId, name, exerciseIds }) {
    if (dayId) await updatePlanDay(clientId, dayId, { name, exercise_ids: exerciseIds });
    else await createPlanDay(clientId, { name, exercise_ids: exerciseIds });
    setDayModal(null);
    setError(null);
    reload();
  }

  function handleDeleteDay(day) {
    if (!window.confirm(`Delete "${day.name}" from the plan?`)) return;
    setError(null);
    deletePlanDay(clientId, day.id)
      .then(reload)
      .catch((err) => setError(err.message));
  }

  function handleDataChanged() {
    setError(null);
    reload();
  }

  if (loading) {
    return <p className="mt-8 text-slate-400">Loading workouts…</p>;
  }

  return (
    <section>
      <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-white">Workouts</h2>

      {error && <p className="mb-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PlanCard
            plan={plan}
            onAddDay={() => setDayModal({})}
            onEditDay={(day) => setDayModal({ day })}
            onDeleteDay={handleDeleteDay}
          />
        </div>
        <LogCard
          clientId={clientId}
          plan={plan}
          exercises={exercises}
          sessions={sessions}
          onSaved={handleDataChanged}
        />
      </div>

      <div className="mt-4">
        <LiftHistoryCard liftHistory={liftHistory} />
      </div>

      {dayModal !== null && (
        <DayModal
          day={dayModal.day ?? null}
          exercises={exercises}
          onAddExercise={handleAddExercise}
          onSave={handleSaveDay}
          onClose={() => setDayModal(null)}
        />
      )}
    </section>
  );
}
