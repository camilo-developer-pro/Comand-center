'use client';

/**
 * ItemTree Component
 * 
 * V2.0 Phase 1: Hierarchical File System
 * 
 * Main container for the hierarchical file tree with drag-and-drop support.
 * Uses @dnd-kit for accessible, performant drag-and-drop interactions.
 */

import { useState, useCallback, useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    type DragCancelEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useItemTree } from '../hooks/useItems';
import { useMoveItemWithValidation } from '../hooks/useMoveItemWithValidation';
import { ItemTreeNode } from './ItemTreeNode';
import { ItemDragOverlay } from './ItemDragOverlay';
import type { ItemTreeNode as ItemTreeNodeType } from '../types';

interface ItemTreeProps {
    workspaceId: string;
    activeItemId?: string;
    onItemClick?: (itemId: string, documentId: string | null) => void;
}

/**
 * Main tree component with drag-and-drop functionality
 */
export function ItemTree({ workspaceId, activeItemId, onItemClick }: ItemTreeProps) {
    const { data: tree, isLoading, error } = useItemTree(workspaceId);
    const { moveItem, isMoving } = useMoveItemWithValidation(workspaceId);

    // Drag state
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);

    // Expanded folders state (persisted in localStorage)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
        if (typeof window === 'undefined') return new Set();
        try {
            const stored = localStorage.getItem(`expanded-folders-${workspaceId}`);
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch {
            return new Set();
        }
    });

    // Configure sensors for drag detection
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement before drag starts (prevents accidental drags)
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Flatten tree to get all item IDs for SortableContext
    const flatItemIds = useMemo(() => {
        if (!tree) return [];
        const flatten = (nodes: ItemTreeNodeType[]): string[] =>
            nodes.flatMap(node => [node.id, ...flatten(node.children)]);
        return flatten(tree);
    }, [tree]);

    // Find item in tree by ID
    const findItemInTree = useCallback((itemId: string, nodes: ItemTreeNodeType[]): ItemTreeNodeType | null => {
        for (const node of nodes) {
            if (node.id === itemId) return node;
            const found = findItemInTree(itemId, node.children);
            if (found) return found;
        }
        return null;
    }, []);

    // Get active item for drag overlay
    const activeItem = useMemo(() => {
        if (!activeId || !tree) return null;
        return findItemInTree(activeId, tree);
    }, [activeId, tree, findItemInTree]);

    // Toggle folder expanded state
    const toggleExpanded = useCallback((itemId: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }

            // Persist to localStorage
            try {
                localStorage.setItem(`expanded-folders-${workspaceId}`, JSON.stringify([...next]));
            } catch (error) {
                console.error('Failed to save expanded state:', error);
            }

            return next;
        });
    }, [workspaceId]);

    // Drag handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        setOverId(event.over?.id as string ?? null);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);
        setOverId(null);

        // No drop target or dropped on self
        if (!over || active.id === over.id) return;

        if (!tree) return;

        // Find the item being dropped on
        const overItem = findItemInTree(over.id as string, tree);
        if (!overItem) return;

        // Determine new parent ID
        // If dropped on a folder, that folder becomes the parent
        // If dropped on a document, use that document's parent
        const newParentId = overItem.item_type === 'folder'
            ? overItem.id
            : overItem.parent_id;

        // Execute move with pre-flight validation
        moveItem(active.id as string, newParentId).then((result) => {
            if (result.success && newParentId && overItem.item_type === 'folder') {
                // Auto-expand the new parent folder
                setExpandedIds(prev => {
                    const next = new Set(prev);
                    next.add(newParentId);
                    try {
                        localStorage.setItem(`expanded-folders-${workspaceId}`, JSON.stringify([...next]));
                    } catch (error) {
                        console.error('Failed to save expanded state:', error);
                    }
                    return next;
                });
            }
        });
    }, [tree, findItemInTree, moveItem, workspaceId]);

    const handleDragCancel = useCallback((event: DragCancelEvent) => {
        setActiveId(null);
        setOverId(null);
    }, []);

    // Loading state
    if (isLoading) {
        return <ItemTreeSkeleton />;
    }

    // Error state
    if (error) {
        return (
            <div className="p-4 text-sm text-red-600 dark:text-red-400">
                Failed to load items. Please try again.
            </div>
        );
    }

    // Empty state
    if (!tree || tree.length === 0) {
        return (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                No items yet. Create a folder or document to get started.
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <SortableContext items={flatItemIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5" role="tree" aria-label="File explorer">
                    {tree.map((node) => (
                        <ItemTreeNode
                            key={node.id}
                            node={node}
                            depth={0}
                            activeItemId={activeItemId}
                            expandedIds={expandedIds}
                            overId={overId}
                            onToggleExpand={toggleExpanded}
                            onItemClick={onItemClick}
                        />
                    ))}
                </div>
            </SortableContext>

            <DragOverlay dropAnimation={null}>
                {activeItem && <ItemDragOverlay item={activeItem} />}
            </DragOverlay>
        </DndContext>
    );
}

/**
 * Loading skeleton for tree
 */
function ItemTreeSkeleton() {
    return (
        <div className="space-y-1 animate-pulse" aria-label="Loading items">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                </div>
            ))}
        </div>
    );
}
