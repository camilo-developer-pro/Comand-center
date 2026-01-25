'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { Editor } from '@tiptap/core';
import { AtomicIngestionEditor } from './AtomicIngestionEditor';
import { DocumentHeader } from './DocumentHeader';
import { useBlockSync } from '../hooks/useBlockSync';
import { useBlockExtractor } from '../hooks/useBlockExtractor';
import { BlockNode } from '../types/block.types';
import type { UserPresence } from '@/lib/realtime/presence-types';

interface DocumentEditorProps {
  documentId: string;
  initialContent?: Record<string, unknown>;
  title?: string;
  className?: string;
}

export function DocumentEditor({
  documentId,
  initialContent,
  title,
  className,
}: DocumentEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const previousBlocksRef = useRef<BlockNode[]>([]);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [documentTitle, setDocumentTitle] = useState(title || 'Untitled');
  const [otherUsers, setOtherUsers] = useState<UserPresence[]>([]);

  const { extractBlocks, getChangedBlocks } = useBlockExtractor();

  const {
    blocks: savedBlocks,
    isLoading: isLoadingBlocks,
    sync,
    syncNow,
    isSyncing,
    isError,
    isSuccess,
    status,
  } = useBlockSync({
    documentId,
    debounceMs: 1000,
  });

  // Update sync status tracking
  useEffect(() => {
    if (isSuccess && !isSyncing) {
      setLastSyncAt(new Date());
      setHasPendingChanges(false);
    }
    if (isError) {
      setErrorCount(prev => prev + 1);
    }
  }, [isSuccess, isError, isSyncing]);

  // Handle blocks change from editor
  const handleBlocksChange = useCallback((currentBlocks: BlockNode[]) => {
    const { added, modified, deleted } = getChangedBlocks(
      previousBlocksRef.current,
      currentBlocks
    );

    // Only sync if there are actual changes
    if (added.length > 0 || modified.length > 0 || deleted.length > 0) {
      console.log('[DocumentEditor] Changes detected:', {
        added: added.length,
        modified: modified.length,
        deleted: deleted.length,
      });

      sync(currentBlocks, deleted);
      setHasPendingChanges(true);
      previousBlocksRef.current = currentBlocks;
    }
  }, [getChangedBlocks, sync]);

  // Handle editor ready
  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
    setIsEditorReady(true);

    // Extract initial blocks
    const initialBlocks = extractBlocks(editor);
    previousBlocksRef.current = initialBlocks;
  }, [extractBlocks]);

  // Keyboard shortcut for manual save (Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (editorRef.current) {
          const currentBlocks = extractBlocks(editorRef.current);
          syncNow(currentBlocks, []);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [extractBlocks, syncNow]);

  // Sync before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingChanges) {
        // Try to sync immediately
        if (editorRef.current) {
          const currentBlocks = extractBlocks(editorRef.current);
          syncNow(currentBlocks, []);
        }
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasPendingChanges, extractBlocks, syncNow]);

  // Convert saved blocks to TipTap content format
  const getInitialContent = useCallback(() => {
    if (initialContent) return initialContent;

    if (savedBlocks && savedBlocks.length > 0) {
      return {
        type: 'doc',
        content: savedBlocks
          .sort((a, b) => a.sortOrder.localeCompare(b.sortOrder))
          .map((block) => block.content),
      };
    }

    return undefined;
  }, [initialContent, savedBlocks]);

  if (isLoadingBlocks) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-4 p-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <DocumentHeader
        title={documentTitle}
        onTitleChange={setDocumentTitle}
        otherUsers={otherUsers}
        lastSaved={lastSyncAt}
        isSaving={isSyncing}
      />

      {/* Editor */}
      <AtomicIngestionEditor
        documentId={documentId}
        initialContent={getInitialContent()}
        onBlocksChange={handleBlocksChange}
        onEditorReady={handleEditorReady}
        onPresenceChange={setOtherUsers}
        placeholder="Start writing..."
        className="flex-1"
      />
    </div>
  );
}