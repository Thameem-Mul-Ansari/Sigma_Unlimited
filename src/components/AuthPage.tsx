// components/AuthPage.tsx

import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AuthFormData {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

const AuthPage = () => {
    const { authState, setAuthState, signup, login, loginAsEmployee } = useAuth();

    const [isSignIn, setIsSignIn] = useState(true);
    const [loginMode, setLoginMode] = useState<'normal' | 'employee'>('normal'); // ← NEW
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState<AuthFormData>({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setSuccess(null);
    };

    const validateForm = (): boolean => {
        if (!formData.username.trim()) return false;

        if (!isSignIn && loginMode === 'normal' && !formData.email.trim()) return false;
        if (!isSignIn && loginMode === 'normal' && !/\S+@\S+\.\S+/.test(formData.email)) return false;

        if (!formData.password) return false;

        if (!isSignIn && loginMode === 'normal') {
            if (formData.password.length < 6) return false;
            if (formData.password !== formData.confirmPassword) return false;
        }

        return true;
    };

const handleSignUp = async () => {
    if (!validateForm()) return;

    const result = await signup(formData.username, formData.email, formData.password);

    if (result.success && result.token) {
        // Token exists → auto-login succeeded
        setSuccess('Account created successfully! Redirecting...');
        setTimeout(() => {
            window.location.href = '/chat';
        }, 1500);
    } else if (result.success && !result.token) {
        // Signup succeeded but no token → manual login required
        setSuccess('Account created successfully! Please sign in.');
        setFormData({ username: '', email: '', password: '', confirmPassword: '' });
        setTimeout(() => {
            setIsSignIn(true);
            setLoginMode('normal');
            setSuccess(null);
        }, 2000);
    } else {
        // Signup failed
        setSuccess(null); // Or set an error message if needed
    }
};

    const handleSignIn = async () => {
        if (!validateForm()) return;

        const successfulLogin = await login(formData.username, formData.password);

        if (successfulLogin) {
            setSuccess('Login successful! Redirecting...');
            const isAdmin = formData.username === 'admin' && formData.password === 'admin';

            setTimeout(() => {
                window.location.href = isAdmin ? '/admin' : '/chat';
            }, 1500);
        }
    };

    const handleEmployeeLogin = async () => {
        if (!formData.username.trim() || !formData.password) {
            setAuthState(prev => ({ ...prev, error: 'Username and password are required' }));
            return;
        }

        const success = await loginAsEmployee(formData.username, formData.password);

        if (success) {
            setSuccess('Employee login successful! Redirecting...');
            setTimeout(() => {
                window.location.href = '/chat';
            }, 1500);
        }
    };

    const handleSubmit = async () => {
        if (loginMode === 'employee') {
            await handleEmployeeLogin();
        } else if (isSignIn) {
            await handleSignIn();
        } else {
            await handleSignUp();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !authState.isLoading) {
            handleSubmit();
        }
    };

    const toggleMode = () => {
        setIsSignIn(!isSignIn);
        setLoginMode('normal');
        setFormData({ username: '', email: '', password: '', confirmPassword: '' });
        setSuccess(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">

                {/* Left Side - Branding */}
                <div className="flex-1 text-center lg:text-left space-y-6 max-w-xl">
                    <div className="flex items-center justify-center lg:justify-start gap-3 mb-8">
                        <img
                            src="/image.png"
                            alt="Unlimited Logo"
                            className="h-16 sm:h-20 w-auto"
                        />
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-800 leading-tight">
                            Welcome to <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">Unlimited</span>
                        </h1>
                        <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
                            Your intelligent assistant powered by advanced AI. Experience seamless conversations and get instant answers.
                        </p>
                    </div>

                    <div className="hidden lg:flex items-center gap-4 pt-8">
                        <Sparkles className="w-12 h-12 text-blue-600" />
                        <div>
                            <h3 className="font-semibold text-gray-800 text-lg">Smart & Intuitive</h3>
                            <p className="text-gray-600">Designed to understand and assist you better</p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Auth Card */}
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">

                        {/* Tabs */}
                        <div className="flex bg-gray-50 p-2">
                            <button
                                onClick={() => { setIsSignIn(true); setLoginMode('normal'); }}
                                className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm sm:text-base transition-all ${
                                    isSignIn && loginMode === 'normal'
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Sign In (App User)
                            </button>

                            <button
                                onClick={() => { setIsSignIn(true); setLoginMode('employee'); }}
                                className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm sm:text-base transition-all ${
                                    loginMode === 'employee'
                                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-600/30'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Employee Portal
                            </button>

                            <button
                                onClick={() => { setIsSignIn(false); setLoginMode('normal'); }}
                                className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm sm:text-base transition-all ${
                                    !isSignIn
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Sign Up
                            </button>
                        </div>

                        <div className="p-6 sm:p-8">
                            <div className="mb-6">
                                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                                    {loginMode === 'employee'
                                        ? 'Employee Portal Login'
                                        : isSignIn ? 'Welcome Back!' : 'Create Account'}
                                </h2>
                                <p className="text-gray-600 text-sm sm:text-base">
                                    {loginMode === 'employee'
                                        ? 'Sign in with your UBTI credentials'
                                        : isSignIn
                                            ? 'Sign in to continue your conversation'
                                            : 'Sign up to start chatting with Unlimited'}
                                </p>
                            </div>

                            {authState.error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{authState.error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-start gap-2">
                                    <Sparkles className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-green-700">{success}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Username */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Username
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Enter your username"
                                            className="w-full pl-12 pr-4 py-3 sm:py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            disabled={authState.isLoading}
                                        />
                                    </div>
                                </div>

                                {/* Email - only for normal signup */}
                                {!isSignIn && loginMode === 'normal' && (
                                    <div className="animate-in fade-in slide-in-from-right-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                onKeyPress={handleKeyPress}
                                                placeholder="Enter your email"
                                                className="w-full pl-12 pr-4 py-3 sm:py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                disabled={authState.isLoading}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Password */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Enter your password"
                                            className="w-full pl-12 pr-12 py-3 sm:py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            disabled={authState.isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            disabled={authState.isLoading}
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password - only normal signup */}
                                {!isSignIn && loginMode === 'normal' && (
                                    <div className="animate-in fade-in slide-in-from-right-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleInputChange}
                                                onKeyPress={handleKeyPress}
                                                placeholder="Confirm your password"
                                                className="w-full pl-12 pr-12 py-3 sm:py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                disabled={authState.isLoading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                disabled={authState.isLoading}
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={authState.isLoading || !validateForm()}
                                    className={`w-full py-3.5 sm:py-4 font-semibold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                                        loginMode === 'employee'
                                            ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-green-600/30'
                                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-600/30'
                                    }`}
                                >
                                    {authState.isLoading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Processing...</span>
                                        </div>
                                    ) : (
                                        loginMode === 'employee'
                                            ? 'Sign in as Employee'
                                            : isSignIn ? 'Sign In' : 'Sign Up'
                                    )}
                                </button>
                            </div>

                            {/* Toggle Link */}
                            {loginMode === 'normal' && (
                                <div className="mt-6 text-center">
                                    <p className="text-sm text-gray-600">
                                        {isSignIn ? "Don't have an account? " : 'Already have an account? '}
                                        <button
                                            onClick={toggleMode}
                                            disabled={authState.isLoading}
                                            className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                                        >
                                            {isSignIn ? 'Sign Up' : 'Sign In'}
                                        </button>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="text-center text-xs text-gray-500 mt-4 px-4">
                        By continuing, you agree to Unlimited's Terms of Service and Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;