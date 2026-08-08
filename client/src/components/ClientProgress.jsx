// Per-client progress panel (slice 3): weight logging + smoothed trend chart,
// and body measurements. Rendered inside ClientDetail.
import { useCallback, useEffect, useState } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  deleteMeasurement,
  deleteWeightEntry,
  getMeasurements,
  getWeightEntries,
  logMeasurements,
  logWeight,
} from '../api/progress.js';
import { smoothedWeights } from '../lib/trend.js';

// Chart colors — dark app (cards are slate-800). Single metric = one hue (blue).
const SERIES = '#3987e5'; // trend line + raw dots
const SURFACE = '#1e293b'; // slate-800 card bg — the dots' 2px separation ring
const GRID = '#334155'; // slate-700 hairline gridlines
const TICK = '#94a3b8'; // slate-400 axis text

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function tickDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

// Raw readings as small dots with a 2px surface ring (keeps them legible where
// they cross the trend line).
function rawDot({ cx, cy }) {
  return <circle cx={cx} cy={cy} r={4} fill={SERIES} stroke={SURFACE} strokeWidth={2} />;
}

// Values lead, labels follow: the number is the strong element in a tooltip.
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const trend = payload.find((p) => p.dataKey === 'trend');
  const raw = payload.find((p) => p.dataKey === 'weight');
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-slate-200">{fmtDate(label)}</p>
      {raw && (
        <p className="text-slate-400">
          Logged <span className="font-semibold text-slate-100">{raw.value} kg</span>
        </p>
      )}
      {trend && (
        <p className="text-slate-400">
          Trend <span className="font-semibold text-slate-100">{trend.value} kg</span>
        </p>
      )}
    </div>
  );
}

export default function ClientProgress({ clientId }) {
  const [weightEntries, setWeightEntries] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [wDate, setWDate] = useState(todayStr());
  const [wWeight, setWWeight] = useState('');
  const [mDate, setMDate] = useState(todayStr());
  const [mFields, setMFields] = useState({ waist: '', chest: '', arms: '', body_fat: '' });

  const reload = useCallback(() => {
    return Promise.all([getWeightEntries(clientId), getMeasurements(clientId)])
      .then(([w, m]) => {
        setWeightEntries(w.entries);
        setMeasurements(m.entries);
      })
      .catch((err) => setError(err.message));
  }, [clientId]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  async function handleWeightSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await logWeight(clientId, { date: wDate, weight: Number(wWeight) });
      setWWeight('');
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleMeasurementsSubmit(e) {
    e.preventDefault();
    setError(null);
    const body = { date: mDate };
    for (const [key, value] of Object.entries(mFields)) {
      if (value !== '') body[key] = Number(value);
    }
    try {
      await logMeasurements(clientId, body);
      setMFields({ waist: '', chest: '', arms: '', body_fat: '' });
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteWeight(entry) {
    if (!window.confirm(`Delete the ${fmtDate(entry.date)} weight entry?`)) return;
    try {
      await deleteWeightEntry(clientId, entry.id);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteMeasurement(entry) {
    if (!window.confirm(`Delete the ${fmtDate(entry.date)} measurements?`)) return;
    try {
      await deleteMeasurement(clientId, entry.id);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="text-slate-400">Loading progress…</p>;

  const chartData = smoothedWeights(weightEntries);
  const latest = weightEntries[weightEntries.length - 1];
  const newestFirst = [...weightEntries].reverse();
  const labelCls = 'block text-xs font-medium text-slate-400';
  const field =
    'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none';

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-slate-200">Progress</h2>
        {latest && (
          <p className="text-sm text-slate-400">
            Latest weight{' '}
            <span className="font-semibold text-slate-100">{latest.weight} kg</span>
            <span className="text-slate-500"> · {fmtDate(latest.date)}</span>
          </p>
        )}
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Weight: log form + smoothed trend chart */}
        <div className="rounded-2xl bg-slate-800 p-4 lg:col-span-2">
          <h3 className="font-semibold text-slate-300">Weight</h3>
          <form onSubmit={handleWeightSubmit} className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className={labelCls} htmlFor="w-date">
                Date
              </label>
              <input
                id="w-date"
                type="date"
                value={wDate}
                onChange={(e) => setWDate(e.target.value)}
                className={field}
                required
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="w-weight">
                Weight (kg)
              </label>
              <input
                id="w-weight"
                type="number"
                min="0.5"
                step="0.1"
                value={wWeight}
                onChange={(e) => setWWeight(e.target.value)}
                placeholder="e.g. 79.4"
                className={`${field} w-36`}
                required
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Log weight
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Logging a day that already has a weight replaces that day&apos;s entry.
          </p>

          <div className="mt-4">
            {chartData.length === 0 ? (
              <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">
                No weights logged yet — add the first one above.
              </div>
            ) : (
              <>
                <div className="mb-1 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded-full" style={{ background: SERIES }} />
                    Trend
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: SERIES }} />
                    Logged
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={tickDate}
                      tick={{ fill: TICK, fontSize: 12 }}
                      axisLine={{ stroke: '#475569' }}
                      tickLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      width={40}
                      domain={[(min) => min - 0.5, (max) => max + 0.5]}
                      tick={{ fill: TICK, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ stroke: '#64748b', strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="trend"
                      stroke={SERIES}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={false}
                      activeDot={{ r: 5, fill: SERIES, stroke: SURFACE, strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                    <Scatter dataKey="weight" shape={rawDot} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>

        {/* Measurements: log form */}
        <div className="rounded-2xl bg-slate-800 p-4">
          <h3 className="font-semibold text-slate-300">Measurements</h3>
          <form onSubmit={handleMeasurementsSubmit} className="mt-3 space-y-3">
            <div>
              <label className={labelCls} htmlFor="m-date">
                Date
              </label>
              <input
                id="m-date"
                type="date"
                value={mDate}
                onChange={(e) => setMDate(e.target.value)}
                className={field}
                required
              />
            </div>
            {[
              ['waist', 'Waist (cm)', '90'],
              ['chest', 'Chest (cm)', '100'],
              ['arms', 'Arms (cm)', '35'],
              ['body_fat', 'Body fat (%)', '18'],
            ].map(([key, label, placeholder]) => (
              <div key={key}>
                <label className={labelCls} htmlFor={`m-${key}`}>
                  {label}
                </label>
                <input
                  id={`m-${key}`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={mFields[key]}
                  onChange={(e) => setMFields((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className={field}
                />
              </div>
            ))}
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Log measurements
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">Leave a field blank if not measured.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Weight log entries */}
        <div className="rounded-2xl bg-slate-800 p-4">
          <h3 className="mb-2 font-semibold text-slate-300">Weight log</h3>
          {newestFirst.length === 0 ? (
            <p className="text-sm text-slate-500">No entries yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="pb-1 pr-2 font-medium">Date</th>
                  <th className="pb-1 font-medium">Weight</th>
                  <th className="pb-1" aria-label="Delete" />
                </tr>
              </thead>
              <tbody>
                {newestFirst.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-700/50">
                    <td className="py-1.5 pr-2 text-slate-300">{fmtDate(entry.date)}</td>
                    <td className="py-1.5 text-slate-200">{entry.weight} kg</td>
                    <td className="py-1.5 text-right">
                      <button
                        onClick={() => handleDeleteWeight(entry)}
                        className="text-xs text-slate-500 transition hover:text-red-400"
                        aria-label={`Delete ${fmtDate(entry.date)} entry`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Measurement history */}
        <div className="rounded-2xl bg-slate-800 p-4">
          <h3 className="mb-2 font-semibold text-slate-300">Measurement history</h3>
          {measurements.length === 0 ? (
            <p className="text-sm text-slate-500">No measurements yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="pb-1 pr-2 font-medium">Date</th>
                  <th className="pb-1 pr-2 font-medium">Waist</th>
                  <th className="pb-1 pr-2 font-medium">Chest</th>
                  <th className="pb-1 pr-2 font-medium">Arms</th>
                  <th className="pb-1 pr-2 font-medium">Body fat</th>
                  <th className="pb-1" aria-label="Delete" />
                </tr>
              </thead>
              <tbody>
                {measurements.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-700/50">
                    <td className="py-1.5 pr-2 text-slate-300">{fmtDate(entry.date)}</td>
                    {['waist', 'chest', 'arms'].map((k) => (
                      <td key={k} className="py-1.5 pr-2 text-slate-200">
                        {entry[k] != null ? `${entry[k]} cm` : '—'}
                      </td>
                    ))}
                    <td className="py-1.5 pr-2 text-slate-200">
                      {entry.body_fat != null ? `${entry.body_fat}%` : '—'}
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        onClick={() => handleDeleteMeasurement(entry)}
                        className="text-xs text-slate-500 transition hover:text-red-400"
                        aria-label={`Delete ${fmtDate(entry.date)} measurements`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
