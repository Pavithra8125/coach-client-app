import React from 'react';

function fmtDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MeasurementList({ measurements, onEdit, onDelete }) {
  if (!measurements || measurements.length === 0) {
    return <p className="text-sm text-slate-500">No measurements logged yet.</p>;
  }

  // Reverse so newest is first in the list
  const newestFirst = [...measurements].reverse();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50 text-left text-xs text-slate-500">
            <th className="pb-2 pr-4 font-medium">Date</th>
            <th className="pb-2 pr-4 font-medium">Weight</th>
            <th className="pb-2 pr-4 font-medium">Body Fat</th>
            <th className="pb-2 pr-4 font-medium">Waist</th>
            <th className="pb-2 pr-4 font-medium">Chest</th>
            <th className="pb-2 pr-4 font-medium">Notes</th>
            <th className="pb-2 text-right" aria-label="Actions">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {newestFirst.map((entry) => (
            <tr key={entry.id} className="transition-colors hover:bg-slate-700/20">
              <td className="py-3 pr-4 whitespace-nowrap text-slate-300 font-medium">
                {fmtDate(entry.logged_date)}
              </td>
              <td className="py-3 pr-4 text-slate-200">
                {entry.weight_kg != null ? `${entry.weight_kg} kg` : '—'}
              </td>
              <td className="py-3 pr-4 text-slate-200">
                {entry.body_fat_pct != null ? `${entry.body_fat_pct}%` : '—'}
              </td>
              <td className="py-3 pr-4 text-slate-200">
                {entry.waist_cm != null ? `${entry.waist_cm} cm` : '—'}
              </td>
              <td className="py-3 pr-4 text-slate-200">
                {entry.chest_cm != null ? `${entry.chest_cm} cm` : '—'}
              </td>
              <td className="py-3 pr-4 text-slate-400 max-w-xs truncate" title={entry.notes}>
                {entry.notes || '—'}
              </td>
              <td className="py-3 text-right whitespace-nowrap">
                <button
                  onClick={() => onEdit(entry)}
                  className="mr-3 text-xs text-blue-400 transition hover:text-blue-300"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(entry)}
                  className="text-xs text-slate-500 transition hover:text-red-400"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
