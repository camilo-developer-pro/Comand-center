'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { BlockIDExtension } from '../extensions/BlockIDExtension';
import { FractionalIndexExtension } from '../extensions/FractionalIndexExtension';
import { BlockNode } from '../types/block.types';
import { useCallback, useEffect, useRef } from 'react';

export interface AtomicIngestionEditorProps {
  documentId: string;
  initialContent?: Record<string, unknown>;
  onBlocksChange?: (blocks: BlockNode[]) => void;
  onEditorReady?: (editor: Editor) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

export function AtomicIngestionEditor({
  documentId,
  initialContent,
  onBlocksChange,
  onEditorReady,
  placeholder = 'Start typing...',
  editable = true,
  className,
}: AtomicIngestionEditorProps) {
  const previousBlocksRef = useRef<Map<string, string>>(new Map());
  
  const extractBlocks = useCallback((editor: Editor): BlockNode[] => {
    const blocks: BlockNode[] = [];
    
    editor.state.doc.descendants((node, pos) => {
      if (node.attrs.blockId) {
        blocks.push({
          blockId: node.attrs.blockId,
          type: node.type.name,
          content: node.toJSON(),
          sortOrder: node.attrs.sortOrder || '',
          parentPath: 'root', // Will be enhanced in hierarchy phase
        });
      }
    });
    
    return blocks;
  }, []);
  
  const handleUpdate = useCallback(({ editor }: { editor: Editor }) => {
    if (!onBlocksChange) return;
    
    const blocks = extractBlocks(editor);
    const currentBlockMap = new Map(blocks.map(b => [b.blockId, JSON.stringify(b.content)]));
    
    // Detect changes
    let hasChanges = false;
    
    // Check for new or modified blocks
    for (const [id, content] of currentBlockMap) {
      if (previousBlocksRef.current.get(id) !== content) {
        hasChanges = true;
        break;
      }
    }
    
    // Check for deleted blocks
    if (!hasChanges) {
      for (const id of previousBlocksRef.current.keys()) {
        if (!currentBlockMap.has(id)) {
          hasChanges = true;
          break;
        }
      }
    }
    
    if (hasChanges) {
      previousBlocksRef.current = currentBlockMap;
      onBlocksChange(blocks);
    }
  }, [onBlocksChange, extractBlocks]);
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      BlockIDExtension,
      FractionalIndexExtension,
    ],
    content: initialContent,
    editable,
    onUpdate: handleUpdate,
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
    },
  });
  
  // Expose editor instance for external access
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);
  
  if (!editor) {
    return (
      <div className={className}>
        <div className="animate-pulse bg-gray-100 dark:bg-gray-800 h-64 rounded-lg" />
      </div>
    );
  }
  
  return (
    <div className={className}>
      <EditorContent 
        editor={editor} 
        className="prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-4"
      />
    </div>
  );
}

export default AtomicIngestionEditor;
