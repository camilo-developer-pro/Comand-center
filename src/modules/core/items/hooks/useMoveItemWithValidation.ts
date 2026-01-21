'use client';

/**
 * useMoveItemWithValidation Hook
 * 
 * V2.0 Phase 1: Hierarchical File System
 * 
 * Composite hook that performs client-side validation before invoking 
 * the moveItem mutation. Provides user notifications via sonner.
 */

import { useCallback } from 'react';
import { useMoveItem, useItemTree } from './useItems';
import { validateMove } from '../utils/validateMove';
import { toast } from 'sonner';

/**
 * Hook to move items with pre-flight validation and notifications
 */
export function useMoveItemWithValidation(workspaceId: string) {
    const { data: tree } = useItemTree(workspaceId);
    const moveItem = useMoveItem(workspaceId);

    const moveWithValidation = useCallback(async (
        itemId: string,
        newParentId: string | null
    ) => {
        // 1. Perform client-side validation
        const validation = validateMove(itemId, newParentId, tree ?? []);

        if (!validation.valid) {
            toast.error(validation.error || 'Invalid move operation');
            return { success: false, error: validation.error };
        }

        // 2. Execute the mutation
        try {
            const result = await moveItem.mutateAsync({
                itemId,
                newParentId
            });

            if (!result.success) {
                toast.error(result.error || 'Failed to move item');
                return { success: false, error: result.error };
            }

            toast.success(`Moved "${result.data.item_name}" to ${newParentId ? 'folder' : 'root'}`);
            return { success: true, data: result.data };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unexpected error occurred during the move';
            console.error('[useMoveItemWithValidation] Error:', error);
            toast.error(message);
            return { success: false, error: message };
        }
    }, [tree, moveItem, workspaceId]);

    return {
        moveItem: moveWithValidation,
        isMoving: moveItem.isPending,
    };
}
