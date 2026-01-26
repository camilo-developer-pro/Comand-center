'use client';

import { useDocumentBlocks } from '../hooks/useDocumentBlocks';
import { FocusManagerProvider } from '../hooks/useFocusManager';
import { BlockRenderer } from './BlockRenderer';
import { DocumentHeader } from './DocumentHeader';
import { useUpdateDocumentTitle } from '@/modules/core/documents/hooks/useDocumentMutations';
import { useState, useCallback } from 'react';

interface DocumentEditorProps {
  documentId: string;
  initialTitle: string;
}

export function DocumentEditor({ documentId, initialTitle }: DocumentEditorProps) {
  const { data: blocks, isLoading } = useDocumentBlocks(documentId);
  const { mutate: updateTitle } = useUpdateDocumentTitle();
  const [title, setTitle] = useState(initialTitle);
  
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    if (newTitle !== initialTitle) {
      updateTitle({ documentId, title: newTitle });
    }
  }, [documentId, initialTitle, updateTitle]);
  
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="px-8 pt-16 pb-4">
          <div className="h-12 w-64 bg-muted rounded animate-pulse" />
        </div>
        <div className="px-8 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 w-full bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <FocusManagerProvider blocks={blocks || []}>
      <div className="max-w-3xl mx-auto">
        {/* Document Title */}
        <DocumentHeader 
          documentId={documentId}
          initialTitle={title}
          onTitleChange={handleTitleChange}
        />
        
        {/* Block Renderer */}
        <BlockRenderer documentId={documentId} />
      </div>
    </FocusManagerProvider>
  );
}