// Workout plan builder (slice 4): the client's named days, each listing the
// exercises it uses. Add/edit goes through DayModal; the exercise library is
// managed from inside that modal.
export default function PlanCard({ plan, onAddDay, onEditDay, onDeleteDay }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-800/90 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-600 hover:shadow-md">
      <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-extrabold tracking-tight text-white">Workout plan</h3>
        <button
          onClick={onAddDay}
          className="rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:from-blue-400 hover:to-blue-500 hover:shadow-xl"
        >
          Add day
        </button>
      </div>

      {plan.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No plan yet — add a day to get started.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {plan.map((day) => (
            <li key={day.id} className="rounded-xl border border-slate-700/60 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-200">{day.name}</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => onEditDay(day)}
                    className="text-xs text-slate-500 transition hover:text-slate-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteDay(day)}
                    className="text-xs text-slate-500 transition hover:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {day.exercises.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No exercises yet.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {day.exercises.map((exercise) => (
                    <li
                      key={exercise.id}
                      className="rounded-full bg-slate-700/60 px-2.5 py-0.5 text-xs text-slate-300"
                    >
                      {exercise.name}
                      {exercise.category && (
                        <span className="ml-1 text-slate-500">{exercise.category}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
