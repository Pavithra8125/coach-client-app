// Shared logged-in layout: header with app title + logout, content below.
// Every authenticated page renders inside this.
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function AppShell({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <Link to="/" className="text-lg font-bold transition hover:text-slate-300">
          Coach&apos;s Client App
        </Link>
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
      <main className="p-6">{children}</main>
    </div>
  );
}
