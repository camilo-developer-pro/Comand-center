/**
 * Stats Grid Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

import { DashboardStats } from '../types';

interface StatsGridProps {
    stats: DashboardStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
    const items = [
        {
            label: 'Documents',
            value: stats.totalDocuments,
            icon: '📄',
            color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        },
        {
            label: 'This Week',
            value: stats.documentsThisWeek,
            icon: '📈',
            prefix: '+',
            color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        },
        {
            label: 'Widgets',
            value: stats.totalWidgets,
            icon: '🧩',
            color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        },
        {
            label: 'Members',
            value: stats.memberCount,
            icon: '👥',
            color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-2 rounded-lg ${item.color} text-xl`}>
                            {item.icon}
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            {item.prefix}{item.value}
                        </p>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                            {item.label}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
