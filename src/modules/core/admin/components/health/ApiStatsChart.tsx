'use client';

/**
 * API Statistics Chart
 * 
 * Shows API endpoint performance metrics.
 */

import type { ApiResponseStats } from '../../types/health';

interface Props {
    stats: ApiResponseStats[];
    isLoading: boolean;
}

const statusColors = {
    HEALTHY: 'bg-green-500',
    WARNING: 'bg-amber-500',
    CRITICAL: 'bg-red-500',
};

export function ApiStatsChart({ stats, isLoading }: Props) {
    // Find max for scaling bars
    const maxRequests = Math.max(...stats.map(s => Number(s.total_requests)), 1);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 h-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                    API Performance (24h)
                </h3>
            </div>

            <div className="p-6">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="animate-pulse">
                                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                                <div className="h-8 bg-gray-100 dark:bg-gray-600 rounded" />
                            </div>
                        ))}
                    </div>
                ) : stats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p>No API data recorded yet</p>
                        <p className="text-sm mt-1">Start using the app to see metrics</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {stats.slice(0, 8).map((stat) => (
                            <div key={stat.endpoint}>
                                {/* Endpoint name and stats */}
                                <div className="flex items-center justify-between mb-1">
                                    <code className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                                        {stat.endpoint}
                                    </code>
                                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                        <span>{stat.total_requests} req</span>
                                        <span>{stat.avg_response_ms}ms avg</span>
                                        <span className={stat.error_rate > 5 ? 'text-red-500' : ''}>
                                            {stat.error_rate}% err
                                        </span>
                                    </div>
                                </div>

                                {/* Bar */}
                                <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                    <div
                                        className={`h-full ${statusColors[stat.status]} transition-all duration-500`}
                                        style={{ width: `${(Number(stat.total_requests) / maxRequests) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
