/**
 * Verify Email Page
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * Shown after registration when email confirmation is required.
 */

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Verify Email - Command Center',
};

export default function VerifyEmailPage() {
    return (
        <div className="text-center">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-6">
                <svg
                    className="w-8 h-8 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                </svg>
            </div>

            {/* Content */}
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Check your email
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                We&apos;ve sent you a verification link. Please check your inbox and click
                the link to verify your email address.
            </p>

            {/* Info Box */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Didn&apos;t receive the email?</strong>
                </p>
                <ul className="mt-2 text-sm text-gray-500 dark:text-gray-400 list-disc list-inside">
                    <li>Check your spam folder</li>
                    <li>Make sure you entered the correct email</li>
                    <li>Wait a few minutes and try again</li>
                </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3">
                <Link
                    href="/login"
                    className="block w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                    Back to Sign In
                </Link>
                <Link
                    href="/register"
                    className="block w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    Try a different email
                </Link>
            </div>
        </div>
    );
}
