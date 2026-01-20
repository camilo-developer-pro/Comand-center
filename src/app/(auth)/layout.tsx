/**
 * Auth Layout
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * Shared layout for all authentication pages.
 * Centered card design with branding.
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Authentication - Command Center',
    description: 'Sign in or create an account',
};

interface AuthLayoutProps {
    children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            {/* Logo/Branding */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Command Center
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Your modular business dashboard
                </p>
            </div>

            {/* Auth Card */}
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
                    {children}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>© 2026 Command Center. All rights reserved.</p>
            </div>
        </div>
    );
}
