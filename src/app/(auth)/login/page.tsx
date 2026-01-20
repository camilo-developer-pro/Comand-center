/**
 * Login Page
 * 
 * V1.1 Phase 1: Authentication & User Flow
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from '@/modules/core/auth/components/LoginForm';
import { OAuthButtons } from '@/modules/core/auth/components/OAuthButtons';

export const metadata: Metadata = {
    title: 'Sign In - Command Center',
    description: 'Sign in to your Command Center account',
};

export default function LoginPage() {
    return (
        <div>
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Welcome back
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Sign in to your account to continue
                </p>
            </div>

            {/* OAuth Buttons */}
            <OAuthButtons mode="login" />

            {/* Divider */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                        Or continue with email
                    </span>
                </div>
            </div>

            {/* Login Form */}
            <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg" />}>
                <LoginForm />
            </Suspense>

            {/* Register Link */}
            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                Don&apos;t have an account?{' '}
                <Link
                    href="/register"
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                    Create one now
                </Link>
            </p>
        </div>
    );
}
