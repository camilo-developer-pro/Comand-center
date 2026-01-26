'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { Block } from './useDocumentBlocks';

/**
 * Focus Manager Context for Atomic Editor
 * 
 * V3.2 Phase 2: Atomic Editor & Layout
 * 
 * Provides comprehensive focus management for blocks with:
 * - Context-based focus state tracking
 * - Programmatic focus control
 * - Keyboard navigation (Cmd+ArrowUp/Down)
 * - Visual focus highlighting
 */

// ============================================================
// Type Definitions
// ============================================================

export interface FocusManagerContextValue {
  focusedBlockId: string | null;
  setFocusedBlockId: (id: string | null) => void;
  focusBlock: (id: string) => void; // Programmatically focus a block
  focusNextBlock: () => void;
  focusPreviousBlock: () => void;
  clearFocus: () => void;
  isFocused: (id: string) => boolean;
}

interface FocusManagerProviderProps {
  children: ReactNode;
  blocks: Block[];
}

// ============================================================
// Context Creation
// ============================================================

const FocusManagerContext = createContext<FocusManagerContextValue | undefined>(undefined);

// ============================================================
// Provider Component
// ============================================================

export function FocusManagerProvider({ children, blocks }: FocusManagerProviderProps) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

  /**
   * Programmatically focus a block and its TipTap editor
   */
  const focusBlock = useCallback((id: string) => {
    setFocusedBlockId(id);
    
    // Focus the TipTap editor inside the block
    setTimeout(() => {
      const blockEl = document.querySelector(`[data-block-id="${id}"]`);
      const editorEl = blockEl?.querySelector('.ProseMirror');
      (editorEl as HTMLElement)?.focus();
    }, 0);
  }, []);

  /**
   * Focus the next block in the list
   */
  const focusNextBlock = useCallback(() => {
    if (!focusedBlockId) return;
    
    const currentIndex = blocks.findIndex(b => b.id === focusedBlockId);
    if (currentIndex < blocks.length - 1) {
      focusBlock(blocks[currentIndex + 1].id);
    }
  }, [focusedBlockId, blocks, focusBlock]);

  /**
   * Focus the previous block in the list
   */
  const focusPreviousBlock = useCallback(() => {
    if (!focusedBlockId) return;
    
    const currentIndex = blocks.findIndex(b => b.id === focusedBlockId);
    if (currentIndex > 0) {
      focusBlock(blocks[currentIndex - 1].id);
    }
  }, [focusedBlockId, blocks, focusBlock]);

  /**
   * Clear focus state
   */
  const clearFocus = useCallback(() => {
    setFocusedBlockId(null);
  }, []);

  /**
   * Check if a block is focused
   */
  const isFocused = useCallback((id: string) => {
    return focusedBlockId === id;
  }, [focusedBlockId]);

  /**
   * Keyboard navigation: Cmd+ArrowUp/Down for block navigation
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + ArrowUp/ArrowDown
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isModifierKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (isModifierKey && e.key === 'ArrowUp') {
        e.preventDefault();
        focusPreviousBlock();
      }
      
      if (isModifierKey && e.key === 'ArrowDown') {
        e.preventDefault();
        focusNextBlock();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusNextBlock, focusPreviousBlock]);

  const contextValue: FocusManagerContextValue = {
    focusedBlockId,
    setFocusedBlockId,
    focusBlock,
    focusNextBlock,
    focusPreviousBlock,
    clearFocus,
    isFocused,
  };

  return (
    <FocusManagerContext.Provider value={contextValue}>
      {children}
    </FocusManagerContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useFocusManager() {
  const context = useContext(FocusManagerContext);
  
  if (!context) {
    throw new Error('useFocusManager must be used within FocusManagerProvider');
  }
  
  return context;
}

// ============================================================
// Visual Focus State Utilities
// ============================================================

/**
 * Get CSS classes for focused block styling
 * Based on .cursorrules requirements:
 * - Active block: `bg-accent ring-2 ring-primary/20`
 * - Left border indicator: `w-0.5 bg-primary rounded-full`
 */
export function getFocusClasses(isFocused: boolean): string {
  if (!isFocused) return '';
  
  return 'bg-accent ring-2 ring-primary/20';
}

/**
 * Get left border indicator styles for focused block
 */
export function getLeftBorderIndicatorStyles(isFocused: boolean): React.CSSProperties {
  if (!isFocused) return {};
  
  return {
    position: 'absolute' as const,
    left: 0,
    top: '4px',
    bottom: '4px',
    width: '2px',
    backgroundColor: 'hsl(var(--primary))',
    borderRadius: '9999px',
  };
}
