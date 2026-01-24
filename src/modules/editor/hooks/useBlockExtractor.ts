import { Editor } from '@tiptap/core';
import { useCallback } from 'react';
import { BlockNode } from '../types/block.types';

export function useBlockExtractor() {
  const extractBlocks = useCallback((editor: Editor): BlockNode[] => {
    const blocks: BlockNode[] = [];
    
    editor.state.doc.descendants((node, pos) => {
      if (node.attrs.blockId) {
        blocks.push({
          blockId: node.attrs.blockId,
          type: node.type.name,
          content: node.toJSON(),
          sortOrder: node.attrs.sortOrder || '',
          parentPath: 'root',
        });
      }
    });
    
    return blocks.sort((a, b) => a.sortOrder.localeCompare(b.sortOrder));
  }, []);
  
  const getChangedBlocks = useCallback((
    previousBlocks: BlockNode[],
    currentBlocks: BlockNode[]
  ): {
    added: BlockNode[];
    modified: BlockNode[];
    deleted: string[];
  } => {
    const prevMap = new Map(previousBlocks.map(b => [b.blockId, b]));
    const currMap = new Map(currentBlocks.map(b => [b.blockId, b]));
    
    const added: BlockNode[] = [];
    const modified: BlockNode[] = [];
    const deleted: string[] = [];
    
    // Find added and modified
    for (const [id, block] of currMap) {
      const prev = prevMap.get(id);
      if (!prev) {
        added.push(block);
      } else if (JSON.stringify(prev.content) !== JSON.stringify(block.content)) {
        modified.push(block);
      }
    }
    
    // Find deleted
    for (const id of prevMap.keys()) {
      if (!currMap.has(id)) {
        deleted.push(id);
      }
    }
    
    return { added, modified, deleted };
  }, []);
  
  return { extractBlocks, getChangedBlocks };
}