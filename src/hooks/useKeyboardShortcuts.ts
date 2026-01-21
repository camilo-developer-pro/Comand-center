'use client';

import { useEffect, useRef } from 'react';

type ShortcutHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
    key: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    handler: ShortcutHandler;
    preventDefault?: boolean;
    enabled?: boolean;
}

/**
 * Global keyboard shortcuts hook
 * V1.1 Phase 6: Optimistic UI & Polish
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
    const handlersRef = useRef(shortcuts);

    // Keep handlers ref updated
    useEffect(() => {
        handlersRef.current = shortcuts;
    }, [shortcuts]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Skip if user is typing in an input
            const target = event.target as HTMLElement;
            const isTyping =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            handlersRef.current.forEach((shortcut) => {
                // Check if shortcut is enabled
                if (shortcut.enabled === false) return;

                // Check key match (case-insensitive)
                if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) return;

                // Check modifier keys
                const needsCtrlOrMeta = shortcut.ctrl || shortcut.meta;
                const hasCtrlOrMeta = event.ctrlKey || event.metaKey;

                if (needsCtrlOrMeta && !hasCtrlOrMeta) return;
                if (shortcut.shift && !event.shiftKey) return;

                // Special case: Allow Cmd+S even when typing (save behavior)
                if (shortcut.key.toLowerCase() === 's' && hasCtrlOrMeta) {
                    if (shortcut.preventDefault !== false) {
                        event.preventDefault();
                    }
                    shortcut.handler(event);
                    return;
                }

                // Skip other shortcuts if typing
                if (isTyping && shortcut.key.toLowerCase() !== 'escape') return;

                if (shortcut.preventDefault !== false) {
                    event.preventDefault();
                }

                shortcut.handler(event);
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
}

/**
 * Single shortcut hook for simpler cases
 */
export function useKeyboardShortcut(
    key: string,
    handler: ShortcutHandler,
    options?: Omit<ShortcutConfig, 'key' | 'handler'>
) {
    useKeyboardShortcuts([{ key, handler, ...options }]);
}
