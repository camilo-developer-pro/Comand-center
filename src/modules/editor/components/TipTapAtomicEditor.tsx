'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { EnterKeyExtension } from '../extensions/EnterKeyExtension';
import { useCreateSiblingBlock } from '../hooks/useDocumentBlocks';
import { useCallback, useEffect } from 'react';
import type { Block } from '../hooks/useDocumentBlocks';

interface TipTapAtomicEditorProps {
  block: Block;
  documentId: string;
  previousBlockId: string | null;
  nextBlockId: string | null;
  onFocus: () => void;
  onContentChange?: (content: unknown) => void;
}

export function TipTapAtomicEditor({
  block,
  documentId,
  previousBlockId,
  nextBlockId,
  onFocus,
  onContentChange,
}: TipTapAtomicEditorProps) {
  const createSibling = useCreateSiblingBlock();
  
  // Handler for Enter key - create sibling block
  const handleEnterAtEnd = useCallback(() => {
    createSibling.mutate({
      documentId,
      previousBlockId: block.id, // Current block becomes the previous
      nextBlockId, // Next block in the list
      type: 'paragraph',
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    }, {
      onSuccess: (result) => {
        // Focus the new block after creation
        // This will be handled by the FocusManager in the next prompt
        setTimeout(() => {
          const newBlockEl = document.querySelector(`[data-block-id="${result.id}"]`);
          if (newBlockEl) {
            const editor = (newBlockEl as any).__tiptap;
            editor?.commands.focus('start');
          }
        }, 50);
      },
    });
  }, [createSibling, documentId, block.id, nextBlockId]);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default Enter behavior for paragraph
        hardBreak: false,
      }),
      Placeholder.configure({
        placeholder: 'Type something...',
        emptyEditorClass: 'is-editor-empty',
      }),
      EnterKeyExtension.configure({
        onEnterAtEnd: handleEnterAtEnd,
      }),
    ],
    content: block.content as any,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[1.5rem]',
      },
    },
    onFocus: () => {
      onFocus();
    },
    onUpdate: ({ editor }) => {
      onContentChange?.(editor.getJSON());
    },
  });
  
  // Update content when block changes (e.g., from server sync)
  useEffect(() => {
    if (editor && block.content) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(block.content);
      if (currentContent !== newContent) {
        editor.commands.setContent(block.content as any);
      }
    }
  }, [editor, block.content]);
  
  return <EditorContent editor={editor} />;
}