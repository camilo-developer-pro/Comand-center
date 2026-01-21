'use client';

/**
 * Items React Query Hooks
 * 
 * V2.0 Phase 1: Hierarchical File System
 * 
 * TanStack Query hooks for managing items with optimistic updates,
 * caching, and automatic refetching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getWorkspaceItems,
    getWorkspaceItemsWithMeta,
    moveItem,
    createFolder,
    createDocumentItem,
    renameItem,
    deleteItem,
    reorderItems,
} from '../actions/itemActions';
import type {
    Item,
    ItemWithMeta,
    ItemTreeNode,
    MoveItemParams,
    CreateFolderParams,
    CreateDocumentItemParams,
    RenameItemParams,
    ReorderItemsParams,
} from '../types';

// ============================================================
// Query Keys Factory
// ============================================================

/**
 * Centralized query keys for items
 * Follows TanStack Query best practices for cache invalidation
 */
export const itemKeys = {
    all: ['items'] as const,
    workspace: (workspaceId: string) => [...itemKeys.all, 'workspace', workspaceId] as const,
    tree: (workspaceId: string) => [...itemKeys.workspace(workspaceId), 'tree'] as const,
    withMeta: (workspaceId: string) => [...itemKeys.workspace(workspaceId), 'meta'] as const,
};

// ============================================================
// Utility Functions
// ============================================================

/**
 * Convert flat items list to hierarchical tree structure
 * Uses parent_id relationships to build the tree
 */
export function buildItemTree(items: ItemWithMeta[]): ItemTreeNode[] {
    // Create a map for quick lookup
    const itemMap = new Map<string, ItemTreeNode>();
    const rootItems: ItemTreeNode[] = [];

    // First pass: Create tree nodes
    items.forEach((item) => {
        itemMap.set(item.id, { ...item, children: [] });
    });

    // Second pass: Build parent-child relationships
    items.forEach((item) => {
        const node = itemMap.get(item.id);
        if (!node) return;

        if (item.parent_id === null) {
            // Root level item
            rootItems.push(node);
        } else {
            // Child item - add to parent's children
            const parent = itemMap.get(item.parent_id);
            if (parent) {
                parent.children.push(node);
            } else {
                // Parent not found, treat as root
                rootItems.push(node);
            }
        }
    });

    // Sort children by sort_order and name
    const sortChildren = (nodes: ItemTreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.sort_order !== b.sort_order) {
                return a.sort_order - b.sort_order;
            }
            return a.name.localeCompare(b.name);
        });
        nodes.forEach((node) => {
            if (node.children.length > 0) {
                sortChildren(node.children);
            }
        });
    };

    sortChildren(rootItems);

    return rootItems;
}

/**
 * Calculate depth from ltree path
 */
export function getDepthFromPath(path: string): number {
    return path.split('.').length - 1;
}

// ============================================================
// Query Hooks
// ============================================================

/**
 * Hook: Get all items for a workspace (flat list)
 * 
 * @param workspaceId - Workspace ID to fetch items for
 * @param enabled - Whether to enable the query (default: true)
 */
export function useWorkspaceItems(workspaceId: string, enabled = true) {
    return useQuery({
        queryKey: itemKeys.workspace(workspaceId),
        queryFn: async () => {
            const result = await getWorkspaceItems(workspaceId);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data || [];
        },
        enabled: enabled && !!workspaceId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

/**
 * Hook: Get items with metadata (depth, child count)
 * 
 * @param workspaceId - Workspace ID to fetch items for
 */
export function useWorkspaceItemsWithMeta(workspaceId: string) {
    return useQuery({
        queryKey: itemKeys.withMeta(workspaceId),
        queryFn: async () => {
            const result = await getWorkspaceItemsWithMeta(workspaceId);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data || [];
        },
        enabled: !!workspaceId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

/**
 * Hook: Get items as hierarchical tree structure
 * 
 * @param workspaceId - Workspace ID to fetch items for
 */
export function useItemTree(workspaceId: string) {
    return useQuery({
        queryKey: itemKeys.tree(workspaceId),
        queryFn: async () => {
            const result = await getWorkspaceItemsWithMeta(workspaceId);
            if (!result.success) {
                throw new Error(result.error);
            }
            return buildItemTree(result.data || []);
        },
        enabled: !!workspaceId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// ============================================================
// Mutation Hooks
// ============================================================

/**
 * Hook: Move item to new parent with optimistic updates
 */
export function useMoveItem(workspaceId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: moveItem,
        onMutate: async (params: MoveItemParams) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: itemKeys.workspace(workspaceId) });

            // Snapshot previous value
            const previousItems = queryClient.getQueryData<Item[]>(itemKeys.workspace(workspaceId));

            // Optimistically update the cache
            if (previousItems) {
                queryClient.setQueryData<Item[]>(
                    itemKeys.workspace(workspaceId),
                    (old) => {
                        if (!old) return old;
                        return old.map((item) => {
                            if (item.id === params.itemId) {
                                return { ...item, parent_id: params.newParentId };
                            }
                            return item;
                        });
                    }
                );
            }

            return { previousItems };
        },
        onError: (err, params, context) => {
            // Rollback on error
            if (context?.previousItems) {
                queryClient.setQueryData(
                    itemKeys.workspace(workspaceId),
                    context.previousItems
                );
            }
            console.error('[useMoveItem] Error:', err);
        },
        onSettled: () => {
            // Always refetch after mutation
            queryClient.invalidateQueries({ queryKey: itemKeys.workspace(workspaceId) });
        },
    });
}

/**
 * Hook: Create new folder with optimistic updates
 */
export function useCreateFolder(workspaceId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createFolder,
        onMutate: async (params: CreateFolderParams) => {
            await queryClient.cancelQueries({ queryKey: itemKeys.workspace(workspaceId) });

            const previousItems = queryClient.getQueryData<Item[]>(itemKeys.workspace(workspaceId));

            // Optimistically add the new folder
            if (previousItems) {
                const optimisticFolder: Item = {
                    id: `temp-${Date.now()}`,
                    name: params.name,
                    item_type: 'folder',
                    path: 'root.temp',
                    workspace_id: params.workspaceId,
                    created_by: '',
                    document_id: null,
                    parent_id: params.parentId,
                    sort_order: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                queryClient.setQueryData<Item[]>(
                    itemKeys.workspace(workspaceId),
                    [...previousItems, optimisticFolder]
                );
            }

            return { previousItems };
        },
        onError: (err, params, context) => {
            if (context?.previousItems) {
                queryClient.setQueryData(
                    itemKeys.workspace(workspaceId),
                    context.previousItems
                );
            }
            console.error('[useCreateFolder] Error:', err);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.workspace(workspaceId) });
        },
    });
}

/**
 * Hook: Create document item (internal use)
 */
export function useCreateDocumentItem(workspaceId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createDocumentItem,
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.workspace(workspaceId) });
        },
    });
}

/**
 * Hook: Rename item with optimistic updates
 */
export function useRenameItem(workspaceId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: renameItem,
        onMutate: async (params: RenameItemParams) => {
            await queryClient.cancelQueries({ queryKey: itemKeys.workspace(workspaceId) });

            const previousItems = queryClient.getQueryData<Item[]>(itemKeys.workspace(workspaceId));

            // Optimistically update the name
            if (previousItems) {
                queryClient.setQueryData<Item[]>(
                    itemKeys.workspace(workspaceId),
                    (old) => {
                        if (!old) return old;
                        return old.map((item) => {
                            if (item.id === params.itemId) {
                                return { ...item, name: params.newName };
                            }
                            return item;
                        });
                    }
                );
            }

            return { previousItems };
        },
        onError: (err, params, context) => {
            if (context?.previousItems) {
                queryClient.setQueryData(
                    itemKeys.workspace(workspaceId),
                    context.previousItems
                );
            }
            console.error('[useRenameItem] Error:', err);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.workspace(workspaceId) });
        },
    });
}

/**
 * Hook: Delete item with optimistic updates
 */
export function useDeleteItem(workspaceId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteItem,
        onMutate: async (itemId: string) => {
            await queryClient.cancelQueries({ queryKey: itemKeys.workspace(workspaceId) });

            const previousItems = queryClient.getQueryData<Item[]>(itemKeys.workspace(workspaceId));

            // Optimistically remove the item and its descendants
            if (previousItems) {
                const itemToDelete = previousItems.find((item) => item.id === itemId);
                if (itemToDelete) {
                    queryClient.setQueryData<Item[]>(
                        itemKeys.workspace(workspaceId),
                        (old) => {
                            if (!old) return old;
                            // Remove item and all descendants (items whose path starts with this item's path)
                            return old.filter(
                                (item) =>
                                    item.id !== itemId &&
                                    !item.path.startsWith(itemToDelete.path + '.')
                            );
                        }
                    );
                }
            }

            return { previousItems };
        },
        onError: (err, itemId, context) => {
            if (context?.previousItems) {
                queryClient.setQueryData(
                    itemKeys.workspace(workspaceId),
                    context.previousItems
                );
            }
            console.error('[useDeleteItem] Error:', err);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.workspace(workspaceId) });
        },
    });
}

/**
 * Hook: Reorder items with optimistic updates
 */
export function useReorderItems(workspaceId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: reorderItems,
        onMutate: async (params: ReorderItemsParams) => {
            await queryClient.cancelQueries({ queryKey: itemKeys.workspace(workspaceId) });

            const previousItems = queryClient.getQueryData<Item[]>(itemKeys.workspace(workspaceId));

            // Optimistically update sort_order
            if (previousItems) {
                queryClient.setQueryData<Item[]>(
                    itemKeys.workspace(workspaceId),
                    (old) => {
                        if (!old) return old;
                        return old.map((item) => {
                            const newIndex = params.itemIds.indexOf(item.id);
                            if (newIndex !== -1) {
                                return { ...item, sort_order: newIndex };
                            }
                            return item;
                        });
                    }
                );
            }

            return { previousItems };
        },
        onError: (err, params, context) => {
            if (context?.previousItems) {
                queryClient.setQueryData(
                    itemKeys.workspace(workspaceId),
                    context.previousItems
                );
            }
            console.error('[useReorderItems] Error:', err);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.workspace(workspaceId) });
        },
    });
}
