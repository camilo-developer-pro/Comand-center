'use client';

/**
 * Search Command Palette Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 * 
 * Uses 'cmdk' for command input logic and 'useDocumentSearch' for data.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, FileText, Loader2, X } from 'lucide-react';
import { useDocumentSearch } from '../hooks/useSearch';
import { SearchResultItem } from './SearchResultItem';

interface SearchCommandProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SearchCommand({ isOpen, onOpenChange }: SearchCommandProps) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounce query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const { data: searchResult, isLoading } = useDocumentSearch(debouncedQuery, {
        enabled: isOpen && debouncedQuery.length >= 2,
    });

    const results = searchResult?.success ? searchResult.data : [];

    // Keyboard shortcut (Cmd+K / Ctrl+K)
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onOpenChange(!isOpen);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [isOpen, onOpenChange]);

    // Handle selection
    const handleSelect = (id: string) => {
        onOpenChange(false);
        router.push(`/documents/${id}`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 sm:px-6 md:px-8 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={containerRef}
                className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in slide-in-from-top-4 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <Command className="flex flex-col h-full">
                    <div className="flex items-center px-4 border-b border-gray-100 dark:border-gray-700">
                        <Search className="w-5 h-5 text-gray-400 mr-2" />
                        <Command.Input
                            value={query}
                            onValueChange={setQuery}
                            placeholder="Search documents by title or content..."
                            className="flex-1 h-12 bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-0 text-sm"
                            autoFocus
                        />
                        {isLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin mr-2" />}
                        <button
                            onClick={() => onOpenChange(false)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                        <Command.Empty className="py-12 text-center">
                            {query.length < 2 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    Type at least 2 characters to search...
                                </p>
                            ) : isLoading ? (
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    Searching...
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-gray-900 dark:text-white font-medium">No results found</p>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                                        Try searching for another term
                                    </p>
                                </div>
                            )}
                        </Command.Empty>

                        {results.length > 0 && (
                            <div className="space-y-1">
                                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Documents
                                </div>
                                {results.map((result) => (
                                    <Command.Item
                                        key={result.id}
                                        value={result.title}
                                        onSelect={() => handleSelect(result.id)}
                                        className="aria-selected:bg-transparent" // Disable default aria-selected styling to use our custom item
                                    >
                                        <SearchResultItem
                                            result={result}
                                            onSelect={handleSelect}
                                        />
                                    </Command.Item>
                                ))}
                            </div>
                        )}
                    </Command.List>

                    <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 shadow-sm border border-gray-300 dark:border-gray-600 font-sans">
                                ↑↓
                            </kbd>
                            <span>Navigate</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 shadow-sm border border-gray-300 dark:border-gray-600 font-sans">
                                ↵
                            </kbd>
                            <span>Open</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 shadow-sm border border-gray-300 dark:border-gray-600 font-sans">
                                esc
                            </kbd>
                            <span>Close</span>
                        </div>
                    </div>
                </Command>
            </div>
            {/* Backdrop click to close */}
            <div className="absolute inset-0 -z-10" onClick={() => onOpenChange(false)} />
        </div>
    );
}
