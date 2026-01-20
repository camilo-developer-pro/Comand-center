'use client';

/**
 * Login Form Component
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * Handles email/password login with validation.
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { loginSchema, type LoginInput } from '../schemas';
import { signInWithPassword } from '../actions/authActions';

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);

    // Get redirect URL from query params
    const redirectTo = searchParams.get('redirectTo') || '/documents';

    // Get error from query params (e.g., from OAuth failure)
    const urlError = searchParams.get('error');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    async function onSubmit(data: LoginInput) {
        setIsLoading(true);

        try {
            // Create FormData for server action
            const formData = new FormData();
            formData.append('email', data.email);
            formData.append('password', data.password);

            const result = await signInWithPassword(formData);

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success('Welcome back!');
            router.push(result.redirectTo || redirectTo);
            router.refresh();
        } catch (error) {
            toast.error('An unexpected error occurred. Please try again.');
            console.error('[LoginForm] Submit error:', error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* URL Error Alert */}
            {urlError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                    {urlError}
                </div>
            )}

            {/* Email Field */}
            <div>
                <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                    Email address
                </label>
                <input
                    {...register('email')}
                    type="email"
                    id="email"
                    autoComplete="email"
                    disabled={isLoading}
                    className={`
            w-full px-3 py-2 border rounded-lg shadow-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            dark:bg-gray-700 dark:border-gray-600 dark:text-white
            ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
          `}
                    placeholder="you@example.com"
                />
                {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.email.message}
                    </p>
                )}
            </div>

            {/* Password Field */}
            <div>
                <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                    Password
                </label>
                <input
                    {...register('password')}
                    type="password"
                    id="password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className={`
            w-full px-3 py-2 border rounded-lg shadow-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            dark:bg-gray-700 dark:border-gray-600 dark:text-white
            ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
          `}
                    placeholder="••••••••"
                />
                {errors.password && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.password.message}
                    </p>
                )}
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
                <a
                    href="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                    Forgot your password?
                </a>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isLoading}
                className={`
          w-full px-4 py-2 text-sm font-medium text-white rounded-lg
          transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          ${isLoading
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }
        `}
            >
                {isLoading ? (
                    <span className="flex items-center justify-center">
                        <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        Signing in...
                    </span>
                ) : (
                    'Sign in'
                )}
            </button>
        </form>
    );
}
