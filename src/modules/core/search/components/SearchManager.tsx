'use client';

/**
 * Search Manager Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 * 
 * Handles the state and keyboard shortcuts for the search system.
 * Integrated into the Header.
 */

import { useState, useEffect } from 'react';
import { SearchTrigger } from './SearchTrigger';
import { SearchCommand } from './SearchCommand';

export function SearchManager() {
    const [isOpen, setIsOpen] = useState(false);

    // Keyboard shortcut (Cmd+K / Ctrl+K)
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    return (
        <>
            <div className="flex-1 max-w-md mx-4 hidden md:block">
                <SearchTrigger onClick={() => setIsOpen(true)} />
            </div>
            <SearchCommand isOpen={isOpen} onOpenChange={setIsOpen} />
        </>
    );
}
