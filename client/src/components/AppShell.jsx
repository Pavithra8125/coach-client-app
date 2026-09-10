// Shared logged-in layout: header with app title + logout, content below.
// Every authenticated page renders inside this.
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function AppShell({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 py-4 shadow-sm">
        <Link to="/" className="text-xl font-extrabold tracking-tight text-slate-900 transition hover:text-slate-700">
          Coach&apos;s Client App
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-sm text-slate-500">
            Signed in as <span className="font-medium text-slate-900">{user.username}</span>
          </span>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 sm:py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
