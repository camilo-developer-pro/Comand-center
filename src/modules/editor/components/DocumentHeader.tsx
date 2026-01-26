'use client';

import { memo, useState, useCallback } from 'react';
import { PresenceAvatarStack } from './PresenceAvatarStack';
import { TypingIndicator } from './TypingIndicator';
import type { UserPresence } from '@/lib/realtime/presence-types';
import { cn } from '@/lib/utils/cn';

interface DocumentHeaderProps {
    documentId: string;
    initialTitle: string;
    onTitleChange?: (title: string) => void;
    otherUsers?: UserPresence[];
    lastSaved?: Date | null;
    isSaving?: boolean;
}

export const DocumentHeader = memo(function DocumentHeader({
    documentId,
    initialTitle,
    onTitleChange,
    otherUsers = [],
    lastSaved,
    isSaving
}: DocumentHeaderProps) {
    const [title, setTitle] = useState(initialTitle);
    
    const handleBlur = useCallback(() => {
        if (title !== initialTitle && onTitleChange) {
            onTitleChange(title);
        }
    }, [title, initialTitle, onTitleChange]);
    
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
    }, []);
    
    return (
        <div className="sticky top-0 z-40 bg-background border-b">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                    <input
                        type="text"
                        value={title}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={cn(
                            'text-xl font-semibold bg-transparent border-none outline-none w-full truncate focus:ring-0',
                            'placeholder:text-muted-foreground/50'
                        )}
                        placeholder="Untitled"
                    />
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {isSaving ? (
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                                Saving...
                            </span>
                        ) : lastSaved ? (
                            <span>Saved {formatRelativeTime(lastSaved)}</span>
                        ) : null}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <PresenceAvatarStack users={otherUsers} maxVisible={4} size="md" />
                </div>
            </div>

            <TypingIndicator users={otherUsers} />
        </div>
    );
});

function formatRelativeTime(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
}
