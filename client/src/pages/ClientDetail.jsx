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
      {/* HERO HEADER */}
      <div className="relative mb-12 overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-800/50 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent mix-blend-overlay" />
        <div className="relative p-8 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {client.photo_url ? (
              <img
                src={client.photo_url}
                alt=""
                className="h-24 w-24 shrink-0 rounded-full border-4 border-slate-800 bg-slate-700 object-cover shadow-xl"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-slate-800 bg-gradient-to-br from-slate-700 to-slate-800 text-3xl font-extrabold text-slate-300 shadow-xl">
                {initials(client.name)}
              </div>
            )}
            
            <div className="min-w-0 flex-1">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{client.name}</h1>
              <p className="mt-2 text-base font-medium text-slate-400">
                {client.start_date ? `Training since ${client.start_date}` : 'New Client'}
              </p>
              {client.goals && <p className="mt-3 max-w-2xl text-lg text-slate-300">{client.goals}</p>}
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:items-end">
              <button
                onClick={() => setEditing(true)}
                className="rounded-xl bg-gradient-to-b from-slate-600 to-slate-700 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:from-slate-500 hover:to-slate-600 hover:shadow-xl"
              >
                Edit Profile
              </button>
              <button
                onClick={handleDelete}
                className="rounded-xl bg-slate-900/50 px-6 py-2.5 text-sm font-bold text-red-400 border border-red-900/30 transition-all hover:bg-red-950/50 hover:text-red-300"
              >
                Delete Client
              </button>
            </div>
          </div>

          {/* STAT STRIP - Visual layout as requested */}
          <div className="mt-10 grid grid-cols-2 gap-4 rounded-2xl bg-slate-900/60 p-4 shadow-inner backdrop-blur-sm sm:grid-cols-4">
            <div className="flex items-center gap-3 border-r border-slate-700/50 pr-4 last:border-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-xl shadow-sm border border-blue-500/20">
                ⚖️
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Latest Wt</p>
                <p className="text-xl font-extrabold text-white">-- <span className="text-sm font-medium text-slate-500">kg</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-r border-slate-700/50 pr-4 last:border-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-xl shadow-sm border border-orange-500/20">
                🔥
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Streak</p>
                <p className="text-xl font-extrabold text-white">-- <span className="text-sm font-medium text-slate-500">days</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-r border-slate-700/50 pr-4 last:border-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-xl shadow-sm border border-emerald-500/20">
                💪
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">This Week</p>
                <p className="text-xl font-extrabold text-white">-- <span className="text-sm font-medium text-slate-500">sessions</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-xl shadow-sm border border-purple-500/20">
                🎯
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Macros</p>
                <p className="text-xl font-extrabold text-white">On Track</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-16">
        <ClientProgress clientId={client.id} />
        <ClientWorkouts clientId={client.id} />
        <ClientGamification clientId={client.id} />
        <ClientDiet clientId={client.id} />
        <ClientCheckins clientId={client.id} />
      </div>

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
