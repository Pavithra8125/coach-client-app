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
import { config } from '../config.js';

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: '👤' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'workouts', label: 'Workouts', icon: '🏋️' },
  { id: 'diet', label: 'Diet', icon: '🥗' },
  { id: 'checkins', label: 'Check-ins', icon: '📋' },
];

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

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
        <p className="text-slate-800">Loading…</p>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <p className="text-red-600">{error}</p>
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell>
        <p className="text-slate-800">Client not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6 pb-24 md:flex-row md:pb-6 lg:gap-8">
        {/* Navigation Sidebar/Bottom Bar */}
        <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-white/40 bg-white/40 px-2 py-2 shadow-lg backdrop-blur-xl md:sticky md:top-6 md:z-0 md:w-56 md:shrink-0 md:flex-col md:justify-start md:gap-1 md:border-none md:bg-transparent md:p-0 md:shadow-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2 transition-all md:flex-row md:justify-start md:px-4 md:py-3 ${
                  isActive
                    ? 'text-slate-900 md:bg-slate-900 md:text-white'
                    : 'text-slate-700 hover:text-slate-900 md:hover:bg-white/50'
                }`}
              >
                <span className={`text-xl md:text-lg ${isActive ? 'opacity-100' : 'opacity-60 grayscale'}`}>
                  {tab.icon}
                </span>
                <span className={`text-[10px] md:text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <div className="min-w-0 flex-1">
          {activeTab === 'overview' && (
            <div className="relative mb-12 overflow-hidden rounded-3xl border border-white/40 bg-white/40 shadow-lg shadow-emerald-900/5 backdrop-blur-xl">
              <div className="relative p-8 sm:p-10">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  {client.photo_url ? (
                    <img
                      src={client.photo_url}
                      alt=""
                      className="h-24 w-24 shrink-0 rounded-full border-4 border-white/50 bg-slate-100 object-cover shadow-md ring-1 ring-white/30"
                    />
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white/50 bg-gradient-to-br from-slate-100/80 to-slate-200/80 text-3xl font-extrabold text-slate-800 shadow-md ring-1 ring-white/30 backdrop-blur-md">
                      {initials(client.name)}
                    </div>
                  )}
                  
                  <div className="min-w-0 flex-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{client.name}</h1>
                    <p className="mt-2 text-base font-medium text-slate-700">
                      {client.start_date ? `Training since ${client.start_date}` : 'New Client'}
                    </p>
                    {client.goals && <p className="mt-3 max-w-2xl text-lg text-slate-800">{client.goals}</p>}
                  </div>

                  <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                    <button
                      onClick={() => setEditing(true)}
                      className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={handleDelete}
                      className="rounded-xl border border-red-200 bg-white/80 px-6 py-2.5 text-sm font-bold text-red-600 transition-all hover:bg-red-50 hover:text-red-700"
                    >
                      Delete Client
                    </button>
                  </div>
                </div>

                {/* STAT STRIP */}
                <div className="mt-10 grid grid-cols-2 gap-4 rounded-2xl border border-white/30 bg-white/20 p-4 shadow-inner backdrop-blur-lg sm:grid-cols-4">
                  <div className="flex items-center gap-3 border-r border-white/40 pr-4 last:border-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl shadow-sm border border-blue-100">
                      ⚖️
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Latest Wt</p>
                      <p className="text-xl font-extrabold text-slate-900">-- <span className="text-sm font-medium text-slate-700">kg</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-r-0 sm:border-r border-white/40 pr-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-xl shadow-sm border border-orange-100">
                      🔥
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Streak</p>
                      <p className="text-xl font-extrabold text-slate-900">-- <span className="text-sm font-medium text-slate-700">days</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-r border-white/40 pr-4 last:border-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-xl shadow-sm border border-emerald-100">
                      💪
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-700">This Week</p>
                      <p className="text-xl font-extrabold text-slate-900">-- <span className="text-sm font-medium text-slate-700">sessions</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-xl shadow-sm border border-purple-100">
                      🎯
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Macros</p>
                      <p className="text-xl font-extrabold text-slate-900">On Track</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'progress' && <ClientProgress clientId={client.id} />}
          
          {activeTab === 'workouts' && (
            <div className="space-y-10">
              <ClientWorkouts clientId={client.id} />
              {config.FEATURE_GAMIFICATION && <ClientGamification clientId={client.id} />}
            </div>
          )}
          
          {activeTab === 'diet' && <ClientDiet clientId={client.id} />}
          
          {activeTab === 'checkins' && <ClientCheckins clientId={client.id} />}
        </div>
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
