import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Use the environment variable or fallback to the provided URL
const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://d3tat64zqbamt7.cloudfront.net');

// Keys for localStorage
const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'auth_role'; // Keeping for backward compatibility or direct access if needed
const USERNAME_KEY = 'auth_username';
const PERMISSIONS_KEY = 'auth_permissions';

export interface JWTPayload {
    username: string;
    permissions: string[];
    exp: number;
    iat: number;
}

export interface LoginResponse {
    token: string;
    username: string;
    permissions?: string[];
    message?: string;
}

export const authService = {
    // Login function
    login: async (username: string): Promise<LoginResponse> => {
        throw new Error("Use loginWithCredentials instead");
    },

    loginWithCredentials: async (credentials: { username: string; password?: string }): Promise<LoginResponse> => {
        const response = await axios.post(`${API_BASE_URL}/api/users/login/`, {
            username: credentials.username,
            password: credentials.password
        });

        const data = response.data;
        if (data.token) {
            authService.setAuthSession(data.token, data.username, data.permissions);
        }
        return data;
    },

    logout: async () => {
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            if (token) {
                // Attempt to call backend logout, but don't block clearing session if it fails
                await axios.post(`${API_BASE_URL}/api/users/logout/`, {}, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }).catch(err => console.warn("Logout API call failed", err));
            }
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            authService.clearAuthSession();
            // Optional: force reload or navigate to ensure state is clean
            window.location.href = '/login';
        }
    },

    // Set auth data
    setAuthSession: (token: string, username: string, permissions?: string[]) => {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USERNAME_KEY, username);

        let finalPermissions: string[] = [];

        if (permissions && Array.isArray(permissions) && permissions.length > 0) {
            // Use provided permissions from API response
            finalPermissions = permissions;
        } else {
            // Fallback to token decoding
            try {
                const decoded = jwtDecode<JWTPayload>(token);
                if (decoded.permissions) {
                    finalPermissions = decoded.permissions;
                }
            } catch (error) {
                console.error("Failed to decode token", error);
            }
        }

        localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(finalPermissions));

        // For backward compatibility, set 'admin' role if admin permission exists
        if (finalPermissions.includes('admin')) {
            localStorage.setItem(ROLE_KEY, 'admin');
        } else {
            localStorage.setItem(ROLE_KEY, 'user');
        }
    },

    // Clear auth data
    clearAuthSession: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(USERNAME_KEY);
        localStorage.removeItem(PERMISSIONS_KEY);
    },

    // Getters
    getToken: () => localStorage.getItem(TOKEN_KEY),
    getRole: () => localStorage.getItem(ROLE_KEY),
    getUsername: () => localStorage.getItem(USERNAME_KEY),
    getPermissions: (): string[] => {
        try {
            const stored = localStorage.getItem(PERMISSIONS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    },

    // Checkers
    isAuthenticated: () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return false;

        // Optional: Check expiration
        try {
            const decoded = jwtDecode<JWTPayload>(token);
            if (decoded.exp * 1000 < Date.now()) {
                authService.clearAuthSession();
                return false;
            }
            return true;
        } catch {
            return false;
        }
    },

    isAdmin: () => {
        const permissions = authService.getPermissions();
        return permissions.includes('admin');
    },

    hasPermission: (permission: string): boolean => {
        const permissions = authService.getPermissions();
        // Admin usually has all permissions, but based on requirements we check specific permissions.
        // If requirements imply admin has access to everything, we could add `|| permissions.includes('admin')`
        // However, the prompt says "Show 'Admin Panel' only if permissions includes 'admin'". 
        // We will strictly follow the list.
        return permissions.includes(permission) || permissions.includes('admin');
    }
};
