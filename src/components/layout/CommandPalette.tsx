'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDocumentSearch } from '@/modules/core/search/hooks/useSearch';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';
import { SearchEmptyState } from '@/components/ui/empty-states';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();

    // Search documents
    const { data: searchResults, isLoading } = useDocumentSearch(query, {
        enabled: isOpen && query.length >= 2,
    });

    // Reset state when closed
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Quick actions (static commands)
    const quickActions = useMemo(() => [
        { id: 'new-doc', label: 'Create New Document', icon: '📄', action: () => router.push('/documents/new') },
        { id: 'dashboard', label: 'Go to Dashboard', icon: '🏠', action: () => router.push('/') },
        { id: 'settings', label: 'Open Settings', icon: '⚙️', action: () => router.push('/settings') },
    ], [router]);

    // Combine results
    const results = useMemo(() => {
        const docs = searchResults?.success ? searchResults.data.map((doc: any) => ({
            id: doc.id,
            label: doc.title || 'Untitled',
            icon: '📝',
            action: () => router.push(`/documents/${doc.id}`),
        })) : [];

        return query.length >= 2 ? docs : quickActions;
    }, [query, searchResults, quickActions, router]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((i) => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (results[selectedIndex]) {
                    results[selectedIndex].action();
                    onClose();
                }
                break;
            case 'Escape':
                onClose();
                break;
        }
    }, [results, selectedIndex, onClose]);

    // Close shortcut
    useKeyboardShortcut('Escape', onClose, { enabled: isOpen });

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Palette */}
            <div className="fixed inset-x-4 top-[20%] mx-auto max-w-xl z-50 animate-in zoom-in-95 fade-in duration-200">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Search Input */}
                    <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-4 text-gray-900 dark:text-white">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelectedIndex(0);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Search documents or type a command..."
                            className="flex-1 px-3 py-4 bg-transparent outline-none placeholder-gray-400"
                            autoFocus
                        />
                        <kbd className="hidden sm:inline-flex px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded text-gray-500">
                            ESC
                        </kbd>
                    </div>

                    {/* Results */}
                    <div className="max-h-80 overflow-y-auto py-2">
                        {isLoading ? (
                            <div className="px-4 py-8 text-center text-gray-500">
                                Searching...
                            </div>
                        ) : results.length === 0 ? (
                            query.length >= 2 ? (
                                <SearchEmptyState query={query} />
                            ) : (
                                <div className="px-4 py-8 text-center text-gray-500">
                                    Start typing to search...
                                </div>
                            )
                        ) : (
                            results.map((result, index) => (
                                <button
                                    key={result.id}
                                    onClick={() => {
                                        result.action();
                                        onClose();
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={cn(
                                        'w-full px-4 py-2 flex items-center gap-3 text-left',
                                        'transition-colors duration-75',
                                        selectedIndex === index
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    )}
                                >
                                    <span className="text-lg">{result.icon}</span>
                                    <span className="flex-1 truncate">{result.label}</span>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd>
                            Navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd>
                            Select
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd>
                            Close
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}
