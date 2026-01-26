'use client';

import React from 'react';
import { useDocumentBlocks } from '../hooks/useDocumentBlocks';
import { FocusManagerProvider, useFocusManager } from '../hooks/useFocusManager';
import { AtomicBlock } from './AtomicBlock';
import type { Block } from '../hooks/useDocumentBlocks';

/**
 * BlockRenderer Component
 *
 * V3.2 Phase 2: Atomic Editor & Layout
 *
 * Renders a list of blocks for a document using the atomic block architecture.
 * Each block is an independent TipTap instance with proper focus management.
 *
 * @param documentId - The ID of the document to render blocks for
 * @param className - Optional CSS class name for the container
 */
interface BlockRendererProps {
  documentId: string;
  className?: string;
}

function BlockRendererContent({ blocks, className }: { blocks: Block[], className: string }) {
  const { focusedBlockId, setFocusedBlockId, clearFocus, isFocused } = useFocusManager();

  // Handle focus events
  const handleBlockFocus = (blockId: string) => {
    setFocusedBlockId(blockId);
  };

  const handleBlockBlur = () => {
    clearFocus();
  };

  // Handle Enter key press at the end of a block
  const handleEnterAtEnd = (blockId: string) => {
    // TODO: Implement create sibling block logic
    // This will be handled by the AtomicBlock component
    console.log('Enter pressed at end of block:', blockId);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {blocks.map((block: Block) => (
        <AtomicBlock
          key={block.id}
          block={block}
          isFocused={isFocused(block.id)}
          onFocus={() => handleBlockFocus(block.id)}
          onBlur={handleBlockBlur}
          onEnterAtEnd={() => handleEnterAtEnd(block.id)}
        />
      ))}
    </div>
  );
}

export function BlockRenderer({ documentId, className = '' }: BlockRendererProps) {
  const { data: blocks, isLoading, error } = useDocumentBlocks(documentId);

  // Handle loading state
  if (isLoading) {
    return (
      <div className={`flex flex-col gap-4 p-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className={`p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg ${className}`}>
        <p className="text-red-600 dark:text-red-400 font-medium">
          Failed to load blocks
        </p>
        <p className="text-red-500 dark:text-red-300 text-sm mt-1">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  // Handle empty state
  if (!blocks || blocks.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
        <div className="w-12 h-12 mb-4 text-gray-400 dark:text-gray-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-full h-full"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
          No blocks yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Start typing to create your first block
        </p>
      </div>
    );
  }

  return (
    <FocusManagerProvider blocks={blocks}>
      <BlockRendererContent blocks={blocks} className={className} />
    </FocusManagerProvider>
  );
}