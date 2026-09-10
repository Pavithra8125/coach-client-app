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
import { smoothedWeights } from '../lib/trend.js';

const SERIES = '#0f172a';
const SURFACE = '#ffffff';
const GRID = '#f1f5f9';
const TICK = '#64748b';

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

function rawDot({ cx, cy }) {
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={4} fill={SERIES} stroke={SURFACE} strokeWidth={2} />;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const trend = payload.find((p) => p.dataKey === 'trend');
  const raw = payload.find((p) => p.dataKey === 'weight_kg');
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-slate-900">{fmtDate(label)}</p>
      {raw && raw.value != null && (
        <p className="text-slate-700">
          Logged <span className="font-semibold text-slate-900">{raw.value} kg</span>
        </p>
      )}
      {trend && (
        <p className="text-slate-700">
          Trend <span className="font-semibold text-slate-900">{trend.value} kg</span>
        </p>
      )}
    </div>
  );
}

export default function TrendGraph({ measurements }) {
  // Only include items with weight for the graph, then smooth
  const weightData = (measurements || []).filter(m => m.weight_kg != null);
  const chartData = smoothedWeights(weightData);

  if (chartData.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-800">
        No weights logged yet.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-4 text-xs text-slate-700">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-gradient-to-r from-slate-600 to-slate-800" />
          Trend (EMA)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: SERIES }} />
          Logged
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="logged_date"
            tickFormatter={tickDate}
            tick={{ fill: TICK, fontSize: 12 }}
            axisLine={{ stroke: '#e2e8f0' }}
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
            cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="trend"
            stroke="url(#trendGradient)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 5, fill: '#1e293b', stroke: SURFACE, strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Scatter dataKey="weight_kg" shape={rawDot} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
