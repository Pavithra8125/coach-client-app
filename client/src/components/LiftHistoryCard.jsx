// Progressive-overload + PR view (slice 4): for each lift, every logged
// session's best set (by estimated 1RM), a delta arrow vs the previous session,
// and the all-time PR. "Best set" picks the set that scores highest on e1RM,
// so a heavy low-rep session is comparable to a lighter high-rep one.
function fmtDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function Delta({ delta }) {
  if (delta === null) return <span className="text-slate-500">—</span>;
  if (delta > 0) return <span className="font-medium text-emerald-400">▲ +{delta} kg</span>;
  if (delta < 0) return <span className="font-medium text-red-400">▼ {Math.abs(delta)} kg</span>;
  return <span className="text-slate-500">=</span>;
}

export default function LiftHistoryCard({ liftHistory }) {
  if (liftHistory.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-800 p-4">
        <h3 className="font-semibold text-slate-300">Progressive overload &amp; PRs</h3>
        <p className="mt-2 text-sm text-slate-500">
          Log a few workouts and each lift&apos;s progression will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-800 p-4">
      <h3 className="font-semibold text-slate-300">Progressive overload &amp; PRs</h3>
      <p className="mt-1 text-xs text-slate-500">
        Best set per session; the arrow compares it with the session before.
      </p>

      {liftHistory.map((exercise) => (
        <div key={exercise.id} className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-200">{exercise.name}</span>
            {exercise.category && (
              <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-xs text-slate-400">
                {exercise.category}
              </span>
            )}
            {exercise.pr && (
              <span className="rounded-full border border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-2 py-0.5 text-xs font-bold text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                PR {exercise.pr.weight} kg × {exercise.pr.reps} · {fmtDate(exercise.pr.date)}
              </span>
            )}
          </div>

          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="pb-1 pr-3 font-medium">Date</th>
                  <th className="pb-1 pr-3 font-medium">Best set</th>
                  <th className="pb-1 pr-3 font-medium">e1RM</th>
                  <th className="pb-1 font-medium">vs last</th>
                </tr>
              </thead>
              <tbody>
                {exercise.history.map((h, i) => {
                  const prev = exercise.history[i - 1];
                  const delta = prev ? Math.round((h.est_1rm - prev.est_1rm) * 10) / 10 : null;
                  const isPr = exercise.pr && h.session_id === exercise.pr.session_id;
                  
                  let bgClass = '';
                  if (isPr) {
                    bgClass = 'bg-amber-500/10';
                  } else if (delta > 0) {
                    // subtle up intensity
                    bgClass = 'bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06]';
                  } else if (delta < 0) {
                    // subtle down intensity
                    bgClass = 'bg-red-500/[0.03] hover:bg-red-500/[0.06]';
                  }
                  
                  return (
                    <tr key={h.session_id} className={`border-t border-slate-700/50 transition-colors ${bgClass}`}>
                      <td className="py-1.5 pr-3 text-slate-300">{fmtDate(h.date)}</td>
                      <td className="py-1.5 pr-3 text-slate-200">
                        {h.weight} kg × {h.reps}
                        {isPr && <span className="ml-1.5 rounded text-[10px] font-bold uppercase text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">PR</span>}
                      </td>
                      <td className="py-1.5 pr-3 text-slate-400">{h.est_1rm} kg</td>
                      <td className="py-1.5">
                        <Delta delta={delta} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
