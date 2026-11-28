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

/** Choose a landing page after authentication. All users may reprint existing QRs.
 * This navigation helper does not grant access to permission-protected modules.
 */
export const getFirstAllowedRoute = (permissions: string[], isAdmin: boolean): string | null => {
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

    return '/dashboard/qr-reprints';
};
