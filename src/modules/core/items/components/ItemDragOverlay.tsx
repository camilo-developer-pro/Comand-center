'use client';

/**
 * ItemDragOverlay Component
 * 
 * V2.0 Phase 1: Hierarchical File System
 * 
 * Visual feedback component shown during drag operations.
 * Displays the item being dragged with styling to indicate it's in motion.
 */

import type { ItemTreeNode } from '../types';

interface ItemDragOverlayProps {
    item: ItemTreeNode;
}

/**
 * Drag overlay for visual feedback during drag operations
 */
export function ItemDragOverlay({ item }: ItemDragOverlayProps) {
    const isFolder = item.item_type === 'folder';

    return (
        <div
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-blue-400 dark:border-blue-500"
            role="img"
            aria-label={`Dragging ${isFolder ? 'folder' : 'document'}: ${item.name}`}
        >
            {/* Icon */}
            <span className="flex-shrink-0 text-base">
                {isFolder ? '📁' : '📄'}
            </span>

            {/* Name */}
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.name}
            </span>

            {/* Child count (folders with children) */}
            {isFolder && item.childCount > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    (+{item.childCount} item{item.childCount !== 1 ? 's' : ''})
                </span>
            )}
        </div>
    );
}
