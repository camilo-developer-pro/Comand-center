'use client';

/**
 * Table Statistics Table
 * 
 * Shows database table sizes and row counts.
 */

import type { TableStats } from '../../types/health';

interface Props {
    tables: TableStats[];
    isLoading: boolean;
}

export function TableStatsTable({ tables, isLoading }: Props) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                    Table Statistics
                </h3>
            </div>

            <div className="overflow-x-auto max-h-80">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Table
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Rows
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Total Size
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Index Size
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
                        ) : tables.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                    No table data available
                                </td>
                            </tr>
                        ) : (
                            tables.map((table) => (
                                <tr key={table.table_name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <code className="text-sm text-purple-600 dark:text-purple-400">
                                            {table.table_name}
                                        </code>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                                        {table.row_count?.toLocaleString() || '0'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                                        {table.total_size}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                                        {table.index_size}
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
