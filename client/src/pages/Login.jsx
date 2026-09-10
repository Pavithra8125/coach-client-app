// The only public page — the coach signs in here. On success, goes to the
// page they originally tried to visit (or the dashboard).
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import bgNature from '../assets/bg-nature.avif';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname ?? '/';

  // Already logged in — don't show the login form.
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 ' +
    'placeholder-slate-500 outline-none focus:border-slate-500';

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      {/* Background Image Layer with soft overlay */}
      <div 
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${bgNature})` }}
      >
        <div className="absolute inset-0 bg-emerald-200/30" />
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-white/50 bg-white/95 p-8 shadow-2xl shadow-emerald-900/10 backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-slate-900">Coach&apos;s Client App</h1>
        <p className="mb-6 mt-1 text-sm text-slate-700">Sign in to manage your clients.</p>

        <label htmlFor="username" className="block text-sm font-medium text-slate-800">
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          className={inputClass}
        />

        <label htmlFor="password" className="mt-4 block text-sm font-medium text-slate-800">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className={inputClass}
        />

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-slate-900 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
