'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import type { UserPresence } from '@/lib/realtime/presence-types';
import { cn } from '@/lib/utils';

interface PresenceAvatarStackProps {
    users: UserPresence[];
    maxVisible?: number;
    size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
};

const offsetClasses = {
    sm: '-ml-2',
    md: '-ml-2.5',
    lg: '-ml-3'
};

function getInitials(name: string, email: string): string {
    if (name) {
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
}

function getUserColor(userId: string): string {
    const colors = [
        'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
        'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

const Avatar = memo(function Avatar({
    user,
    size,
    isFirst
}: {
    user: UserPresence;
    size: 'sm' | 'md' | 'lg';
    isFirst: boolean;
}) {
    const [imgError, setImgError] = useState(false);

    return (
        <div
            className={cn(
                'relative rounded-full ring-2 ring-background flex items-center justify-center',
                sizeClasses[size],
                !isFirst && offsetClasses[size]
            )}
        >
            {user.avatar_url && !imgError ? (
                <Image
                    src={user.avatar_url}
                    alt={user.full_name || user.email}
                    fill
                    className="rounded-full object-cover"
                    onError={() => setImgError(true)}
                />
            ) : (
                <div className={cn(
                    'w-full h-full rounded-full flex items-center justify-center text-white font-medium',
                    getUserColor(user.id)
                )}>
                    {getInitials(user.full_name, user.email)}
                </div>
            )}

            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full ring-2 ring-background" />
        </div>
    );
});

export const PresenceAvatarStack = memo(function PresenceAvatarStack({
    users,
    maxVisible = 3,
    size = 'md'
}: PresenceAvatarStackProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    if (users.length === 0) return null;

    const visibleUsers = users.slice(0, maxVisible);
    const overflowCount = users.length - maxVisible;

    return (
        <div
            className="relative flex items-center"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className="flex">
                {visibleUsers.map((user, index) => (
                    <Avatar
                        key={user.id}
                        user={user}
                        size={size}
                        isFirst={index === 0}
                    />
                ))}

                {overflowCount > 0 && (
                    <div
                        className={cn(
                            'rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-muted-foreground font-medium',
                            sizeClasses[size],
                            offsetClasses[size]
                        )}
                    >
                        +{overflowCount}
                    </div>
                )}
            </div>

            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-popover border rounded-lg shadow-lg p-2 min-w-[200px]">
                    <p className="text-xs text-muted-foreground mb-2 px-2">
                        {users.length} {users.length === 1 ? 'person' : 'people'} viewing
                    </p>
                    <ul className="space-y-1">
                        {users.map(user => (
                            <li
                                key={user.id}
                                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted"
                            >
                                <div className={cn(
                                    'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs',
                                    getUserColor(user.id)
                                )}>
                                    {user.avatar_url ? (
                                        <Image
                                            src={user.avatar_url}
                                            alt=""
                                            width={24}
                                            height={24}
                                            className="rounded-full"
                                        />
                                    ) : (
                                        getInitials(user.full_name, user.email)
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {user.full_name || user.email.split('@')[0]}
                                    </p>
                                    {user.is_typing && (
                                        <p className="text-xs text-muted-foreground">Typing...</p>
                                    )}
                                </div>
                                <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
});
