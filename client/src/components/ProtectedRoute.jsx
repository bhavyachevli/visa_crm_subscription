import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

/**
 * ProtectedRoute — blocks unauthenticated users.
 * Optional `roles` prop restricts to specific roles.
 * 
 * Usage in App.jsx:
 *   <Route element={<ProtectedRoute />}>           // Any logged-in user
 *   <Route element={<ProtectedRoute roles={['CEO']} />}>  // CEO only
 */
export function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-800" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
