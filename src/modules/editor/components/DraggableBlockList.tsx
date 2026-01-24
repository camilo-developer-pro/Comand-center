'use client';

import { useCallback, useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SortableBlockWrapper } from './SortableBlockWrapper';
import { reorderBlock } from '@/lib/actions/block-actions';
import { generateKeyBetween } from '@/lib/utils';
import { blockKeys } from '../hooks/useBlockSync';
import { toast } from 'sonner';

interface BlockItem {
  id: string;
  sortOrder: string;
  content: React.ReactNode;
}

interface DraggableBlockListProps {
  documentId: string;
  blocks: BlockItem[];
  renderBlock: (block: BlockItem) => React.ReactNode;
  disabled?: boolean;
}

export function DraggableBlockList({
  documentId,
  blocks,
  renderBlock,
  disabled = false,
}: DraggableBlockListProps) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localBlocks, setLocalBlocks] = useState(blocks);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const reorderMutation = useMutation({
    mutationFn: async ({
      blockId,
      newSortOrder,
    }: {
      blockId: string;
      newSortOrder: string;
    }) => {
      const result = await reorderBlock({
        blockId,
        documentId,
        newSortOrder,
      });
      
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onMutate: async ({ blockId, newSortOrder }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: blockKeys.list(documentId) });
      
      // Snapshot previous values
      const previousBlocks = queryClient.getQueryData<BlockItem[]>(blockKeys.list(documentId));
      
      // Optimistically update the block's sortOrder
      if (previousBlocks) {
        const updatedBlocks = previousBlocks.map(block =>
          block.id === blockId ? { ...block, sortOrder: newSortOrder } : block
        );
        
        // Sort by new sortOrder
        updatedBlocks.sort((a, b) => a.sortOrder.localeCompare(b.sortOrder));
        
        queryClient.setQueryData(blockKeys.list(documentId), updatedBlocks);
      }
      
      // Show optimistic toast
      toast.loading('Reordering block...', { id: `block-reorder-${blockId}` });
      
      return { previousBlocks };
    },
    onSuccess: (data, { blockId }) => {
      // Update toast to success
      toast.success('Block reordered', {
        id: `block-reorder-${blockId}`,
        description: `New position: ${data.sortOrder}`,
      });
    },
    onError: (error, { blockId }, context) => {
      // Rollback on error
      if (context?.previousBlocks) {
        queryClient.setQueryData(
          blockKeys.list(documentId),
          context.previousBlocks
        );
      }
      
      // Update toast to error
      toast.error('Failed to reorder block', {
        id: `block-reorder-${blockId}`,
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: blockKeys.list(documentId) });
    },
  });
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);
  
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = localBlocks.findIndex((b) => b.id === active.id);
    const newIndex = localBlocks.findIndex((b) => b.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Calculate new sort order using fractional indexing
    const sortedBlocks = [...localBlocks].sort((a, b) =>
      a.sortOrder.localeCompare(b.sortOrder)
    );
    
    const prevBlock = newIndex > 0 ? sortedBlocks[newIndex - 1] : null;
    const nextBlock = newIndex < sortedBlocks.length - 1 
      ? sortedBlocks[newIndex + (oldIndex < newIndex ? 0 : 1)] 
      : null;
    
    const newSortOrder = generateKeyBetween(
      prevBlock?.sortOrder ?? null,
      nextBlock?.sortOrder ?? null,
      true // Add jitter for collision prevention
    );
    
    // Optimistic update to local state
    const newBlocks = arrayMove(localBlocks, oldIndex, newIndex).map((b) =>
      b.id === active.id ? { ...b, sortOrder: newSortOrder } : b
    );
    setLocalBlocks(newBlocks);
    
    // Persist to server
    reorderMutation.mutate({
      blockId: active.id as string,
      newSortOrder,
    });
  }, [localBlocks, reorderMutation]);
  
  // Sync local state with props when blocks change from server
  useEffect(() => {
    setLocalBlocks(blocks);
  }, [blocks]);
  
  const activeBlock = activeId
    ? localBlocks.find((b) => b.id === activeId)
    : null;
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localBlocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {localBlocks
            .sort((a, b) => a.sortOrder.localeCompare(b.sortOrder))
            .map((block) => (
              <SortableBlockWrapper
                key={block.id}
                id={block.id}
                disabled={disabled}
              >
                {renderBlock(block)}
              </SortableBlockWrapper>
            ))}
        </div>
      </SortableContext>
      
      <DragOverlay>
        {activeBlock ? (
          <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-2 opacity-90">
            {renderBlock(activeBlock)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}