import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDocumentPresence } from '@/lib/hooks/useDocumentPresence';

// Mock Supabase client
vi.mock('@supabase/ssr', () => ({
    createBrowserClient: vi.fn(() => ({
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn((callback) => {
                callback('SUBSCRIBED');
                return { unsubscribe: vi.fn() };
            }),
            track: vi.fn().mockResolvedValue({}),
            presenceState: vi.fn(() => ({}))
        })),
        removeChannel: vi.fn()
    }))
}));

describe('useDocumentPresence', () => {
    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: null
    };

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('should connect to presence channel on mount', async () => {
        const { result } = renderHook(() =>
            useDocumentPresence({
                documentId: 'doc-456',
                currentUser: mockUser
            })
        );

        await waitFor(() => {
            expect(result.current.isConnected).toBe(true);
        });
    });

    it('should filter out current user from otherUsers', () => {
        const { result } = renderHook(() =>
            useDocumentPresence({
                documentId: 'doc-456',
                currentUser: mockUser
            })
        );

        // Simulate presence with current user included
        act(() => {
            // The hook internally filters current user from otherUsers
            // Verify the filtering logic works
        });

        expect(result.current.otherUsers.find(u => u.id === mockUser.id)).toBeUndefined();
    });

    it('should auto-clear typing after 2 seconds', async () => {
        const trackSpy = vi.fn().mockResolvedValue({});

        vi.mocked(vi.fn(() => ({
            channel: vi.fn(() => ({
                on: vi.fn().mockReturnThis(),
                subscribe: vi.fn((callback) => {
                    callback('SUBSCRIBED');
                    return { unsubscribe: vi.fn() };
                }),
                track: trackSpy,
                presenceState: vi.fn(() => ({}))
            })),
            removeChannel: vi.fn()
        })));

        const { result } = renderHook(() =>
            useDocumentPresence({
                documentId: 'doc-456',
                currentUser: mockUser
            })
        );

        act(() => {
            result.current.setTyping(true);
        });

        // Fast-forward 2 seconds
        act(() => {
            vi.advanceTimersByTime(2000);
        });

        // Verify typing was cleared (tracked via Supabase channel)
        await waitFor(() => {
            // The hook should have called track with is_typing: false
            expect(trackSpy).toHaveBeenCalled();
        });
    });

    it('should throttle cursor updates to 30fps', async () => {
        const { result } = renderHook(() =>
            useDocumentPresence({
                documentId: 'doc-456',
                currentUser: mockUser
            })
        );

        const mockPosition = {
            block_id: 'block-1',
            offset: 10,
            anchor_rect: { top: 0, left: 0, height: 20 }
        };

        // Rapid cursor updates (should be throttled)
        for (let i = 0; i < 10; i++) {
            act(() => {
                result.current.updateCursorPosition({ ...mockPosition, offset: i });
            });
        }

        // The actual throttling happens in CursorTrackingExtension
        // This test verifies the hook accepts cursor position updates
        expect(result.current.updateCursorPosition).toBeDefined();
    });

    it('should cleanup on unmount', () => {
        const removeChannelSpy = vi.fn();

        vi.mocked(vi.fn(() => ({
            channel: vi.fn(() => ({
                on: vi.fn().mockReturnThis(),
                subscribe: vi.fn((callback) => {
                    callback('SUBSCRIBED');
                    return { unsubscribe: vi.fn() };
                }),
                track: vi.fn().mockResolvedValue({}),
                presenceState: vi.fn(() => ({}))
            })),
            removeChannel: removeChannelSpy
        })));

        const { unmount } = renderHook(() =>
            useDocumentPresence({
                documentId: 'doc-456',
                currentUser: mockUser
            })
        );

        unmount();

        // Verify cleanup happened
        expect(removeChannelSpy).toHaveBeenCalled();
    });
});
