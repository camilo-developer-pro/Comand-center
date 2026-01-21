/**
 * Admin Layout
 * 
 * Protects all /admin/* routes - only super admins can access.
 * Redirects unauthorized users to dashboard.
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/modules/core/auth/actions/authActions';
import { AdminSidebar } from '@/modules/core/admin/components/AdminSidebar';

export const metadata = {
    title: 'Admin Dashboard - Command Center',
};

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
    const userData = await getCurrentUser();

    // Redirect if not super admin
    if (!userData?.isSuperAdmin) {
        redirect('/documents');
    }

    return (
        <div className="flex h-[calc(100vh-3.5rem)]">
            {/* Admin Sidebar */}
            <AdminSidebar />

            {/* Admin Content */}
            <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 px-4 py-8 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
