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
        // Redirect them to their "home" page (first allowed route).
        const redirectPath = getFirstAllowedRoute(permissions, isAdmin);
        return <Navigate to={redirectPath} replace />;
    }

    return <>{children}</>;
};

export default PermissionGuard;
