'use client';

/**
 * Admin Audit Log Page
 * 
 * Full audit log with filtering and search.
 */

import { useQuery } from '@tanstack/react-query';
import { getAuditLog } from '@/modules/core/admin/actions/superAdminActions';
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';

const actionLabels: Record<string, string> = {
    VIEW_ALL_WORKSPACES: 'Viewed all workspaces',
    IMPERSONATE_WORKSPACE: 'Entered workspace',
    VIEW_AUDIT_LOG: 'Viewed audit log',
};

export default function AuditLogPage() {
    const { data: logs, isLoading } = useQuery({
        queryKey: ['admin', 'audit-log'],
        queryFn: async () => {
            const result = await getAuditLog(100);
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Audit Log
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Record of all super admin actions
                </p>
            </div>

            {/* Log Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Action
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Target
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Details
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Time
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                [...Array(10)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={4} className="px-6 py-4">
                                            <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : logs?.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No audit logs recorded yet
                                    </td>
                                </tr>
                            ) : (
                                logs?.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                                                {actionLabels[log.action] || log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                                            {log.target_table || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                            {log.details && Object.keys(log.details as object).length > 0 ? (
                                                <div className="max-w-xs overflow-hidden">
                                                    <code className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded block truncate">
                                                        {JSON.stringify(log.details)}
                                                    </code>
                                                </div>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">
                                            {formatRelativeTime(log.created_at)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
