'use client';

import { memo } from 'react';
import type { UserPresence } from '@/lib/realtime/presence-types';

interface RemoteCursorProps {
    user: UserPresence;
}

// Generate consistent color from user ID
function getUserColor(userId: string): string {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
        '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

export const RemoteCursor = memo(function RemoteCursor({ user }: RemoteCursorProps) {
    if (!user.cursor_position?.anchor_rect) return null;

    const { top, left, height } = user.cursor_position.anchor_rect;
    const color = getUserColor(user.id);

    return (
        <div
            className="pointer-events-none absolute z-50 transition-all duration-75"
            style={{
                top: `${top}px`,
                left: `${left}px`,
                height: `${height}px`
            }}
        >
            {/* Cursor line */}
            <div
                className="w-0.5 h-full animate-pulse"
                style={{ backgroundColor: color }}
            />

            {/* User name flag */}
            <div
                className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-xs text-white whitespace-nowrap shadow-sm"
                style={{ backgroundColor: color }}
            >
                {user.full_name || user.email.split('@')[0]}
            </div>
        </div>
    );
});
