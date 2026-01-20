'use client';

/**
 * Register Form Component
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * Handles user registration with automatic workspace creation.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { registerSchema, type RegisterInput } from '../schemas';
import { signUpWithPassword } from '../actions/authActions';

export function RegisterForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
            fullName: '',
            workspaceName: '',
        },
    });

    // Watch full name to suggest workspace name
    const fullName = watch('fullName');

    async function onSubmit(data: RegisterInput) {
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('email', data.email);
            formData.append('password', data.password);
            formData.append('confirmPassword', data.confirmPassword);
            formData.append('fullName', data.fullName);
            formData.append('workspaceName', data.workspaceName);

            const result = await signUpWithPassword(formData);

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success('Account created successfully!');

            // Redirect based on whether email confirmation is required
            if (result.redirectTo === '/auth/verify-email') {
                router.push('/verify-email');
            } else {
                router.push(result.redirectTo || '/documents');
                router.refresh();
            }
        } catch (error) {
            toast.error('An unexpected error occurred. Please try again.');
            console.error('[RegisterForm] Submit error:', error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name Field */}
            <div>
                <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                    Full name
                </label>
                <input
                    {...register('fullName')}
                    type="text"
                    id="fullName"
                    autoComplete="name"
                    disabled={isLoading}
                    className={`
            w-full px-3 py-2 border rounded-lg shadow-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            dark:bg-gray-700 dark:border-gray-600 dark:text-white
            ${errors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
          `}
                    placeholder="John Doe"
                />
                {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.fullName.message}
                    </p>
                )}
            </div>

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
                    autoComplete="new-password"
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
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    At least 8 characters with uppercase, lowercase, and number
                </p>
            </div>

            {/* Confirm Password Field */}
            <div>
                <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                    Confirm password
                </label>
                <input
                    {...register('confirmPassword')}
                    type="password"
                    id="confirmPassword"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className={`
            w-full px-3 py-2 border rounded-lg shadow-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            dark:bg-gray-700 dark:border-gray-600 dark:text-white
            ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
          `}
                    placeholder="••••••••"
                />
                {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.confirmPassword.message}
                    </p>
                )}
            </div>

            {/* Workspace Name Field */}
            <div>
                <label
                    htmlFor="workspaceName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                    Workspace name
                </label>
                <input
                    {...register('workspaceName')}
                    type="text"
                    id="workspaceName"
                    disabled={isLoading}
                    className={`
            w-full px-3 py-2 border rounded-lg shadow-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            dark:bg-gray-700 dark:border-gray-600 dark:text-white
            ${errors.workspaceName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
          `}
                    placeholder={fullName ? `${fullName.split(' ')[0]}'s Workspace` : 'My Workspace'}
                />
                {errors.workspaceName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.workspaceName.message}
                    </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This will be the name of your team workspace
                </p>
            </div>

            {/* Terms Agreement */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
                By creating an account, you agree to our{' '}
                <a href="/terms" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
                    Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
                    Privacy Policy
                </a>
                .
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
                        Creating account...
                    </span>
                ) : (
                    'Create account'
                )}
            </button>
        </form>
    );
}
