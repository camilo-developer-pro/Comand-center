/**
 * Dashboard Home Page
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

import { Suspense } from 'react';
import {
    DashboardHeader,
    StatsGrid,
    WidgetUsageCard,
    RecentActivityCard,
    QuickActionsCard,
    getDashboardStats
} from '@/modules/core/dashboard';

export default async function DashboardPage() {
    const statsResult = await getDashboardStats();

    if (!statsResult.success) {
        return (
            <div className="p-6">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-red-700 dark:text-red-400">
                        Error loading dashboard: {statsResult.error}
                    </p>
                </div>
            </div>
        );
    }

    const stats = statsResult.data;

    return (
        <main className="space-y-6">
            <DashboardHeader />

            <Suspense fallback={<div className="h-32 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />}>
                <StatsGrid stats={stats} />
            </Suspense>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />}>
                    <WidgetUsageCard breakdown={stats.widgetBreakdown} />
                </Suspense>

                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />}>
                    <RecentActivityCard activity={stats.recentActivity} />
                </Suspense>
            </div>

            <QuickActionsCard />
        </main>
    );
}
