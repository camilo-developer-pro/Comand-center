'use client';

/**
 * Document List Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 * 
 * List container for documents with loading and empty states.
 */

import { DocumentListItem } from './DocumentListItem';
import type { Document } from '../types';
import { DocumentsEmptyState } from '@/components/ui/empty-states';

interface DocumentListProps {
    documents: Document[];
    activeDocumentId?: string;
    isLoading?: boolean;
}

export function DocumentList({ documents, activeDocumentId, isLoading }: DocumentListProps) {
    // Loading skeleton
    if (isLoading) {
        return (
            <div className="space-y-1">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg animate-pulse"
                    >
                        <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Empty state
    if (documents.length === 0) {
        return <DocumentsEmptyState />;
    }

    // Document list
    return (
        <div className="space-y-1">
            {documents.map((document) => (
                <DocumentListItem
                    key={document.id}
                    document={document}
                    isActive={activeDocumentId === document.id}
                />
            ))}
        </div>
    );
}
