'use client';

/**
 * Document List Item Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 * 
 * Individual document item in the sidebar list.
 */

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { Document } from '../types';

interface DocumentListItemProps {
    document: Document;
    isActive: boolean;
    onClick?: () => void;
}

export function DocumentListItem({ document, isActive, onClick }: DocumentListItemProps) {
    const relativeTime = formatDistanceToNow(new Date(document.updated_at), { addSuffix: true });

    return (
        <Link
            href={`/documents/${document.id}`}
            onClick={onClick}
            className={`
                flex items-center gap-3 px-3 py-2 rounded-lg
                transition-colors duration-150
                ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
            `}
        >
            {/* Document Icon */}
            <span className="text-lg flex-shrink-0">📄</span>

            {/* Document Info */}
            <div className="flex-1 min-w-0">
                <p className={`
                    text-sm font-medium truncate
                    ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}
                `}>
                    {document.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {relativeTime}
                </p>
            </div>
        </Link>
    );
}
