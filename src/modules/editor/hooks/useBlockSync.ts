'use client';

/**
 * Optimistic Block Synchronization Hook
 * 
 * V3.1 Phase 5: Atomic Block Persistence with Optimistic UI
 * 
 * Provides TanStack Query cache management for instant reads,
 * optimistic updates before server confirmation, rollback on failure,
 * and debounced saves to prevent excessive server calls.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCallback, useRef, useState } from 'react';
import { syncBlocks, getDocumentBlocks } from '@/lib/actions/block-actions';
import type { BlockNode, BlockNodeWithDocumentId, BlockSyncPayload } from '../types/block.types';

// ============================================================
// Query Keys
// ============================================================

export const blockKeys = {
  all: ['blocks'] as const,
  lists: () => [...blockKeys.all, 'list'] as const,
  list: (documentId: string) => [...blockKeys.lists(), documentId] as const,
  details: () => [...blockKeys.all, 'detail'] as const,
  detail: (blockId: string) => [...blockKeys.details(), blockId] as const,
};

// ============================================================
// Query Hooks
// ============================================================

/**
 * Hook to fetch blocks for a document
 */
export function useDocumentBlocks(documentId: string | null) {
  return useQuery({
    queryKey: blockKeys.list(documentId || ''),
    queryFn: async () => {
      if (!documentId) {
        throw new Error('Document ID is required');
      }

      const result = await getDocumentBlocks(documentId);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    enabled: !!documentId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });
}

// ============================================================
// Mutation Hooks
// ============================================================

/**
 * Hook to synchronize blocks with optimistic updates
 */
export function useSyncBlocks() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mutation = useMutation({
    mutationFn: async (payload: BlockSyncPayload) => {
      const result = await syncBlocks(payload);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onMutate: async (payload) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: blockKeys.list(payload.documentId) });

      // Snapshot previous values
      const previousBlocks = queryClient.getQueryData<BlockNode[]>(blockKeys.list(payload.documentId));

      // Optimistically update the blocks
      if (previousBlocks) {
        // Remove deleted blocks
        const filteredBlocks = previousBlocks.filter(
          (block) => !payload.deletedBlockIds.includes(block.blockId)
        );

        // Update or add new blocks
        const updatedBlocks = [...filteredBlocks];
        payload.blocks.forEach((newBlock) => {
          const existingIndex = updatedBlocks.findIndex(
            (block) => block.blockId === newBlock.blockId
          );
          if (existingIndex >= 0) {
            updatedBlocks[existingIndex] = newBlock;
          } else {
            updatedBlocks.push(newBlock);
          }
        });

        // Sort by sortOrder
        updatedBlocks.sort((a, b) => a.sortOrder.localeCompare(b.sortOrder));

        queryClient.setQueryData(blockKeys.list(payload.documentId), updatedBlocks);
      }

      // Show optimistic toast
      toast.loading('Saving changes...', { id: `block-sync-${payload.documentId}` });

      return { previousBlocks, documentId: payload.documentId };
    },
    onSuccess: (data, payload) => {
      // Update toast to success
      toast.success('Changes saved', {
        id: `block-sync-${payload.documentId}`,
        description: `${data.upserted} blocks updated, ${data.deleted} blocks deleted`,
      });
    },
    onError: (error, payload, context) => {
      // Rollback on error
      if (context?.previousBlocks) {
        queryClient.setQueryData(
          blockKeys.list(payload.documentId),
          context.previousBlocks
        );
      }

      // Update toast to error
      toast.error('Failed to save changes', {
        id: `block-sync-${payload.documentId}`,
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
    onSettled: (data, error, payload) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: blockKeys.list(payload.documentId) });
    },
  });

  /**
   * Debounced sync function
   */
  const debouncedSync = useCallback(
    (payload: BlockSyncPayload, debounceMs: number = 1000) => {
      setIsSyncing(true);

      // Clear any existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Set new timeout
      syncTimeoutRef.current = setTimeout(() => {
        mutation.mutate(payload, {
          onSettled: () => {
            setIsSyncing(false);
          },
        });
      }, debounceMs);
    },
    [mutation]
  );

  /**
   * Cancel pending sync
   */
  const cancelPendingSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
      setIsSyncing(false);
    }
  }, []);

  /**
   * Immediate sync (no debounce)
   */
  const syncImmediately = useCallback(
    (payload: BlockSyncPayload) => {
      cancelPendingSync();
      setIsSyncing(true);
      mutation.mutate(payload, {
        onSettled: () => {
          setIsSyncing(false);
        },
      });
    },
    [mutation, cancelPendingSync]
  );

  return {
    ...mutation,
    debouncedSync,
    cancelPendingSync,
    syncImmediately,
    isSyncing,
  };
}

// ============================================================
// Main Hook
// ============================================================

export interface UseBlockSyncOptions {
  documentId: string;
  debounceMs?: number;
}

export function useBlockSync({ documentId, debounceMs = 1000 }: UseBlockSyncOptions) {
  const {
    data: blocks,
    isLoading,
    error,
    refetch,
  } = useDocumentBlocks(documentId);

  const {
    debouncedSync,
    syncImmediately,
    cancelPendingSync,
    isSyncing,
    isPending,
    isError,
    isSuccess,
  } = useSyncBlocks();

  const sync = useCallback(
    (blocks: BlockNode[], deletedBlockIds: string[] = []) => {
      // Add documentId to each block for the sync payload
      const blocksWithDocumentId: BlockNodeWithDocumentId[] = blocks.map(block => ({
        ...block,
        documentId,
      }));
      const payload: BlockSyncPayload = {
        documentId,
        blocks: blocksWithDocumentId,
        deletedBlockIds,
      };
      debouncedSync(payload, debounceMs);
    },
    [documentId, debouncedSync, debounceMs]
  );

  const syncNow = useCallback(
    (blocks: BlockNode[], deletedBlockIds: string[] = []) => {
      // Add documentId to each block for the sync payload
      const blocksWithDocumentId: BlockNodeWithDocumentId[] = blocks.map(block => ({
        ...block,
        documentId,
      }));
      const payload: BlockSyncPayload = {
        documentId,
        blocks: blocksWithDocumentId,
        deletedBlockIds,
      };
      syncImmediately(payload);
    },
    [documentId, syncImmediately]
  );

  return {
    // Query state
    blocks: blocks || [],
    isLoading,
    error,
    refetch,

    // Sync state
    sync,
    syncNow,
    cancelPendingSync,
    isSyncing: isSyncing || isPending,
    isError,
    isSuccess,

    // Status
    status: isSyncing || isPending ? 'syncing' : isError ? 'error' : isSuccess ? 'success' : 'idle',
  };
}

export type UseBlockSyncResult = ReturnType<typeof useBlockSync>;
