// Post-login home. Slice 2 turns this into the client list/dashboard.
import { useAuth } from '../auth/AuthContext.jsx';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <h1 className="text-lg font-bold">Coach&apos;s Client App</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">
            Signed in as <span className="font-medium text-slate-200">{user.username}</span>
          </span>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="p-6">
        <p className="text-slate-400">Login works. Next up: client list &amp; add/edit profiles (slice 2).</p>
      </main>
    </div>
  );
}
