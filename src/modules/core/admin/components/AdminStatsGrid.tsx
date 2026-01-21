/**
 * Admin Stats Grid
 * 
 * Displays system-wide statistics.
 */

import { getAllWorkspaces } from '../actions/superAdminActions';
import { getSystemStats } from '../actions/systemStatsActions';

export async function AdminStatsGrid() {
    const [workspacesResult, statsResult] = await Promise.all([
        getAllWorkspaces(),
        getSystemStats(),
    ]);

    const workspaces = workspacesResult.success ? workspacesResult.data : [];
    const stats = statsResult.success ? statsResult.data : null;

    const totalWorkspaces = workspaces?.length || 0;
    const totalDocuments = workspaces?.reduce((sum, w) => sum + w.document_count, 0) || 0;
    const totalMembers = workspaces?.reduce((sum, w) => sum + w.member_count, 0) || 0;

    const statItems = [
        {
            label: 'Total Workspaces',
            value: totalWorkspaces,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
            color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
        },
        {
            label: 'Total Documents',
            value: totalDocuments,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            color: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
        },
        {
            label: 'Total Users',
            value: totalMembers,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
        },
        {
            label: 'Active Today',
            value: stats?.activeToday || 0,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statItems.map((stat) => (
                <div
                    key={stat.label}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${stat.color}`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stat.value.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {stat.label}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
