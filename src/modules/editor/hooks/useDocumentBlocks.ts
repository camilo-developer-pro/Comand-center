'use client';

/**
 * TanStack Query Hooks for Document Blocks
 * 
 * V3.2 Phase 2: Atomic Editor & Layout
 * 
 * Provides type-safe data fetching and optimistic mutations for block operations.
 * Includes proper snake_case to camelCase data transformation and fractional indexing
 * for optimistic UI when creating sibling blocks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCallback } from 'react';
import { getDocumentBlocks, createSiblingBlock } from '@/lib/actions/block-actions';
import { generateKeyBetween } from '@/lib/utils/fractional-index';
import type { ActionResult } from '@/lib/actions/types';

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
// Type Definitions
// ============================================================

/**
 * Block interface matching the database schema with camelCase properties
 * Transformed from snake_case database fields
 */
export interface Block {
  id: string;
  workspaceId: string;
  userId: string;
  parentId: string | null;
  path: string;
  type: string;
  sortOrder: string;
  content: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  embedding?: number[];
}

/**
 * Input for creating a sibling block
 */
export interface CreateSiblingBlockInput {
  documentId: string;
  previousBlockId: string;
  nextBlockId: string | null;
  type: 'paragraph' | 'heading' | 'bulletList' | 'numberedList' | 'taskItem' | 'codeBlock';
  content?: Record<string, unknown>;
}

/**
 * Response from createSiblingBlock
 */
export interface CreateSiblingBlockResponse {
  id: string;
  sortOrder: string;
}

// ============================================================
// Data Transformation Utilities
// ============================================================

/**
 * Transform snake_case database object to camelCase Block interface
 */
function transformBlockFromDb(dbBlock: any): Block {
  return {
    id: dbBlock.id,
    workspaceId: dbBlock.workspace_id,
    userId: dbBlock.user_id,
    parentId: dbBlock.parent_id,
    path: dbBlock.path,
    type: dbBlock.type,
    sortOrder: dbBlock.sort_order,
    content: typeof dbBlock.content === 'string' 
      ? JSON.parse(dbBlock.content) 
      : dbBlock.content,
    createdAt: dbBlock.created_at,
    updatedAt: dbBlock.updated_at,
    embedding: dbBlock.embedding,
  };
}

/**
 * Transform camelCase Block to snake_case for database operations
 */
function transformBlockToDb(block: Partial<Block>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  if (block.id !== undefined) result.id = block.id;
  if (block.workspaceId !== undefined) result.workspace_id = block.workspaceId;
  if (block.userId !== undefined) result.user_id = block.userId;
  if (block.parentId !== undefined) result.parent_id = block.parentId;
  if (block.path !== undefined) result.path = block.path;
  if (block.type !== undefined) result.type = block.type;
  if (block.sortOrder !== undefined) result.sort_order = block.sortOrder;
  if (block.content !== undefined) result.content = JSON.stringify(block.content);
  if (block.createdAt !== undefined) result.created_at = block.createdAt;
  if (block.updatedAt !== undefined) result.updated_at = block.updatedAt;
  if (block.embedding !== undefined) result.embedding = block.embedding;
  
  return result;
}

// ============================================================
// Query Hooks
// ============================================================

/**
 * Hook to fetch blocks for a document with proper data transformation
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

      // Transform database blocks to camelCase interface
      return (result.data as any[]).map(transformBlockFromDb);
    },
    enabled: !!documentId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    select: (data) => {
      // Sort by sortOrder for consistent ordering
      return [...data].sort((a, b) => a.sortOrder.localeCompare(b.sortOrder));
    },
  });
}

// ============================================================
// Mutation Hooks
// ============================================================

/**
 * Hook to create a sibling block with optimistic UI
 */
export function useCreateSiblingBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSiblingBlockInput) => {
      // Ensure content has a default value as expected by the server action
      const payload = {
        ...input,
        content: input.content || { type: 'doc', content: [] },
      };
      
      const result = await createSiblingBlock(payload);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onMutate: async (input) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: blockKeys.list(input.documentId) });

      // Snapshot previous values
      const previousBlocks = queryClient.getQueryData<Block[]>(blockKeys.list(input.documentId));

      // Generate optimistic sort order using fractional indexing
      let optimisticSortOrder: string;
      
      if (previousBlocks) {
        // Find the previous and next blocks in the sorted list
        const prevBlock = previousBlocks.find(block => block.id === input.previousBlockId);
        const nextBlock = input.nextBlockId 
          ? previousBlocks.find(block => block.id === input.nextBlockId)
          : null;
        
        // Get sort orders for fractional indexing
        const prevSortOrder = prevBlock?.sortOrder || null;
        const nextSortOrder = nextBlock?.sortOrder || null;
        
        // Generate optimistic sort order
        optimisticSortOrder = generateKeyBetween(prevSortOrder, nextSortOrder);
      } else {
        // Default sort order if no blocks exist
        optimisticSortOrder = 'a0';
      }

      // Create optimistic block
      const optimisticBlock: Block = {
        id: `optimistic-${Date.now()}`,
        workspaceId: input.documentId,
        userId: 'optimistic-user', // Will be replaced by actual user ID from server
        parentId: null,
        path: '.',
        type: input.type === 'paragraph' ? 'text' : 
              input.type === 'taskItem' ? 'task' :
              input.type === 'codeBlock' ? 'code' : 
              input.type === 'heading' ? 'heading' : 'text',
        sortOrder: optimisticSortOrder,
        content: input.content || { type: 'doc', content: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistically update the blocks list
      if (previousBlocks) {
        const updatedBlocks = [...previousBlocks, optimisticBlock]
          .sort((a, b) => a.sortOrder.localeCompare(b.sortOrder));
        
        queryClient.setQueryData(blockKeys.list(input.documentId), updatedBlocks);
      }

      // Show optimistic toast
      toast.loading('Creating new block...', { id: `create-sibling-${input.documentId}` });

      return { 
        previousBlocks, 
        documentId: input.documentId,
        optimisticBlockId: optimisticBlock.id,
        optimisticSortOrder 
      };
    },
    onSuccess: (data, input, context) => {
      if (!context) return;

      // Update the optimistic block with real data
      const previousBlocks = queryClient.getQueryData<Block[]>(blockKeys.list(input.documentId));
      
      if (previousBlocks) {
        const updatedBlocks = previousBlocks.map(block => 
          block.id === context.optimisticBlockId
            ? {
                ...block,
                id: data.id,
                sortOrder: data.sortOrder,
                // Keep other optimistic values for now
              }
            : block
        );
        
        queryClient.setQueryData(blockKeys.list(input.documentId), updatedBlocks);
      }

      // Update toast to success
      toast.success('Block created', {
        id: `create-sibling-${input.documentId}`,
        description: 'New block added successfully',
      });
    },
    onError: (error, input, context) => {
      // Rollback on error
      if (context?.previousBlocks) {
        queryClient.setQueryData(
          blockKeys.list(input.documentId),
          context.previousBlocks
        );
      }

      // Update toast to error
      toast.error('Failed to create block', {
        id: `create-sibling-${input.documentId}`,
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
    onSettled: (data, error, input) => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: blockKeys.list(input.documentId) });
    },
  });
}

// ============================================================
// Combined Hook
// ============================================================

/**
 * Combined hook for document blocks operations
 */
export function useDocumentBlocksOperations(documentId: string | null) {
  const blocksQuery = useDocumentBlocks(documentId);
  const createSiblingBlockMutation = useCreateSiblingBlock();

  const createSiblingBlock = useCallback(
    (input: Omit<CreateSiblingBlockInput, 'documentId'>) => {
      if (!documentId) {
        throw new Error('Document ID is required');
      }
      
      return createSiblingBlockMutation.mutate({
        ...input,
        documentId,
      });
    },
    [documentId, createSiblingBlockMutation]
  );

  return {
    // Query state
    blocks: blocksQuery.data || [],
    isLoading: blocksQuery.isLoading,
    error: blocksQuery.error,
    refetch: blocksQuery.refetch,

    // Mutation state
    createSiblingBlock,
    isCreating: createSiblingBlockMutation.isPending,
    createError: createSiblingBlockMutation.error,
    createStatus: createSiblingBlockMutation.status,

    // Combined status
    status: blocksQuery.isLoading ? 'loading' : 
            createSiblingBlockMutation.isPending ? 'creating' :
            blocksQuery.error || createSiblingBlockMutation.error ? 'error' : 'success',
  };
}

export type UseDocumentBlocksOperationsResult = ReturnType<typeof useDocumentBlocksOperations>;