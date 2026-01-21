/**
 * Recent Audit Log
 * 
 * Shows recent admin actions.
 */

import { getAuditLog } from '../actions/superAdminActions';
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';
import Link from 'next/link';

const actionLabels: Record<string, string> = {
    VIEW_ALL_WORKSPACES: 'Viewed all workspaces',
    IMPERSONATE_WORKSPACE: 'Entered workspace',
    VIEW_AUDIT_LOG: 'Viewed audit log',
};

const actionIcons: Record<string, string> = {
    VIEW_ALL_WORKSPACES: '👁️',
    IMPERSONATE_WORKSPACE: '🔄',
    VIEW_AUDIT_LOG: '📋',
};

export async function RecentAuditLog() {
    const result = await getAuditLog(10);
    const logs = result.success ? result.data : [];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                    Recent Activity
                </h2>
                <Link
                    href="/admin/audit-log"
                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                >
                    View all
                </Link>
            </div>

            {/* Log List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
                {logs.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                        No activity recorded yet
                    </div>
                ) : (
                    logs.map((log) => (
                        <div
                            key={log.id}
                            className="px-6 py-3 flex items-start gap-3"
                        >
                            {/* Icon */}
                            <span className="text-lg">
                                {actionIcons[log.action] || '📌'}
                            </span>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 dark:text-white">
                                    {actionLabels[log.action] || log.action}
                                </p>
                                {(log.details as any)?.workspace_name && `Workspace: ${(log.details as any).workspace_name}`}
                                {(log.details as any)?.count && `Count: ${(log.details as any).count}`}
                            </div>

                            {/* Time */}
                            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                {formatRelativeTime(log.created_at)}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
