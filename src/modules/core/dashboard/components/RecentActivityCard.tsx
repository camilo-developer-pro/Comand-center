/**
 * Recent Activity Card Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

import { formatDistanceToNow } from 'date-fns';
import { ActivityItem } from '../types';
import Link from 'next/link';

interface RecentActivityCardProps {
    activity: ActivityItem[];
}

export function RecentActivityCard({ activity }: RecentActivityCardProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            </div>
            <div className="flex-1 p-6">
                {activity.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No recent activity recorded.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {activity.map((item) => (
                            <div key={item.id} className="flex gap-4">
                                <div className="mt-1">
                                    {item.type === 'document_create' ? (
                                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <span className="text-xs">✨</span>
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <span className="text-xs">📝</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {item.userName === 'You' ? 'You' : item.userName}
                                        </span>
                                        {' '}
                                        {item.type === 'document_create' ? 'created' : 'edited'}
                                        {' '}
                                        <Link
                                            href={`/documents/${item.documentId}`}
                                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            {item.documentTitle}
                                        </Link>
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
