// Shared logged-in layout: header with app title + logout, content below.
// Every authenticated page renders inside this.
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import bgNature from '../assets/bg-nature.avif';

export default function AppShell({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="relative min-h-screen text-slate-800 font-sans">
      {/* Background Image Layer with soft overlay */}
      <div 
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${bgNature})` }}
      >
        <div className="absolute inset-0 bg-emerald-200/30" />
      </div>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/30 bg-white/40 px-4 py-4 shadow-lg shadow-emerald-900/5 backdrop-blur-xl sm:px-6">
        <Link to="/" className="text-xl font-extrabold tracking-tight text-slate-900 transition hover:text-slate-700">
          Coach&apos;s Client App
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-slate-800 sm:inline">
            Signed in as <span className="font-bold text-slate-900">{user.username}</span>
          </span>
          <button
            onClick={logout}
            className="rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-lg shadow-emerald-900/5 transition-all hover:bg-white hover:text-slate-900 sm:py-1.5"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
