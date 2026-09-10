// Per-client progress panel (slice 3): unified weight and body measurements logging
// with a smoothed EMA trend chart. Rendered inside ClientDetail.
import { useCallback, useEffect, useState, useRef } from 'react';
import {
  getMeasurements,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
} from '../api/progress.js';
import TrendGraph from './TrendGraph.jsx';
import MeasurementForm from './MeasurementForm.jsx';
import MeasurementList from './MeasurementList.jsx';

function fmtDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ClientProgress({ clientId }) {
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const formRef = useRef(null);

  const reload = useCallback(() => {
    return getMeasurements(clientId)
      .then((data) => setMeasurements(data.entries))
      .catch((err) => setError(err.message));
  }, [clientId]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  const handleSubmit = async (fields) => {
    setError(null);
    try {
      if (editingEntry) {
        await updateMeasurement(editingEntry.id, fields);
      } else {
        await createMeasurement(clientId, fields);
      }
      setIsFormVisible(false);
      setEditingEntry(null);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setIsFormVisible(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleCancelForm = () => {
    setEditingEntry(null);
    setIsFormVisible(false);
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete the measurements from ${fmtDate(entry.logged_date)}?`)) return;
    try {
      await deleteMeasurement(entry.id);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="text-slate-500">Loading progress…</p>;

  const weightEntries = measurements.filter(m => m.weight_kg != null);
  const latestWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1] : null;

  return (
    <section className="mt-2">
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Progress</h2>
        {latestWeight && (
          <p className="text-sm font-medium text-slate-500">
            Latest weight{' '}
            <span className="font-extrabold text-slate-900">{latestWeight.weight_kg} kg</span>
            <span className="text-slate-400"> · {fmtDate(latestWeight.logged_date)}</span>
          </p>
        )}
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-100">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-1">
        {/* Graph Section */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4.5 shadow-sm transition-all duration-200 hover:border-slate-200 hover:shadow-md">
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-slate-600 to-slate-800" />
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900">Trend</h3>
            {!isFormVisible && (
              <button
                onClick={() => setIsFormVisible(true)}
                className="rounded-xl bg-slate-900 px-4 py-1.5 text-sm font-bold text-white shadow-sm hover:-translate-y-0.5 hover:bg-slate-800"
              >
                + Log Progress
              </button>
            )}
          </div>
          
          {isFormVisible && (
            <div className="mb-6" ref={formRef}>
              <MeasurementForm 
                initialData={editingEntry}
                onSubmit={handleSubmit}
                onCancel={handleCancelForm}
              />
            </div>
          )}

          <TrendGraph measurements={measurements} />
        </div>

        {/* History List Section */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4.5 shadow-sm transition-all duration-200 hover:border-slate-200 hover:shadow-md">
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-slate-600 to-slate-800" />
          <h3 className="mb-4 text-xl font-extrabold tracking-tight text-slate-900">History</h3>
          <MeasurementList 
            measurements={measurements} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        </div>
      </div>
    </section>
  );
}
