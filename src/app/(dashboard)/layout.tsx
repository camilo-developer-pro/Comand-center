/**
 * Dashboard Layout
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * Protected layout for authenticated users.
 */

import { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Toaster } from 'sonner';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Dashboard - Command Center',
};

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <Header />

            {/* Main Content */}
            <div className="flex">
                {/* Sidebar (placeholder - will be implemented in Phase 5) */}
                <aside className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hidden lg:block">
                    <div className="h-full p-4">
                        <nav className="space-y-1">
                            <Link
                                href="/documents"
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                Documents
                            </Link>

                            <Link
                                href="/settings"
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                                Settings
                            </Link>
                        </nav>
                    </div>
                </aside>

                {/* Main Area */}
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>

            {/* Toast Notifications */}
            <Toaster position="top-right" richColors closeButton />
        </div>
    );
}
