import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

/**
 * ProtectedRoute — blocks unauthenticated users and enforces active subscription.
 * Optional `roles` prop restricts to specific roles.
 */
export function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

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

  // Enforce subscription gate (unless navigating to the billing portal page itself)
  const isSubscribed = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
  if (!isSubscribed && location.pathname !== '/billing') {
    return <Navigate to="/billing" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

