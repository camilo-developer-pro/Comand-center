/**
 * Admin Dashboard Overview
 * 
 * Main landing page for super admin panel.
 * Shows system-wide stats and quick actions.
 */

import { Suspense } from 'react';
import { AdminStatsGrid } from '@/modules/core/admin/components/AdminStatsGrid';
import { RecentWorkspaces } from '@/modules/core/admin/components/RecentWorkspaces';
import { RecentAuditLog } from '@/modules/core/admin/components/RecentAuditLog';
import { QuickActions } from '@/modules/core/admin/components/QuickActions';
import { AdminStatsGridSkeleton } from '@/modules/core/admin/components/skeletons';

export default function AdminDashboardPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Admin Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    System overview and management tools
                </p>
            </div>

            {/* Stats Grid */}
            <Suspense fallback={<AdminStatsGridSkeleton />}>
                <AdminStatsGrid />
            </Suspense>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Workspaces */}
                <Suspense fallback={<div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />}>
                    <RecentWorkspaces />
                </Suspense>

                {/* Recent Audit Log */}
                <Suspense fallback={<div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />}>
                    <RecentAuditLog />
                </Suspense>
            </div>

            {/* Quick Actions */}
            <QuickActions />
        </div>
    );
}
