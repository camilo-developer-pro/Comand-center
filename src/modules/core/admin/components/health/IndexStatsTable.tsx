'use client';

/**
 * Index Statistics Table
 * 
 * Shows index usage and identifies unused indexes.
 */

import type { IndexStats } from '../../types/health';

interface Props {
    indexes: IndexStats[];
    isLoading: boolean;
}

const usageColors = {
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
    LOW_USAGE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
    UNUSED: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
};

export function IndexStatsTable({ indexes, isLoading }: Props) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                    Index Statistics
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {indexes.filter(i => i.usage_status === 'UNUSED').length} unused
                </span>
            </div>

            <div className="overflow-x-auto max-h-80">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Index
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Scans
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Size
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i}>
                                    <td colSpan={4} className="px-4 py-3">
                                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                    </td>
                                </tr>
                            ))
                        ) : indexes.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                    No index data available
                                </td>
                            </tr>
                        ) : (
                            indexes.slice(0, 15).map((index) => (
                                <tr key={index.index_name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <div>
                                            <code className="text-sm text-gray-900 dark:text-white">
                                                {index.index_name}
                                            </code>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {index.table_name}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                                        {index.index_scans?.toLocaleString() || '0'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                                        {index.index_size}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${usageColors[index.usage_status]}`}>
                                            {index.usage_status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
