/**
 * Maps permission keys to their corresponding route paths.
 * Order matters: this order determines which page is checked first for default redirection.
 */
export const PERMISSION_ROUTES: Record<string, string> = {
    'dashboard': '/dashboard',
    'grn': '/dashboard/grn',
    'costing': '/dashboard/costing',
    'inventory': '/dashboard/inventory',
    'production': '/dashboard/production',
    'dispatch': '/dashboard/dispatched',
    'reports': '/dashboard/reports'
};

/**
 * Returns the first route path that the user has permission to access.
 * If no specific permissions match, defaults to /dashboard (or login if unauthenticated logic handles it).
 * Admin always gets /admin or /dashboard as fallback.
 * 
 * @param permissions Array of user permissions
 * @param isAdmin boolean indicating if user is admin
 * @returns string path to redirect to
 */
export const getFirstAllowedRoute = (permissions: string[], isAdmin: boolean): string => {
    if (isAdmin) {
        return '/admin';
    }

    // Iterate through the defined route map in order
    // This ensures a consistent "home" page based on hierarchy/priority
    for (const [permission, route] of Object.entries(PERMISSION_ROUTES)) {
        if (permissions.includes(permission)) {
            return route;
        }
    }

    // Fallback: if user has permissions but none match our map (shouldn't happen with correct config),
    // or if permissions array is empty. 
    // Ideally, redirect to a "Unauthorized" or specific default.
    // For now, attempting /dashboard logic or let the router handle it.
    // If they have NO permissions, ProtectedRoute will likely block them anyway if we guard /dashboard.
    return '/dashboard';
};
