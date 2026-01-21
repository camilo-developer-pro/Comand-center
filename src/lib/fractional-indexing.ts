/**
 * Fractional Indexing Utilities for Command Center V2.1
 * Client-side helpers for drag-and-drop operations
 */

import { createClient } from '@/lib/supabase/client';

// Types
export interface Item {
    id: string;
    parent_id: string | null;
    name: string;
    path: string;
    rank_key: string;
    item_type: string; // Adjusted from 'type' to match schema
}

export interface MoveItemResult {
    success: boolean;
    item_id?: string;
    new_parent_id?: string | null;
    new_rank_key?: string;
    new_path?: string;
    descendants_updated?: number;
    error?: string;
    retry?: boolean;
}

export interface InsertItemResult {
    success: boolean;
    id?: string;
    path?: string;
    rank_key?: string;
    error?: string;
    retry?: boolean;
}

/**
 * Move an item to a new position (cross-folder or within folder)
 * O(1) operation using fractional indexing
 */
export async function moveItem(
    itemId: string,
    newParentId: string | null,
    prevSiblingId: string | null = null,
    nextSiblingId: string | null = null,
    retryCount = 0
): Promise<MoveItemResult> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('move_item_v2', {
        p_item_id: itemId,
        p_new_parent_id: newParentId,
        p_prev_sibling_id: prevSiblingId,
        p_next_sibling_id: nextSiblingId,
    });

    if (error) {
        console.error('Move item error:', error);
        return { success: false, error: error.message };
    }

    const result = data as MoveItemResult;

    // Handle collision with retry (max 3 attempts)
    if (result.retry && retryCount < 3) {
        console.warn('Rank key collision, retrying...', retryCount + 1);
        return moveItem(itemId, newParentId, prevSiblingId, nextSiblingId, retryCount + 1);
    }

    return result;
}

/**
 * Reorder an item within its current folder
 * Convenience wrapper for moveItem
 */
export async function reorderItem(
    itemId: string,
    prevSiblingId: string | null = null,
    nextSiblingId: string | null = null
): Promise<MoveItemResult> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('reorder_item', {
        p_item_id: itemId,
        p_prev_sibling_id: prevSiblingId,
        p_next_sibling_id: nextSiblingId,
    });

    if (error) {
        console.error('Reorder item error:', error);
        return { success: false, error: error.message };
    }

    return data as MoveItemResult;
}

/**
 * Insert a new item at a specific position
 */
export async function insertItemAtPosition(
    workspaceId: string,
    parentId: string | null,
    name: string,
    type: string = 'document',
    prevSiblingId: string | null = null,
    nextSiblingId: string | null = null,
    retryCount = 0
): Promise<InsertItemResult> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('insert_item_at_position', {
        p_workspace_id: workspaceId,
        p_parent_id: parentId,
        p_name: name,
        p_item_type: type, // Adjusted from p_type to p_item_type to match RPC
        p_prev_sibling_id: prevSiblingId,
        p_next_sibling_id: nextSiblingId,
    });

    if (error) {
        console.error('Insert item error:', error);
        return { success: false, error: error.message };
    }

    const result = data as InsertItemResult;

    if (result.retry && retryCount < 3) {
        console.warn('Insert collision, retrying...', retryCount + 1);
        return insertItemAtPosition(
            workspaceId, parentId, name, type,
            prevSiblingId, nextSiblingId, retryCount + 1
        );
    }

    return result;
}

/**
 * Get siblings between two items for drag-and-drop
 * Returns the prev and next sibling IDs for a drop position
 */
export function getDropSiblings(
    items: Item[],
    dropIndex: number
): { prevId: string | null; nextId: string | null } {
    // Sort by rank_key to ensure correct order
    const sorted = [...items].sort((a, b) =>
        a.rank_key.localeCompare(b.rank_key, undefined, { sensitivity: 'base' })
    );

    return {
        prevId: dropIndex > 0 ? sorted[dropIndex - 1].id : null,
        nextId: dropIndex < sorted.length ? sorted[dropIndex].id : null,
    };
}
