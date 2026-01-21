/**
 * Search Result Item Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

import { formatDistanceToNow } from 'date-fns';
import { SearchResult } from '../types';

interface SearchResultItemProps {
    result: SearchResult;
    onSelect: (id: string) => void;
    isActive?: boolean;
}

export function SearchResultItem({ result, onSelect, isActive }: SearchResultItemProps) {
    return (
        <button
            onClick={() => onSelect(result.id)}
            className={`
                w-full text-left p-3 rounded-lg flex gap-3 transition-colors
                ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
            `}
        >
            <span className="text-xl flex-shrink-0">📄</span>
            <div className="flex-1 min-w-0">
                <div
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
                    dangerouslySetInnerHTML={{ __html: result.titleHighlight || result.title }}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Updated {formatDistanceToNow(new Date(result.updatedAt), { addSuffix: true })}
                </p>
            </div>
        </button>
    );
}
