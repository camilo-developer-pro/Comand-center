'use client';

/**
 * System Health Monitor Page
 * 
 * Real-time system health and performance monitoring.
 */

import { useState } from 'react';
import { useHealthDashboard } from '@/modules/core/admin/hooks/useHealthMonitor';
import {
    HealthSummaryCards,
    ConnectionsGauge,
    TableStatsTable,
    IndexStatsTable,
    ApiStatsChart,
    SlowRequestsTable
} from '@/modules/core/admin/components/health';
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';

export default function HealthMonitorPage() {
    const [autoRefresh, setAutoRefresh] = useState(true);

    const { data, isLoading, error, refetch, dataUpdatedAt } = useHealthDashboard({
        refetchInterval: autoRefresh ? 30000 : undefined,
    });

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
                        Error Loading Health Data
                    </h2>
                    <p className="text-red-600 dark:text-red-300 mt-2">{error.message}</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        System Health Monitor
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Real-time database and API performance metrics
                    </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4">
                    {/* Last Updated */}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Updated: {dataUpdatedAt ? formatRelativeTime(new Date(dataUpdatedAt)) : 'Never'}
                    </span>

                    {/* Auto Refresh Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Auto-refresh
                        </span>
                    </label>

                    {/* Manual Refresh */}
                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <svg
                            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Health Summary Cards */}
            <HealthSummaryCards
                summary={data?.summary || []}
                isLoading={isLoading}
            />

            {/* Connections & Overview Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Connections Gauge */}
                <div className="lg:col-span-1">
                    <ConnectionsGauge
                        connections={data?.connections}
                        isLoading={isLoading}
                    />
                </div>

                {/* API Stats Chart */}
                <div className="lg:col-span-2">
                    <ApiStatsChart
                        stats={data?.apiStats || []}
                        isLoading={isLoading}
                    />
                </div>
            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Table Stats */}
                <TableStatsTable
                    tables={data?.tables || []}
                    isLoading={isLoading}
                />

                {/* Index Stats */}
                <IndexStatsTable
                    indexes={data?.indexes || []}
                    isLoading={isLoading}
                />
            </div>

            {/* Slow Requests */}
            <SlowRequestsTable
                requests={data?.slowRequests || []}
                isLoading={isLoading}
            />
        </div>
    );
}
