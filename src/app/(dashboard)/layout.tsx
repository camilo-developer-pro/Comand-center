import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/modules/core/auth/components/LogoutButton';

interface DashboardLayoutProps {
    children: ReactNode;
}

/**
 * Dashboard Layout - Protected route wrapper.
 * Validates authentication before rendering children.
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar placeholder - implement in Phase 3 */}
            <nav className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-8">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">CC</span>
                    </div>
                    <span className="font-semibold text-gray-900">Command Center</span>
                </div>
                <div className="space-y-1 flex-1">
                    <a
                        href="/documents"
                        className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                    >
                        Documents
                    </a>
                    <a
                        href="/settings"
                        className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                    >
                        Settings
                    </a>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-200">
                    <LogoutButton />
                </div>
            </nav>

            {/* Main content area */}
            <main className="ml-64 min-h-screen">
                {children}
            </main>
        </div>
    );
}
