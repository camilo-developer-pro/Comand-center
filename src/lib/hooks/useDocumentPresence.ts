'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { UserPresence, CursorPosition, DocumentPresenceState } from '@/lib/realtime/presence-types';

interface UseDocumentPresenceOptions {
    documentId: string;
    currentUser: {
        id: string;
        email: string;
        full_name: string;
        avatar_url: string | null;
    };
    onPresenceChange?: (presence: DocumentPresenceState) => void;
}

export function useDocumentPresence(options: UseDocumentPresenceOptions) {
    const { documentId, currentUser, onPresenceChange } = options;

    const [presence, setPresence] = useState<DocumentPresenceState>({});
    const [isConnected, setIsConnected] = useState(false);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Track own presence state
    const updatePresence = useCallback(async (payload: Partial<UserPresence>) => {
        if (!channelRef.current) return;

        await channelRef.current.track({
            ...currentUser,
            ...payload,
            last_active_at: Date.now()
        });
    }, [currentUser]);

    // Cursor position update
    const updateCursorPosition = useCallback((position: CursorPosition | null) => {
        updatePresence({ cursor_position: position });
    }, [updatePresence]);

    // Typing indicator with auto-clear after 2 seconds
    const setTyping = useCallback((isTyping: boolean) => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        updatePresence({ is_typing: isTyping });

        if (isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
                updatePresence({ is_typing: false });
            }, 2000);
        }
    }, [updatePresence]);

    useEffect(() => {
        const channelName = `presence:document:${documentId}`;

        const channel = supabase.channel(channelName, {
            config: {
                presence: {
                    key: currentUser.id
                }
            }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState<UserPresence>();
                const normalized: DocumentPresenceState = {};

                Object.entries(state).forEach(([key, presences]) => {
                    // Each key maps to an array; take the most recent
                    if (presences.length > 0) {
                        normalized[key] = presences[0];
                    }
                });

                setPresence(normalized);
                onPresenceChange?.(normalized);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                // console.log(`[Presence] User joined: ${key}`, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                // console.log(`[Presence] User left: ${key}`, leftPresences);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true);
                    // Track initial presence
                    await channel.track({
                        ...currentUser,
                        cursor_position: null,
                        is_typing: false,
                        last_active_at: Date.now()
                    });
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    setIsConnected(false);
                }
            });

        channelRef.current = channel;

        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [documentId, currentUser, supabase, onPresenceChange]);

    // Filter out current user from presence list
    const otherUsers = Object.entries(presence)
        .filter(([id]) => id !== currentUser.id)
        .map(([, user]) => user);

    return {
        presence,
        otherUsers,
        isConnected,
        updateCursorPosition,
        setTyping
    };
}
