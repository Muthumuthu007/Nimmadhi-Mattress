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
 * Admin always gets /admin.
 *
 * Returns `null` when the user has no matching permission at all, rather than
 * guessing a fallback route. Callers MUST treat `null` as "no accessible
 * route" (e.g. show an unauthorized message) instead of navigating with it —
 * a route guard that redirects to a fallback like '/dashboard' can send a
 * permission-less user right back into the same guard that just rejected
 * them, causing an infinite redirect loop with a permanently blank page and
 * no console error, since <Navigate> never issues a network request.
 *
 * @param permissions Array of user permissions
 * @param isAdmin boolean indicating if user is admin
 * @returns string path to redirect to, or null if none match
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

    // No permission matched anything in PERMISSION_ROUTES (or permissions is
    // empty). There is no safe route to send this user to.
    return null;
};
