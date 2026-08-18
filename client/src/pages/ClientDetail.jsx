// Individual client page: profile + progress (slice 3), workouts (slice 4),
// and diet (slice 5) sections.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import ClientFormModal from '../components/ClientFormModal.jsx';
import ClientProgress from '../components/ClientProgress.jsx';
import ClientWorkouts from '../components/ClientWorkouts.jsx';
import ClientDiet from '../components/ClientDiet.jsx';
import ClientCheckins from '../components/ClientCheckins.jsx';
import ClientGamification from '../components/ClientGamification.jsx';
import { getClient, deleteClient } from '../api/clients.js';

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getClient(id)
      .then((data) => {
        if (!cancelled) setClient(data.client);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!window.confirm(`Delete ${client.name}? This can't be undone.`)) return;
    try {
      await deleteClient(client.id);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-slate-400">Loading…</p>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <p className="text-red-400">{error}</p>
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell>
        <p className="text-slate-400">Client not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-start gap-4">
        {client.photo_url ? (
          <img
            src={client.photo_url}
            alt=""
            className="h-16 w-16 rounded-full bg-slate-700 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-lg font-semibold text-slate-400">
            {initials(client.name)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <p className="text-sm text-slate-400">
            {client.start_date ? `Since ${client.start_date}` : 'No start date'}
          </p>
          {client.goals && <p className="mt-2 max-w-2xl text-slate-300">{client.goals}</p>}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 transition hover:bg-red-950"
          >
            Delete
          </button>
        </div>
      </div>

      <ClientProgress clientId={client.id} />

      <ClientWorkouts clientId={client.id} />

      <ClientGamification clientId={client.id} />

      <ClientDiet clientId={client.id} />

      <ClientCheckins clientId={client.id} />

      {editing && (
        <ClientFormModal
          client={client}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setClient(updated);
            setEditing(false);
          }}
        />
      )}
    </AppShell>
  );
}
