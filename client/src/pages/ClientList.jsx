// The dashboard / client list — a quick view of every client at a glance.
// Add, edit, and delete live here; clicking a client goes to their detail page.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import ClientFormModal from '../components/ClientFormModal.jsx';
import { listClients, deleteClient } from '../api/clients.js';

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function ClientList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    try {
      const data = await listClients();
      setClients(data.clients);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(client) {
    setEditing(client);
    setModalOpen(true);
  }

  function handleSaved(savedClient) {
    setClients((prev) => {
      const exists = prev.some((c) => c.id === savedClient.id);
      return exists
        ? prev.map((c) => (c.id === savedClient.id ? savedClient : c))
        : [savedClient, ...prev];
    });
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(client) {
    if (!window.confirm(`Delete ${client.name}? This can't be undone.`)) return;
    try {
      await deleteClient(client.id);
      setClients((prev) => prev.filter((c) => c.id !== client.id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-slate-400">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          + Add client
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl bg-slate-800 p-8 text-center text-slate-400">
          No clients yet — add your first one.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <div key={client.id} className="rounded-2xl bg-slate-800 p-4">
              <div className="flex items-start gap-3">
                {client.photo_url ? (
                  <img
                    src={client.photo_url}
                    alt=""
                    className="h-12 w-12 rounded-full bg-slate-700 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-slate-400">
                    {initials(client.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    to={`/clients/${client.id}`}
                    className="block truncate font-semibold transition hover:text-emerald-400"
                  >
                    {client.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {client.start_date ? `Since ${client.start_date}` : 'No start date'}
                  </p>
                  {client.goals && (
                    <p className="mt-1 truncate text-sm text-slate-400">{client.goals}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => openEdit(client)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(client)}
                  className="rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-950"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ClientFormModal
          client={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </AppShell>
  );
}
