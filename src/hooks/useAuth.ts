// src/hooks/useAuth.ts ← FINAL VERSION — WORKS 100%

import { useState, useCallback } from 'react';

const SIGNUP_URL = 'https://h43mkhn4-8000.inc1.devtunnels.ms/api/signup/';
const LOGIN_URL = 'https://h43mkhn4-8000.inc1.devtunnels.ms/api/login/';
const EMPLOYEE_LOGIN_URL = 'https://nextjs-boilerplate-git-main-princebhowras-projects.vercel.app/api/login';

export interface UserData {
  user_id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  isEmployee?: boolean;
  employeeUsername?: string;
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
    const token = localStorage.getItem('authToken');
    const userDataStr = localStorage.getItem('userData');
    let userData: UserData | null = null;

    if (userDataStr) {
      try {
        userData = JSON.parse(userDataStr);
      } catch {
        localStorage.removeItem('userData');
      }
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
    const res = await fetch(SIGNUP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.username?.[0] ||
        data.email?.[0] ||
        data.password?.[0] ||
        data.non_field_errors?.[0] ||
        'Sign up failed'
      );
    }

    // If backend returns token → login automatically
    if (data.token) {
      const token = `Token ${data.token}`;
      const userData: UserData = {
        user_id: data.user_id,
        username: data.username,
        email: data.email,
        isAdmin: false,
      };

      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));

      setAuthState({
        authToken: token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userData,
      });

      return { success: true, token, userData };  // ← RETURN TOKEN!
    }

    setAuthState(prev => ({ ...prev, isLoading: false }));
    return { success: true, token: null, userData: null };

  } catch (err: any) {
    setAuthState(prev => ({
      ...prev,
      isLoading: false,
      error: err.message || 'Network error',
    }));
    return { success: false, token: null, userData: null };
  }
}, []);

  // Normal App Login
  const login = useCallback(async (username: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.non_field_errors?.[0] || errData.detail || 'Invalid credentials');
      }

      const data = await res.json();
      const token = `Token ${data.token}`;
      const isAdministrator = username === 'admin' && password === 'admin';

      const userData: UserData = {
        user_id: data.user_id || 0,
        username: data.username || username,
        email: data.email || '',
        isAdmin: isAdministrator,
      };

      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));

      setAuthState({
        authToken: token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userData,
      });

      return true;
    } catch (err: any) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Login failed',
      }));
      return false;
    }
  }, []);

// Employee Portal Login – NOW gets real user_id + REAL TOKEN from our own DB
const loginAsEmployee = useCallback(async (username: string, password: string) => {
  setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

  const formData = new URLSearchParams();
  formData.append('CheckUserNamePassword', 'SUBMIT');
  formData.append('RedirectUrl', 'https://portal.ubtiinc.com/TimetrackForms/Dashboard/Index');
  formData.append('UserIdentification.Username', username);
  formData.append('Password', password);
  formData.append('UserIdentification.RememberMe', 'true');
  formData.append('X-Requested-With', 'XMLHttpRequest');

  try {
    // Step 1: Validate against Trinity (Employee Portal)
    
    const response = await fetch(EMPLOYEE_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
      },
      body: formData,
    });

    const json = await response.json();

    if (json.success !== true || !json.trinityAuth) {
      throw new Error('Invalid employee credentials');
    }

   const fullAuthCookie = json.trinityAuth || '';

    if (!fullAuthCookie) {
      throw new Error('Missing Trinity auth cookie');
    }

// Step 2: Sync with OUR Django backend
let djangoToken: string | null = null;
let userData: UserData | null = null;

let loginSuccess = await login(username, password);

if (!loginSuccess) {
  const email = `${username}@ubtiinc.com`;
  const signupResult = await signup(username, email, password);

  if (signupResult.success && signupResult.token) {
    // Token came directly from signup!
    djangoToken = signupResult.token;
    userData = signupResult.userData;
  } else if (signupResult.success) {
    // Signup succeeded but no auto-login → now login
    loginSuccess = await login(username, password);
  }
}

// Final fallback: read from localStorage (only if login() was used)
if (!djangoToken) {
  djangoToken = localStorage.getItem('authToken');
  const stored = localStorage.getItem('userData');
  userData = stored ? JSON.parse(stored) : null;
}

if (!djangoToken) {
  throw new Error('Failed to get Django auth token after sync');
}

// Now mark as employee
const employeeData: UserData = {
  ...(userData || { user_id: 0, username, email: `${username}@ubtiinc.com`, isAdmin: false }),
  isEmployee: true,
  employeeUsername: username,
};

// Save everything
localStorage.setItem('userData2', JSON.stringify(employeeData));
localStorage.setItem('trinityAuth', fullAuthCookie);
localStorage.setItem('authToken', djangoToken);  // Ensure it's saved
localStorage.setItem('userData', JSON.stringify(employeeData));

setAuthState({
  authToken: djangoToken,
  isAuthenticated: true,
  isLoading: false,
  error: null,
  userData: employeeData,
});

return true;

  } catch (err: any) {
    setAuthState(prev => ({
      ...prev,
      isLoading: false,
      error: err.message || 'Employee login failed',
    }));
    return false;
  }
}, [login, signup]);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userData2');
    localStorage.removeItem('trinityAuth');
    localStorage.removeItem('trinityLoginCookie');
    localStorage.removeItem('activeChatId');
    setAuthState({
      authToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userData: null,
    });
  }, []);


  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    authState,
    setAuthState,
    signup,
    login,
    loginAsEmployee,
    logout,
    clearError,
  };
};

export type UseAuthReturn = ReturnType<typeof useAuth>;