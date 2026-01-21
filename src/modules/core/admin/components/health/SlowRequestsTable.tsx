'use client';

/**
 * Slow Requests Table
 * 
 * Shows API requests that exceeded the response time threshold.
 */

import type { ApiResponseLog } from '../../types/health';
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';

interface Props {
    requests: ApiResponseLog[];
    isLoading: boolean;
}

export function SlowRequestsTable({ requests, isLoading }: Props) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        Slow Requests ({'>'}1000ms)
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Last 24 hours
                    </p>
                </div>
                {requests.length > 0 && (
                    <span className="px-3 py-1 text-sm font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 rounded-full">
                        {requests.length} slow requests
                    </span>
                )}
            </div>

            {isLoading ? (
                <div className="p-6">
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            ) : requests.length === 0 ? (
                <div className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                        No slow requests in the last 24 hours
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        All API calls are performing well
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Endpoint
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Method
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Response Time
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    When
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {requests.map((req) => (
                                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4">
                                        <code className="text-sm text-gray-900 dark:text-white">
                                            {req.endpoint}
                                        </code>
                                        {req.error_message && (
                                            <p className="text-xs text-red-500 mt-1 truncate max-w-xs">
                                                {req.error_message}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 rounded">
                                            {req.method}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-mono text-sm ${req.response_time_ms > 2000
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-amber-600 dark:text-amber-400'
                                            }`}>
                                            {req.response_time_ms}ms
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${req.status_code >= 400
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                                                : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                                            }`}>
                                            {req.status_code}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-400">
                                        {formatRelativeTime(new Date(req.created_at || Date.now()))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
