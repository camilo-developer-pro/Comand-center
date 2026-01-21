'use client';

import { useState, createContext, useContext, useCallback } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { CommandPalette } from '@/components/layout/CommandPalette';

interface KeyboardShortcutsContextValue {
    openCommandPalette: () => void;
    closeCommandPalette: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export function useCommandPalette() {
    const context = useContext(KeyboardShortcutsContext);
    if (!context) throw new Error('useCommandPalette must be used within KeyboardShortcutsProvider');
    return context;
}

interface Props {
    children: React.ReactNode;
    onSave?: () => void;
}

/**
 * Keyboard Shortcuts Provider
 * V1.1 Phase 6: Optimistic UI & Polish
 */
export function KeyboardShortcutsProvider({ children, onSave }: Props) {
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

    const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
    const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);

    // Global shortcuts
    useKeyboardShortcuts([
        {
            key: 'k',
            meta: true,
            ctrl: true,
            handler: () => setIsCommandPaletteOpen(true),
        },
        {
            key: 's',
            meta: true,
            ctrl: true,
            handler: () => {
                if (onSave) onSave();
            },
        },
    ]);

    return (
        <KeyboardShortcutsContext.Provider value={{ openCommandPalette, closeCommandPalette }}>
            {children}
            <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} />
        </KeyboardShortcutsContext.Provider>
    );
}
