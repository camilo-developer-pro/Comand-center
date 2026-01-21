'use client';

/**
 * Sidebar Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 * 
 * Main sidebar navigation with document list.
 */

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { DocumentList } from '@/modules/core/documents/components/DocumentList';
import { useDocuments, useRecentDocuments, useDocumentCount } from '@/modules/core/documents/hooks/useDocuments';

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Extract document ID from pathname (e.g., /documents/[id])
    const activeDocumentId = pathname?.match(/\/documents\/([^/]+)/)?.[1];

    // Fetch data
    const { data: recentResult, isLoading: isLoadingRecent } = useRecentDocuments();
    const { data: allDocsResult, isLoading: isLoadingAll } = useDocuments({ isArchived: false });
    const { data: countData } = useDocumentCount();

    const recentDocuments = recentResult?.data || [];
    const allDocuments = allDocsResult?.data || [];
    const documentCount = countData?.count || 0;

    return (
        <aside className={`
            w-64 border-r border-gray-200 dark:border-gray-700 
            bg-white dark:bg-gray-800 
            flex flex-col
            ${isCollapsed ? 'hidden lg:flex' : 'flex'}
        `}>
            {/* Navigation */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-1">
                <Link
                    href="/"
                    className={`
                        flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                        ${pathname === '/'
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
                    `}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                </Link>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <Link
                    href="/documents/new"
                    className="
                        flex items-center justify-center gap-2 
                        w-full px-4 py-2 
                        text-sm font-medium text-white 
                        bg-blue-600 hover:bg-blue-700 
                        rounded-lg transition-colors
                    "
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    New Document
                </Link>
            </div>

            {/* Recent Documents */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Recent
                </h3>
                <DocumentList
                    documents={recentDocuments}
                    activeDocumentId={activeDocumentId}
                    isLoading={isLoadingRecent}
                />
            </div>

            {/* All Documents */}
            <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    All Documents
                </h3>
                <DocumentList
                    documents={allDocuments}
                    activeDocumentId={activeDocumentId}
                    isLoading={isLoadingAll}
                />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <Link
                        href="/settings"
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                        Settings
                    </Link>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {documentCount} {documentCount === 1 ? 'doc' : 'docs'}
                    </span>
                </div>
            </div>
        </aside>
    );
}
