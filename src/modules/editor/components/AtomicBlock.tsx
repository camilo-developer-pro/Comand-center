'use client';

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import type { Block } from '../hooks/useDocumentBlocks';
import { TipTapAtomicEditor } from './TipTapAtomicEditor';

/**
 * AtomicBlock Component
 *
 * V3.2 Phase 2: Atomic Editor & Layout
 *
 * Renders a single atomic block with TipTap editor integration.
 * Each block is an independent TipTap instance with proper focus management.
 *
 * Features:
 * - Visual focus indicator (ring + left border)
 * - TipTap editor integration (real TipTap editor for text blocks)
 * - Keyboard navigation support
 * - Optimistic UI updates
 * - Enter key creates sibling blocks
 *
 * @param block - The block data to render
 * @param documentId - The document ID this block belongs to
 * @param previousBlockId - The ID of the previous block in the list
 * @param nextBlockId - The ID of the next block in the list
 * @param isFocused - Whether this block is currently focused
 * @param onFocus - Callback when block receives focus
 * @param onBlur - Callback when block loses focus
 * @param onEnterAtEnd - Callback when Enter is pressed at the end of block
 * @param onContentChange - Callback when block content changes
 */
interface AtomicBlockProps {
  block: Block;
  documentId: string;
  previousBlockId: string | null;
  nextBlockId: string | null;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onEnterAtEnd: () => void;
  onContentChange?: (content: unknown) => void;
}

// Type-safe content access helpers
function getContentText(content: Record<string, unknown>): string {
  if (typeof content.text === 'string') return content.text;
  if (typeof content.content === 'string') return content.content;
  return '';
}

function getContentChecked(content: Record<string, unknown>): boolean {
  if (typeof content.checked === 'boolean') return content.checked;
  return false;
}

function getContentCode(content: Record<string, unknown>): string {
  if (typeof content.code === 'string') return content.code;
  if (typeof content.content === 'string') return content.content;
  return '// Code block';
}

function getContentAlt(content: Record<string, unknown>): string {
  if (typeof content.alt === 'string') return content.alt;
  if (typeof content.caption === 'string') return content.caption;
  return 'Image';
}

export const AtomicBlock = memo(function AtomicBlock({
  block,
  documentId,
  previousBlockId,
  nextBlockId,
  isFocused,
  onFocus,
  onBlur,
  onEnterAtEnd,
  onContentChange,
}: AtomicBlockProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Handle focus events
  const handleFocus = useCallback(() => {
    onFocus();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    onBlur();
  }, [onBlur]);

  // Set up focus management
  useEffect(() => {
    const editorElement = editorRef.current;
    if (!editorElement) return;

    const handleClick = () => {
      handleFocus();
    };

    editorElement.addEventListener('click', handleClick);
    editorElement.addEventListener('focusin', handleFocus);
    editorElement.addEventListener('focusout', handleBlur);

    return () => {
      editorElement.removeEventListener('click', handleClick);
      editorElement.removeEventListener('focusin', handleFocus);
      editorElement.removeEventListener('focusout', handleBlur);
    };
  }, [handleFocus, handleBlur]);

  // Get block type styling
  const getBlockTypeStyles = () => {
    switch (block.type) {
      case 'heading':
        return 'text-2xl font-bold';
      case 'task':
        return 'flex items-start gap-2';
      case 'code':
        return 'font-mono bg-gray-100 dark:bg-gray-800 p-3 rounded';
      case 'quote':
        return 'border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic';
      case 'divider':
        return 'h-px bg-gray-200 dark:bg-gray-700 my-4';
      case 'image':
        return 'rounded-lg overflow-hidden';
      case 'table':
        return 'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden';
      default: // 'text', 'paragraph'
        return 'text-base';
    }
  };

  // Render block content based on type
  const renderBlockContent = () => {
    const content = block.content || {};
    
    switch (block.type) {
      case 'heading':
        return (
          <div className={getBlockTypeStyles()}>
            {getContentText(content) || 'Heading'}
          </div>
        );
      
      case 'task':
        return (
          <div className={getBlockTypeStyles()}>
            <input
              type="checkbox"
              className="mt-1"
              checked={getContentChecked(content)}
              readOnly
            />
            <div className="flex-1">
              {getContentText(content) || 'Task item'}
            </div>
          </div>
        );
      
      case 'code':
        return (
          <pre className={getBlockTypeStyles()}>
            <code>{getContentCode(content)}</code>
          </pre>
        );
      
      case 'quote':
        return (
          <div className={getBlockTypeStyles()}>
            {getContentText(content) || 'Quote'}
          </div>
        );
      
      case 'divider':
        return <div className={getBlockTypeStyles()} />;
      
      case 'image':
        return (
          <div className={getBlockTypeStyles()}>
            <div className="bg-gray-200 dark:bg-gray-700 h-48 flex items-center justify-center rounded-lg">
              <span className="text-gray-500 dark:text-gray-400">
                {getContentAlt(content)}
              </span>
            </div>
          </div>
        );
      
      case 'table':
        return (
          <div className={getBlockTypeStyles()}>
            <div className="bg-gray-200 dark:bg-gray-700 h-32 flex items-center justify-center rounded-lg">
              <span className="text-gray-500 dark:text-gray-400">
                Table
              </span>
            </div>
          </div>
        );
      
      default: // 'text', 'paragraph'
        return (
          <TipTapAtomicEditor
            block={block}
            documentId={documentId}
            previousBlockId={previousBlockId}
            nextBlockId={nextBlockId}
            onFocus={handleFocus}
            onContentChange={onContentChange}
          />
        );
    }
  };

  return (
    <div
      ref={editorRef}
      className={cn(
        'relative p-3 rounded-lg transition-all duration-150',
        'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        isFocused && [
          'ring-2 ring-blue-500 dark:ring-blue-400',
          'bg-blue-50 dark:bg-blue-900/20',
          'border-l-4 border-blue-500 dark:border-blue-400',
        ],
        !isFocused && 'border-l-2 border-transparent'
      )}
      tabIndex={0}
      role="textbox"
      aria-label={`Block ${block.type}`}
    >
      {/* Block type indicator */}
      <div className="absolute top-2 right-2 text-xs text-gray-400 dark:text-gray-500 font-mono">
        {block.type}
      </div>

      {/* Block content */}
      <div className="pr-8">
        {renderBlockContent()}
      </div>

      {/* Block metadata */}
      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="font-mono truncate">
          {block.id.slice(0, 8)}...
        </span>
        <span>
          {new Date(block.updatedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    </div>
  );
});