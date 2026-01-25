'use client';

import { memo } from 'react';
import type { UserPresence } from '@/lib/realtime/presence-types';

interface TypingIndicatorProps {
    users: UserPresence[];
}

export const TypingIndicator = memo(function TypingIndicator({ users }: TypingIndicatorProps) {
    const typingUsers = users.filter(u => u.is_typing);

    if (typingUsers.length === 0) return null;

    const names = typingUsers.map(u => u.full_name || u.email.split('@')[0]);

    let message: string;
    if (names.length === 1) {
        message = `${names[0]} is typing...`;
    } else if (names.length === 2) {
        message = `${names[0]} and ${names[1]} are typing...`;
    } else {
        message = `${names[0]} and ${names.length - 1} others are typing...`;
    }

    return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 border-t bg-background/50 backdrop-blur-sm">
            <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
            </div>
            <span>{message}</span>
        </div>
    );
});
