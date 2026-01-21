'use client';

/**
 * Health Summary Cards
 * 
 * Displays key health metrics with status indicators.
 */

import type { HealthMetric, HealthStatus } from '../../types/health';

interface Props {
    summary: HealthMetric[];
    isLoading: boolean;
}

const statusColors: Record<HealthStatus, string> = {
    HEALTHY: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
    WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
    CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
    INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
    UNKNOWN: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
};

const statusIcons: Record<HealthStatus, string> = {
    HEALTHY: '✓',
    WARNING: '⚠',
    CRITICAL: '✕',
    INFO: 'ℹ',
    UNKNOWN: '?',
};

const metricLabels: Record<string, string> = {
    database_size: 'Database Size',
    connections: 'Connections',
    cache_hit_ratio: 'Cache Hit Ratio',
    rls_enabled: 'RLS Enabled',
};

const metricIcons: Record<string, React.ReactNode> = {
    database_size: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
    ),
    connections: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
    ),
    cache_hit_ratio: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
    ),
    rls_enabled: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    ),
};

export function HealthSummaryCards({ summary, isLoading }: Props) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                    >
                        <div className="animate-pulse space-y-3">
                            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-4 w-24 bg-gray-100 dark:bg-gray-600 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summary.map((metric) => {
                const status = metric.status as HealthStatus;

                return (
                    <div
                        key={metric.metric_name}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex items-start justify-between">
                            {/* Icon */}
                            <div className={`p-2 rounded-lg ${statusColors[status]}`}>
                                {metricIcons[metric.metric_name] || (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                )}
                            </div>

                            {/* Status Badge */}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>
                                {statusIcons[status]} {status}
                            </span>
                        </div>

                        {/* Value */}
                        <div className="mt-4">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {metric.metric_value}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {metricLabels[metric.metric_name] || metric.metric_name}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
