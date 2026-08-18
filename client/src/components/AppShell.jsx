// Shared logged-in layout: header with app title + logout, content below.
// Every authenticated page renders inside this.
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function AppShell({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black text-slate-100 font-sans">
      <header className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/50 px-6 py-4 backdrop-blur-md">
        <Link to="/" className="text-xl font-extrabold tracking-tight transition hover:text-white">
          Coach&apos;s Client App
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">
            Signed in as <span className="font-semibold text-slate-200">{user.username}</span>
          </span>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-700/80 bg-slate-800/50 px-3 py-1.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
