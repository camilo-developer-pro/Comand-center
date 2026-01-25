/**
 * Presence Types for Document Collaboration
 * Command Center V3.1 - Phase 6
 */

export interface CursorPosition {
    block_id: string;
    offset: number;
    // For rendering remote cursors
    anchor_rect: { top: number; left: number; height: number } | null;
}

export interface UserPresence {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    cursor_position: CursorPosition | null;
    is_typing: boolean;
    last_active_at: number;
}

export interface DocumentPresenceState {
    [user_id: string]: UserPresence;
}

export interface PresencePayload {
    type: 'cursor_move' | 'typing_start' | 'typing_stop' | 'heartbeat';
    data: Partial<UserPresence>;
}
