// Wraps pages that require a login. Shows a spinner while the session is
// being checked, then either renders the page or bounces to /login.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-400">
        Loading…
      </div>
    );
  }
  if (!user) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
