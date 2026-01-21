'use client';

/**
 * Connections Gauge
 * 
 * Visual gauge showing database connection usage.
 */

import type { ConnectionStats } from '../../types/health';

interface Props {
    connections?: ConnectionStats;
    isLoading: boolean;
}

const statusColors = {
    healthy: {
        stroke: 'stroke-green-500',
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/50',
    },
    warning: {
        stroke: 'stroke-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-900/50',
    },
    critical: {
        stroke: 'stroke-red-500',
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/50',
    },
} as const;

export function ConnectionsGauge({ connections, isLoading }: Props) {
    if (isLoading || !connections) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 h-full">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-40 w-40 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
            </div>
        );
    }

    const percentage = connections.connection_percentage;
    const status = percentage > 80 ? 'critical' : percentage > 60 ? 'warning' : 'healthy';
    const colors = statusColors[status];

    // SVG gauge calculations
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 h-full">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Database Connections
            </h3>

            {/* Gauge */}
            <div className="flex justify-center">
                <div className="relative">
                    <svg className="w-40 h-40 transform -rotate-90">
                        {/* Background circle */}
                        <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            strokeWidth="12"
                            fill="none"
                            className="stroke-gray-200 dark:stroke-gray-700"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            strokeWidth="12"
                            fill="none"
                            strokeLinecap="round"
                            className={colors.stroke}
                            style={{
                                strokeDasharray: circumference,
                                strokeDashoffset,
                                transition: 'stroke-dashoffset 0.5s ease',
                            }}
                        />
                    </svg>

                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl font-bold ${colors.text}`}>
                            {percentage.toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            used
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {connections.active_connections}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                </div>
                <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {connections.idle_connections}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Idle</p>
                </div>
                <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {connections.max_connections}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Max</p>
                </div>
            </div>
        </div>
    );
}
