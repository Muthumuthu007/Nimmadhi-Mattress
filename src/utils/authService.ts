import axios from 'axios';

// Use the environment variable or fallback to the provided URL
const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://d3tat64zqbamt7.cloudfront.net');

// Keys for localStorage
const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'auth_role';
const USERNAME_KEY = 'auth_username';

export interface LoginResponse {
    token: string;
    role: 'user' | 'admin';
    username: string;
    message?: string;
}

export const authService = {
    // Login function
    login: async (username: string): Promise<LoginResponse> => {
        // Note: The backend rules say "Login gives a JWT token". 
        // We are calling POST /api/users/login/
        // We assume the payload is { username: "..." } or similar. 
        // If password is required, we'll need to update this.
        // Based on previous code, it was just username/password.
        // We'll send username and let the backend handle it. 
        // If password is needed, the UI should provide it.
        // For now, we'll assume the Login page will pass the necessary credentials.
        // But wait, the interface above only takes username. 
        // Let's update it to take credentials object to be safe.
        throw new Error("Use loginWithCredentials instead");
    },

    loginWithCredentials: async (credentials: { username: string; password?: string }): Promise<LoginResponse> => {
        const response = await axios.post(`${API_BASE_URL}/api/users/login/`, {
            username: credentials.username,
            password: credentials.password, // Optional depending on backend
            operation: 'LoginUser' // Keeping this for backward compatibility if needed, though new backend might not need it
        });

        const data = response.data;
        if (data.token) {
            authService.setAuthSession(data.token, data.role, data.username);
        }
        return data;
    },

    logout: async () => {
        try {
            // Call logout API
            // We need the token for this, so we'll use axios directly with the header
            // or rely on the axiosInstance if we were importing it (circular dependency risk).
            // Let's just use axios directly here.
            const token = localStorage.getItem(TOKEN_KEY);
            if (token) {
                await axios.post(`${API_BASE_URL}/api/users/logout/`, {}, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            authService.clearAuthSession();
            window.location.href = '/login';
        }
    },

    // Set auth data
    setAuthSession: (token: string, role: string, username: string) => {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(ROLE_KEY, role);
        localStorage.setItem(USERNAME_KEY, username);
    },

    // Clear auth data
    clearAuthSession: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(USERNAME_KEY);
    },

    // Getters
    getToken: () => localStorage.getItem(TOKEN_KEY),
    getRole: () => localStorage.getItem(ROLE_KEY),
    getUsername: () => localStorage.getItem(USERNAME_KEY),

    // Checkers
    isAuthenticated: () => !!localStorage.getItem(TOKEN_KEY),
    isAdmin: () => localStorage.getItem(ROLE_KEY) === 'admin',
};
