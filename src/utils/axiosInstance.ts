import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authService } from './authService';

// Use the environment variable or fallback
// Use the environment variable or fallback
const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://d3tat64zqbamt7.cloudfront.net');

export const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    timeout: 60000
});

// Request Interceptor
axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = authService.getToken();

        // Check if the request is for a protected route
        // We can either check the URL or just attach token if it exists
        // The user requirement says: "Token must be sent on every protected API call."
        // It's safer to send it if we have it, unless it's explicitly an unprotected route that might reject it.
        // However, typically sending a Bearer token to a public endpoint is fine.

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // "Username should NOT be sent from frontend anymore" - OLD REQUIREMENT
        // New requirement: Some endpoints (like Create Product) DO require username.
        // Removing the code that strips it.
        /*
        if (config.data && typeof config.data === 'object' && 'username' in config.data) {
            // Create a copy to avoid mutating the original object if it's used elsewhere
            const { username, ...rest } = config.data;
            config.data = rest;
        }
        */

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            authService.clearAuthSession();
            // Redirect to login
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
