'use client';

/**
 * Search Trigger Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 * 
 * A button that looks like an input field to trigger the search command palette.
 */

import { Search } from 'lucide-react';

interface SearchTriggerProps {
    onClick: () => void;
}

export function SearchTrigger({ onClick }: SearchTriggerProps) {
    return (
        <button
            onClick={onClick}
            className={`
                group relative flex-1 max-w-md w-full items-center justify-between
                px-4 py-1.5 pl-10 text-sm border-none bg-gray-100 dark:bg-gray-700
                rounded-lg transition-all text-left
                hover:bg-gray-200 dark:hover:bg-gray-600
                focus:bg-white dark:focus:bg-gray-600
                focus:outline-none focus:ring-2 focus:ring-blue-500
            `}
        >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 transition-colors group-hover:text-gray-700 dark:group-hover:text-gray-300" />

            <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                Search documents...
            </span>

            <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-sans border border-gray-200 dark:border-gray-600 shadow-sm leading-none">
                    ⌘
                </kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-sans border border-gray-200 dark:border-gray-600 shadow-sm leading-none">
                    K
                </kbd>
            </div>
        </button>
    );
}
