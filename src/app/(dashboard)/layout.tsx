/**
 * Dashboard Layout
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * Protected layout for authenticated users.
 */

import { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from 'sonner';

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
                {/* Sidebar */}
                <Sidebar />

                {/* Main Area */}
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>

            {/* Notifications */}
            <Toaster position="bottom-right" richColors />
        </div>
    );
}
