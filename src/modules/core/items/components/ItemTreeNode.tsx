'use client';

/**
 * ItemTreeNode Component
 * 
 * V2.0 Phase 1: Hierarchical File System
 * 
 * Recursive tree node component for rendering individual items (folders/documents)
 * with drag-and-drop support. Memoized for performance with large trees.
 */

import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import type { ItemTreeNode as ItemTreeNodeType } from '../types';

interface ItemTreeNodeProps {
    node: ItemTreeNodeType;
    depth: number;
    activeItemId?: string;
    expandedIds: Set<string>;
    overId: string | null;
    onToggleExpand: (id: string) => void;
    onItemClick?: (itemId: string, documentId: string | null) => void;
}

/**
 * Individual tree node with drag-and-drop and recursive rendering
 */
export const ItemTreeNode = memo(function ItemTreeNode({
    node,
    depth,
    activeItemId,
    expandedIds,
    overId,
    onToggleExpand,
    onItemClick,
}: ItemTreeNodeProps) {
    const isExpanded = expandedIds.has(node.id);
    const isActive = activeItemId === node.id || activeItemId === node.document_id;
    const isFolder = node.item_type === 'folder';
    const isDropTarget = overId === node.id && isFolder;
    const hasChildren = node.children.length > 0;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: node.id,
        data: {
            type: node.item_type,
            item: node,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        paddingLeft: `${depth * 16 + 8}px`,
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isFolder) {
            e.preventDefault();
            onToggleExpand(node.id);
        } else if (onItemClick) {
            onItemClick(node.id, node.document_id);
        }
    };

    const handleExpandClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onToggleExpand(node.id);
    };

    // Node content (icon, name, badges)
    const nodeContent = (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={handleClick}
            role="treeitem"
            aria-expanded={isFolder ? isExpanded : undefined}
            aria-selected={isActive}
            aria-label={`${node.item_type === 'folder' ? 'Folder' : 'Document'}: ${node.name}`}
            className={`
        group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer
        transition-colors duration-150 select-none
        ${isDragging ? 'opacity-40 cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}
        ${isDropTarget ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400 ring-inset' : ''}
        ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }
      `}
        >
            {/* Expand/Collapse Arrow (folders only) */}
            {isFolder ? (
                <button
                    onClick={handleExpandClick}
                    tabIndex={-1}
                    aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
                    className={`
            w-4 h-4 flex items-center justify-center flex-shrink-0
            text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
            transition-colors
            ${!hasChildren ? 'invisible' : ''}
          `}
                >
                    <svg
                        className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            ) : (
                <div className="w-4" /> // Spacer for alignment
            )}

            {/* Icon */}
            <span className="flex-shrink-0 text-base" role="img" aria-label={isFolder ? 'Folder' : 'Document'}>
                {isFolder ? (
                    isExpanded ? '📂' : '📁'
                ) : '📄'}
            </span>

            {/* Name */}
            <span className="flex-1 truncate text-sm font-medium">
                {node.name}
            </span>

            {/* Child count badge (folders with children) */}
            {isFolder && node.childCount > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500 font-normal px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                    {node.childCount}
                </span>
            )}
        </div>
    );

    // Wrap documents in Link for navigation
    const wrappedContent = isFolder ? (
        nodeContent
    ) : (
        <Link
            href={`/documents/${node.document_id}`}
            className="block"
            onClick={(e) => {
                // Prevent navigation during drag
                if (isDragging) {
                    e.preventDefault();
                }
            }}
        >
            {nodeContent}
        </Link>
    );

    return (
        <>
            {wrappedContent}

            {/* Render children recursively (folders only, when expanded) */}
            {isFolder && isExpanded && hasChildren && (
                <div role="group">
                    {node.children.map((child) => (
                        <ItemTreeNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            activeItemId={activeItemId}
                            expandedIds={expandedIds}
                            overId={overId}
                            onToggleExpand={onToggleExpand}
                            onItemClick={onItemClick}
                        />
                    ))}
                </div>
            )}
        </>
    );
});
