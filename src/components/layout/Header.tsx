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

import { SearchManager } from '@/modules/core/search';
import { SuperAdminBadge } from '@/modules/core/admin/components/SuperAdminBadge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

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

                    {/* Super Admin Badge */}
                    {userData?.isSuperAdmin && (
                        <div className="flex items-center gap-2">
                            <SuperAdminBadge />
                            <Link
                                href="/admin"
                                className="px-3 py-1 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm"
                            >
                                Admin Panel
                            </Link>
                        </div>
                    )}
                </div>

                {/* Center: Search */}
                <SearchManager />

                {/* Right: User Menu */}
                <div className="flex items-center gap-2">
                    <ThemeToggle />
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
