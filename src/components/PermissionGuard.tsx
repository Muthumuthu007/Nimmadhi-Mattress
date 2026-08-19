import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFirstAllowedRoute } from '../utils/permissionUtils';

interface PermissionGuardProps {
    children: React.ReactNode;
    permission: string;
}

/**
 * Guard that ensures user has a specific permission.
 * If not, redirects to the user's first allowed route.
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({ children, permission }) => {
    const { hasPermission, permissions, isAdmin } = useAuth();

    if (!hasPermission(permission)) {
        // User doesn't have the specific permission required for this route.
        // Redirect them to their "home" page (first allowed route). If none
        // matches, send them to /unauthorized — a route with no permission
        // guard of its own — rather than risk looping back into this guard.
        const redirectPath = getFirstAllowedRoute(permissions, isAdmin) ?? '/unauthorized';
        return <Navigate to={redirectPath} replace />;
    }

    return <>{children}</>;
};

export default PermissionGuard;
