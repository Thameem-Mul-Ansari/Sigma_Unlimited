// useAuth.ts
import { useState, useCallback } from 'react';

// API URLs
const SIGNUP_URL = 'https://gx5cdmd5-8000.inc1.devtunnels.ms/api/signup/';
const LOGIN_URL = 'https://gx5cdmd5-8000.inc1.devtunnels.ms/api/login/';

export interface UserData {
    user_id: number;
    username: string;
    email: string;
    // New field to track admin status
    isAdmin: boolean;
}

export interface AuthState {
    authToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    userData: UserData | null;
}

export const useAuth = () => {
    const [authState, setAuthState] = useState<AuthState>(() => {
        // On initial load, check if token and user data exist in localStorage
        const token = localStorage.getItem('authToken');
        const userDataStr = localStorage.getItem('userData');
        let userData: UserData | null = null;

        try {
            userData = userDataStr ? JSON.parse(userDataStr) : null;
        } catch (error) {
            console.error('Error parsing stored user data:', error);
            localStorage.removeItem('userData');
        }

        return {
            authToken: token,
            isAuthenticated: !!token,
            isLoading: false,
            error: null,
            userData,
        };
    });

    const signup = useCallback(async (username: string, email: string, password: string) => {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await fetch(SIGNUP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = 
                    data.username?.[0] || 
                    data.email?.[0] || 
                    data.password?.[0] || 
                    data.non_field_errors?.[0] ||
                    'Sign up failed. Please try again.';
                throw new Error(errorMessage);
            }

            if (data.token) {
                const finalToken = `Token ${data.token}`;
                const userData: UserData = {
                    user_id: data.user_id,
                    username: data.username,
                    email: data.email,
                    isAdmin: false, // Regular user by default
                };
                
                localStorage.setItem('authToken', finalToken);
                localStorage.setItem('userData', JSON.stringify(userData));
                
                setAuthState({
                    authToken: finalToken,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                    userData,
                });
                return { success: true, autoLogin: true };
            }

            // If no token is returned, signup was successful but user needs to log in
            setAuthState(prev => ({ ...prev, isLoading: false }));
            return { success: true, autoLogin: false };

        } catch (err: any) {
            const errorMessage = err.message || 'An unexpected network error occurred.';
            setAuthState({
                authToken: null,
                isAuthenticated: false,
                isLoading: false,
                error: errorMessage,
                userData: null,
            });
            console.error("Signup Error:", err);
            return { success: false, autoLogin: false };
        }
    }, []);

    /**
     * Log in an existing user
     */
    const login = useCallback(async (username: string, password: string) => {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await fetch(LOGIN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = 
                    errorData.non_field_errors?.[0] || 
                    errorData.detail ||
                    'Login failed. Invalid credentials.';
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const token = data.token;

            if (!token) {
                throw new Error('Login successful but no token received from server.');
            }

            // Determine if the user is the hardcoded admin
            // NOTE: Hardcoding admin credentials like this is a security risk for production!
            const isAdministrator = (username === 'admin' && password === 'admin');

            // Store the token with "Token " prefix and user data
            const finalToken = `Token ${token}`;
            const userData: UserData = {
                user_id: data.user_id,
                username: data.username,
                email: data.email,
                isAdmin: isAdministrator, // Set the isAdmin flag here
            };
            
            localStorage.setItem('authToken', finalToken);
            localStorage.setItem('userData', JSON.stringify(userData));
            
            setAuthState({
                authToken: finalToken,
                isAuthenticated: true,
                isLoading: false,
                error: null,
                userData,
            });

            return true;

        } catch (err: any) {
            const errorMessage = err.message || 'An unexpected network error occurred.';
            
            setAuthState({
                authToken: null,
                isAuthenticated: false,
                isLoading: false,
                error: errorMessage,
                userData: null,
            });
            console.error("Login Error:", err);
            return false;
        }
    }, []);

    /**
     * Log out the current user
     */
    const logout = useCallback(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        setAuthState({
            authToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            userData: null,
        });
    }, []);

    /**
     * Clear any authentication errors
     */
    const clearError = useCallback(() => {
        setAuthState(prev => ({ ...prev, error: null }));
    }, []);

    return { 
        authState, 
        signup, 
        login, 
        logout, // <<< Exported logout
        clearError 
    };
};

export type UseAuthReturn = ReturnType<typeof useAuth>;