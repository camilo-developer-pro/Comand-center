import { Editor } from '@tiptap/core';
import { generateKeyBetween } from '@/lib/utils';

export interface ReorderResult {
  blockId: string;
  newSortOrder: string;
}

export function calculateReorderSortOrder(
  editor: Editor,
  draggedBlockId: string,
  targetIndex: number
): ReorderResult | null {
  const doc = editor.state.doc;
  const blocks: { blockId: string; sortOrder: string; pos: number }[] = [];
  
  doc.descendants((node, pos) => {
    if (node.attrs.blockId && node.attrs.sortOrder) {
      blocks.push({
        blockId: node.attrs.blockId,
        sortOrder: node.attrs.sortOrder,
        pos,
      });
    }
  });
  
  // Sort by current sortOrder
  blocks.sort((a, b) => a.sortOrder.localeCompare(b.sortOrder));
  
  // Find the dragged block
  const draggedBlockIndex = blocks.findIndex(block => block.blockId === draggedBlockId);
  if (draggedBlockIndex === -1) {
    return null;
  }
  
  // Remove the dragged block from the list for reordering
  const [draggedBlock] = blocks.splice(draggedBlockIndex, 1);
  
  // Insert at target position
  blocks.splice(targetIndex, 0, draggedBlock);
  
  // Find prev and next at target position
  const prevBlock = targetIndex > 0 ? blocks[targetIndex - 1] : null;
  const nextBlock = targetIndex < blocks.length - 1 ? blocks[targetIndex + 1] : null;
  
  const newSortOrder = generateKeyBetween(
    prevBlock?.sortOrder ?? null,
    nextBlock?.sortOrder ?? null,
    true // Add jitter for collision prevention
  );
  
  return {
    blockId: draggedBlockId,
    newSortOrder,
  };
}

/**
 * Apply a reorder operation to the editor
 */
export function applyReorder(
  editor: Editor,
  result: ReorderResult
): boolean {
  const { blockId, newSortOrder } = result;
  
  let found = false;
  editor.state.doc.descendants((node, pos) => {
    if (node.attrs.blockId === blockId) {
      editor.commands.updateAttributes(node.type.name, {
        sortOrder: newSortOrder,
      });
      found = true;
    }
  });
  
  return found;
}

/**
 * Validate that all blocks have unique sortOrder values
 */
export function validateSortOrderUniqueness(editor: Editor): boolean {
  const sortOrders = new Set<string>();
  let valid = true;
  
  editor.state.doc.descendants((node) => {
    if (node.attrs.sortOrder) {
      if (sortOrders.has(node.attrs.sortOrder)) {
        valid = false;
      }
      sortOrders.add(node.attrs.sortOrder);
    }
  });
  
  return valid;
}

/**
 * Get the visual order of blocks based on sortOrder
 */
export function getVisualBlockOrder(editor: Editor): Array<{ blockId: string; sortOrder: string }> {
  const blocks: Array<{ blockId: string; sortOrder: string }> = [];
  
  editor.state.doc.descendants((node) => {
    if (node.attrs.blockId && node.attrs.sortOrder) {
      blocks.push({
        blockId: node.attrs.blockId,
        sortOrder: node.attrs.sortOrder,
      });
    }
  });
  
  // Sort by sortOrder (lexicographically)
  blocks.sort((a, b) => a.sortOrder.localeCompare(b.sortOrder));
  
  return blocks;
}