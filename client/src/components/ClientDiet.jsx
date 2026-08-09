// Per-client diet panel (slice 5): daily macro targets, food log, water, and
// supplements. A single "track date" drives food/water/supplements so the
// coach logs one day at a time. Rendered inside ClientDetail.
import { useCallback, useEffect, useState } from 'react';
import {
  addSupplement,
  deleteSupplement,
  getFoodLog,
  getMealPlan,
  getSupplementLog,
  getSupplements,
  getWater,
  saveMealPlan,
  deleteMealPlan,
  setSupplementLog,
  setWater,
} from '../api/diet.js';
import MealPlanCard from './MealPlanCard.jsx';
import FoodLogCard from './FoodLogCard.jsx';
import WaterCard from './WaterCard.jsx';
import SupplementCard from './SupplementCard.jsx';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const emptyTotals = { protein: 0, carbs: 0, fat: 0, calories: 0 };

export default function ClientDiet({ clientId }) {
  const [trackDate, setTrackDate] = useState(todayStr());
  const [mealPlan, setMealPlan] = useState(null);
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState(emptyTotals);
  const [water, setWaterRow] = useState(null);
  const [supplements, setSupplements] = useState([]);
  const [taken, setTaken] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    return Promise.all([
      getMealPlan(clientId),
      getFoodLog(clientId, trackDate),
      getWater(clientId, trackDate),
      getSupplements(clientId),
      getSupplementLog(clientId, trackDate),
    ])
      .then(([mp, food, wat, sups, log]) => {
        setMealPlan(mp.mealPlan);
        setEntries(food.entries);
        setTotals(food.totals ?? emptyTotals);
        setWaterRow(wat.water);
        setSupplements(sups.supplements);
        setTaken(log.taken);
      })
      .catch((err) => setError(err.message));
  }, [clientId, trackDate]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  async function handleSavePlan(data) {
    await saveMealPlan(clientId, data);
    await reload();
  }

  async function handleDeletePlan() {
    await deleteMealPlan(clientId);
    await reload();
  }

  async function handleSetWater(glasses) {
    await setWater(clientId, { date: trackDate, glasses });
    await reload();
  }

  async function handleAddSupplement(name) {
    await addSupplement(clientId, name);
    await reload();
  }

  async function handleDeleteSupplement(id) {
    await deleteSupplement(clientId, id);
    await reload();
  }

  async function handleSetTaken(ids) {
    await setSupplementLog(clientId, { date: trackDate, supplement_ids: ids });
    await reload();
  }

  if (loading) {
    return <p className="mt-8 text-slate-400">Loading diet…</p>;
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-200">Diet</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="diet-track-date" className="text-xs font-medium text-slate-400">
            Track date
          </label>
          <input
            id="diet-track-date"
            type="date"
            value={trackDate}
            onChange={(e) => setTrackDate(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <MealPlanCard mealPlan={mealPlan} onSave={handleSavePlan} onDelete={handleDeletePlan} />
        <div className="space-y-4">
          <WaterCard water={water} onSet={handleSetWater} />
          <SupplementCard
            supplements={supplements}
            taken={taken}
            onSetTaken={handleSetTaken}
            onAdd={handleAddSupplement}
            onDelete={handleDeleteSupplement}
          />
        </div>
      </div>

      <div className="mt-4">
        <FoodLogCard
          clientId={clientId}
          date={trackDate}
          entries={entries}
          totals={totals}
          targets={mealPlan}
          onChanged={reload}
        />
      </div>
    </section>
  );
}
