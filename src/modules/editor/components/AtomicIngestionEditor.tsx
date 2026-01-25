'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { BlockIDExtension } from '../extensions/BlockIDExtension';
import { FractionalIndexExtension } from '../extensions/FractionalIndexExtension';
import { CursorTrackingExtension } from '../extensions/CursorTrackingExtension';
import { BlockNode } from '../types/block.types';
import { useCallback, useEffect, useRef } from 'react';
import { useUser } from '@/modules/core/hooks/useUser';
import { useDocumentPresence } from '@/lib/hooks/useDocumentPresence';
import { RemoteCursor } from './RemoteCursor';
import { TypingIndicator } from './TypingIndicator';
import type { UserPresence } from '@/lib/realtime/presence-types';

export interface AtomicIngestionEditorProps {
  documentId: string;
  initialContent?: Record<string, unknown>;
  onBlocksChange?: (blocks: BlockNode[]) => void;
  onEditorReady?: (editor: Editor) => void;
  onPresenceChange?: (users: UserPresence[]) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

export function AtomicIngestionEditor({
  documentId,
  initialContent,
  onBlocksChange,
  onEditorReady,
  onPresenceChange,
  placeholder = 'Start typing...',
  editable = true,
  className,
}: AtomicIngestionEditorProps) {
  const { user } = useUser();
  const previousBlocksRef = useRef<Map<string, string>>(new Map());

  const { otherUsers, updateCursorPosition, setTyping } = useDocumentPresence({
    documentId,
    currentUser: {
      id: user?.id || '',
      email: user?.email || '',
      full_name: user?.user_metadata?.full_name || user?.email || 'Anonymous',
      avatar_url: user?.user_metadata?.avatar_url || null
    },
    onPresenceChange: (presence) => {
      // Convert DocumentPresenceState object to UserPresence[] array
      const users = Object.values(presence).filter(u => u.id !== user?.id);
      onPresenceChange?.(users);
    }
  });

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
      setTyping(true);
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
      CursorTrackingExtension.configure({
        onCursorChange: updateCursorPosition,
        throttleMs: 33,
      }),
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
    <div className={`${className} relative`}>
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-4"
      />
      {/* Remote Cursors */}
      <div className="absolute inset-0 pointer-events-none">
        {otherUsers.map((u) => (
          <RemoteCursor key={u.id} user={u} />
        ))}
      </div>
      {/* Typing Indicator */}
      <div className="sticky bottom-0 z-10">
        <TypingIndicator users={otherUsers} />
      </div>
    </div>
  );
}

export default AtomicIngestionEditor;
