import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasRole } from '../../utils/permissions';
import { PageLoader } from '../ui/Loading';

/**
 * ProtectedRoute Wrapper
 * 
 * Guards routes based on authentication state and user roles.
 * 
 * @param {object} props
 * @param {string[]} [props.allowedRoles] - Array of roles allowed to access the route
 * @param {boolean} [props.requireAuth=true] - If false, route is accessible to guests only (like Login)
 */
export function ProtectedRoute({ allowedRoles, requireAuth = true }) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <PageLoader message="Verifying access..." />;
  }

  // 1. Route requires auth, but user is not logged in
  if (requireAuth && (!currentUser || !userProfile)) {
    return <Navigate to="/login" replace />;
  }

  // 2. Route requires guest (like Login), but user is logged in
  if (!requireAuth && currentUser && userProfile) {
    return <Navigate to="/" replace />;
  }

  // 3. Route requires specific roles, but user doesn't have them
  if (requireAuth && allowedRoles && allowedRoles.length > 0) {
    if (!hasRole(userProfile.role, allowedRoles)) {
      // In a real app you might want an /unauthorized page,
      // but redirecting to dashboard is safe.
      return <Navigate to="/" replace />;
    }
  }

  // User is authorized, render the route components
  return <Outlet />;
}
