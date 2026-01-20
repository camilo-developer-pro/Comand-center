/**
 * Dashboard Header Component
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * Top navigation bar with workspace name and user menu.
 */

import { getCurrentUser } from '@/modules/core/auth/actions/authActions';
import { UserMenu } from '@/modules/core/auth/components/UserMenu';
import Link from 'next/link';

export async function Header() {
    const userData = await getCurrentUser();

    return (
        <header className="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="h-full px-4 flex items-center justify-between">
                {/* Left: Logo/Workspace */}
                <div className="flex items-center gap-4">
                    {/* Logo */}
                    <Link href="/documents" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">CC</span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white hidden sm:block">
                            Command Center
                        </span>
                    </Link>

                    {/* Workspace Name */}
                    {userData?.workspace && (
                        <>
                            <span className="text-gray-300 dark:text-gray-600">/</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {userData.workspace.name}
                            </span>
                        </>
                    )}
                </div>

                {/* Center: Search (placeholder for future) */}
                <div className="flex-1 max-w-md mx-4 hidden md:block">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search documents..."
                            className={`
                w-full px-4 py-1.5 pl-10 text-sm
                bg-gray-100 dark:bg-gray-700
                border border-transparent
                rounded-lg
                focus:bg-white dark:focus:bg-gray-600
                focus:border-gray-300 dark:focus:border-gray-500
                focus:outline-none focus:ring-2 focus:ring-blue-500
                placeholder-gray-500 dark:placeholder-gray-400
                text-gray-900 dark:text-white
              `}
                        />
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Right: User Menu */}
                <div className="flex items-center gap-2">
                    {userData?.user ? (
                        <UserMenu user={userData.user} />
                    ) : (
                        <Link
                            href="/login"
                            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            Sign in
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
