// Add/edit client modal. Used for both: pass a `client` to edit, or nothing
// to create. Calls onSaved(savedClient) on success so the parent updates state.
import { useState } from 'react';
import { createClient, updateClient } from '../api/clients.js';

const emptyForm = { name: '', photo_url: '', goals: '', start_date: '' };

function toForm(client) {
  return {
    name: client.name ?? '',
    photo_url: client.photo_url ?? '',
    goals: client.goals ?? '',
    start_date: client.start_date ?? '',
  };
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 ' +
  'placeholder-slate-500 outline-none focus:border-emerald-500';

export default function ClientFormModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState(client ? toForm(client) : emptyForm);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(client);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const data = isEdit ? await updateClient(client.id, form) : await createClient(form);
      onSaved(data.client);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-slate-800 p-6 shadow-xl"
      >
        <h2 className="text-xl font-bold text-slate-100">{isEdit ? 'Edit client' : 'Add client'}</h2>

        <label htmlFor="client-name" className="mt-4 block text-sm font-medium text-slate-300">
          Name *
        </label>
        <input
          id="client-name"
          type="text"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          autoFocus
          className={inputClass}
        />

        <label htmlFor="client-photo" className="mt-4 block text-sm font-medium text-slate-300">
          Photo URL
        </label>
        <input
          id="client-photo"
          type="text"
          value={form.photo_url}
          onChange={(e) => set('photo_url', e.target.value)}
          placeholder="https://…"
          className={inputClass}
        />

        <label htmlFor="client-goals" className="mt-4 block text-sm font-medium text-slate-300">
          Goals
        </label>
        <textarea
          id="client-goals"
          value={form.goals}
          onChange={(e) => set('goals', e.target.value)}
          rows={3}
          placeholder="e.g. Recomp — cut to 12% BF, hold muscle"
          className={inputClass}
        />

        <label htmlFor="client-start" className="mt-4 block text-sm font-medium text-slate-300">
          Start date
        </label>
        <input
          id="client-start"
          type="date"
          value={form.start_date}
          onChange={(e) => set('start_date', e.target.value)}
          className={inputClass}
        />

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add client'}
          </button>
        </div>
      </form>
    </div>
  );
}
