/**
 * Register Page
 * 
 * V1.1 Phase 1: Authentication & User Flow
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from '@/modules/core/auth/components/RegisterForm';
import { OAuthButtons } from '@/modules/core/auth/components/OAuthButtons';

export const metadata: Metadata = {
    title: 'Create Account - Command Center',
    description: 'Create your Command Center account',
};

export default function RegisterPage() {
    return (
        <div>
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Create your account
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Start building your command center
                </p>
            </div>

            {/* OAuth Buttons */}
            <OAuthButtons mode="register" />

            {/* Divider */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                        Or register with email
                    </span>
                </div>
            </div>

            {/* Register Form */}
            <RegisterForm />

            {/* Login Link */}
            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link
                    href="/login"
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                    Sign in
                </Link>
            </p>
        </div>
    );
}
