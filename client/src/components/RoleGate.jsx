import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

/**
 * Component-level or Route-level gating.
 * Only renders children if user role is in the allowed `roles` array.
 */
export default function RoleGate({ roles, children, fallback = null }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || !roles.includes(user.role)) {
    return fallback;
  }

  return children;
}
