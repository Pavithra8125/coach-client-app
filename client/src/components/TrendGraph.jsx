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

const SERIES = '#3987e5';
const SURFACE = '#1e293b';
const GRID = '#334155';
const TICK = '#94a3b8';

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
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-slate-200">{fmtDate(label)}</p>
      {raw && raw.value != null && (
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

export default function TrendGraph({ measurements }) {
  // Only include items with weight for the graph, then smooth
  const weightData = (measurements || []).filter(m => m.weight_kg != null);
  const chartData = smoothedWeights(weightData);

  if (chartData.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">
        No weights logged yet.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
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
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="logged_date"
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
            stroke="url(#trendGradient)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 5, fill: '#06b6d4', stroke: SURFACE, strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Scatter dataKey="weight_kg" shape={rawDot} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
