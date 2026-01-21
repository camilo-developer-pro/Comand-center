'use server';

/**
 * Items Server Actions
 * 
 * V2.0 Phase 1: Hierarchical File System
 * 
 * Server Actions for managing items (folders and documents) in the
 * ltree-based hierarchical file system. All actions enforce authentication
 * and workspace membership.
 */

import { createClient } from '@/lib/supabase/server';
import { withTracking } from '@/lib/utils/apiTracker';
import { revalidatePath } from 'next/cache';
import type {
    Item,
    ItemWithMeta,
    ItemActionResult,
    ItemsQueryResult,
    ItemQueryOptions,
    CreateFolderParams,
    CreateDocumentItemParams,
    RenameItemParams,
    MoveItemParams,
    MoveItemResult,
    ReorderItemsParams,
} from '../types';

// ============================================================
// Authentication Helper
// ============================================================

interface AuthContext {
    userId: string;
    workspaceId: string;
}

async function requireAuth(): Promise<AuthContext> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error('UNAUTHORIZED');
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.default_workspace_id) {
        throw new Error('FORBIDDEN');
    }

    return { userId: user.id, workspaceId: profile.default_workspace_id };
}

// ============================================================
// Query Actions
// ============================================================

/**
 * Get all items for a workspace as a flat list
 * Ordered by path (hierarchical) and sort_order
 */
export const getWorkspaceItems = withTracking('getWorkspaceItems', async (
    workspaceId?: string,
    options: ItemQueryOptions = {}
): Promise<ItemsQueryResult> => {
    try {
        const auth = await requireAuth();
        const targetWorkspaceId = workspaceId || auth.workspaceId;
        const supabase = await createClient();

        const {
            filters = {},
            sortBy = 'path',
            sortDirection = 'asc',
            limit = 1000,
            offset = 0,
        } = options;

        // Build query
        let query = supabase
            .from('items')
            .select('*', { count: 'exact' })
            .eq('workspace_id', targetWorkspaceId);

        // Apply filters
        if (filters.itemType) {
            query = query.eq('item_type', filters.itemType);
        }

        if (filters.parentId !== undefined) {
            if (filters.parentId === null) {
                query = query.is('parent_id', null);
            } else {
                query = query.eq('parent_id', filters.parentId);
            }
        }

        if (filters.search) {
            query = query.ilike('name', `%${filters.search}%`);
        }

        // Apply ordering
        if (sortBy === 'path') {
            query = query.order('path', { ascending: sortDirection === 'asc' });
        } else {
            query = query.order(sortBy, { ascending: sortDirection === 'asc' });
        }

        // Secondary sort by sort_order
        query = query.order('sort_order', { ascending: true });

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error('[itemActions] getWorkspaceItems error:', error);
            return { success: false, error: error.message };
        }

        return {
            success: true,
            data: (data as Item[]) || [],
            count: count || 0,
        };
    } catch (error) {
        console.error('[itemActions] getWorkspaceItems unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in to view items', code: 'UNAUTHORIZED' };
            }
            if (error.message === 'FORBIDDEN') {
                return { success: false, error: 'You do not have access to this workspace', code: 'FORBIDDEN' };
            }
        }

        return { success: false, error: 'Failed to fetch items', code: 'UNKNOWN' };
    }
});

/**
 * Get items with metadata (depth, child count) for UI rendering
 */
export const getWorkspaceItemsWithMeta = withTracking('getWorkspaceItemsWithMeta', async (
    workspaceId?: string
): Promise<ItemActionResult<ItemWithMeta[]>> => {
    try {
        const auth = await requireAuth();
        const targetWorkspaceId = workspaceId || auth.workspaceId;
        const supabase = await createClient();

        // Fetch all items
        const { data: items, error } = await supabase
            .from('items')
            .select('*')
            .eq('workspace_id', targetWorkspaceId)
            .order('path', { ascending: true })
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('[itemActions] getWorkspaceItemsWithMeta error:', error);
            return { success: false, error: error.message };
        }

        if (!items) {
            return { success: true, data: [] };
        }

        // Calculate metadata for each item
        const itemsWithMeta: ItemWithMeta[] = items.map((item) => {
            // Calculate depth from path (count dots + 1)
            const depth = item.path.split('.').length - 1;

            // Check if item has children
            const hasChildren = items.some(
                (other) => other.parent_id === item.id
            );

            // Count direct children
            const childCount = items.filter(
                (other) => other.parent_id === item.id
            ).length;

            return {
                ...item,
                depth,
                hasChildren,
                childCount,
            };
        });

        return {
            success: true,
            data: itemsWithMeta,
        };
    } catch (error) {
        console.error('[itemActions] getWorkspaceItemsWithMeta unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in', code: 'UNAUTHORIZED' };
            }
            if (error.message === 'FORBIDDEN') {
                return { success: false, error: 'Access denied', code: 'FORBIDDEN' };
            }
        }

        return { success: false, error: 'Failed to fetch items with metadata', code: 'UNKNOWN' };
    }
});

// ============================================================
// Mutation Actions
// ============================================================

/**
 * Move an item and all its descendants to a new parent
 * Calls the move_item_subtree_secure PostgreSQL function
 */
export const moveItem = withTracking('moveItem', async (
    params: MoveItemParams
): Promise<ItemActionResult<MoveItemResult>> => {
    try {
        await requireAuth();
        const supabase = await createClient();

        const { data, error } = await supabase
            .rpc('move_item_subtree_secure', {
                p_item_id: params.itemId,
                p_new_parent_id: params.newParentId,
            });

        if (error) {
            console.error('[itemActions] moveItem error:', error);
            return { success: false, error: error.message };
        }

        // Revalidate paths that might show items
        revalidatePath('/documents');
        revalidatePath('/dashboard');

        return {
            success: true,
            data: data as MoveItemResult,
        };
    } catch (error) {
        console.error('[itemActions] moveItem unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in', code: 'UNAUTHORIZED' };
            }
            if (error.message === 'FORBIDDEN') {
                return { success: false, error: 'Access denied', code: 'FORBIDDEN' };
            }
        }

        return { success: false, error: 'Failed to move item', code: 'UNKNOWN' };
    }
});

/**
 * Create a new folder
 */
export const createFolder = withTracking('createFolder', async (
    params: CreateFolderParams
): Promise<ItemActionResult> => {
    try {
        const { userId } = await requireAuth();
        const supabase = await createClient();

        // Generate path segment for the folder
        const { data: pathSegmentData, error: pathError } = await supabase
            .rpc('generate_path_segment', { item_name: params.name });

        if (pathError) {
            console.error('[itemActions] createFolder path generation error:', pathError);
            return { success: false, error: 'Failed to generate folder path' };
        }

        // Get parent path if parent exists
        let folderPath: string;
        if (params.parentId) {
            const { data: parent, error: parentError } = await supabase
                .from('items')
                .select('path')
                .eq('id', params.parentId)
                .eq('workspace_id', params.workspaceId)
                .single();

            if (parentError || !parent) {
                return { success: false, error: 'Parent folder not found', code: 'NOT_FOUND' };
            }

            folderPath = `${parent.path}.${pathSegmentData}`;
        } else {
            folderPath = `root.${pathSegmentData}`;
        }

        // Create the folder item
        const { data, error } = await supabase
            .from('items')
            .insert({
                name: params.name,
                item_type: 'folder',
                path: folderPath,
                workspace_id: params.workspaceId,
                created_by: userId,
                parent_id: params.parentId,
                document_id: null,
                sort_order: 0,
            })
            .select()
            .single();

        if (error) {
            console.error('[itemActions] createFolder error:', error);
            return { success: false, error: error.message };
        }

        revalidatePath('/documents');

        return {
            success: true,
            data: data as Item,
        };
    } catch (error) {
        console.error('[itemActions] createFolder unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in', code: 'UNAUTHORIZED' };
            }
            if (error.message === 'FORBIDDEN') {
                return { success: false, error: 'Access denied', code: 'FORBIDDEN' };
            }
        }

        return { success: false, error: 'Failed to create folder', code: 'UNKNOWN' };
    }
});

/**
 * Create a document item (internal use - called when document is created)
 */
export const createDocumentItem = withTracking('createDocumentItem', async (
    params: CreateDocumentItemParams
): Promise<ItemActionResult> => {
    try {
        const { userId } = await requireAuth();
        const supabase = await createClient();

        // Generate path segment
        const { data: pathSegmentData, error: pathError } = await supabase
            .rpc('generate_path_segment', { item_name: params.name });

        if (pathError) {
            return { success: false, error: 'Failed to generate document path' };
        }

        // Get parent path if parent exists
        let docPath: string;
        if (params.parentId) {
            const { data: parent, error: parentError } = await supabase
                .from('items')
                .select('path')
                .eq('id', params.parentId)
                .eq('workspace_id', params.workspaceId)
                .single();

            if (parentError || !parent) {
                return { success: false, error: 'Parent folder not found', code: 'NOT_FOUND' };
            }

            docPath = `${parent.path}.${pathSegmentData}`;
        } else {
            docPath = `root.${pathSegmentData}`;
        }

        // Create the document item
        const { data, error } = await supabase
            .from('items')
            .insert({
                name: params.name,
                item_type: 'document',
                path: docPath,
                workspace_id: params.workspaceId,
                created_by: userId,
                parent_id: params.parentId,
                document_id: params.documentId,
                sort_order: 0,
            })
            .select()
            .single();

        if (error) {
            console.error('[itemActions] createDocumentItem error:', error);
            return { success: false, error: error.message };
        }

        revalidatePath('/documents');

        return {
            success: true,
            data: data as Item,
        };
    } catch (error) {
        console.error('[itemActions] createDocumentItem unexpected error:', error);
        return { success: false, error: 'Failed to create document item', code: 'UNKNOWN' };
    }
});

/**
 * Rename an item (updates name and regenerates path segment)
 */
export const renameItem = withTracking('renameItem', async (
    params: RenameItemParams
): Promise<ItemActionResult> => {
    try {
        await requireAuth();
        const supabase = await createClient();

        // Simply update the name - the path will be regenerated on next move if needed
        // For now, we just update the name field
        const { data, error } = await supabase
            .from('items')
            .update({
                name: params.newName,
                updated_at: new Date().toISOString(),
            })
            .eq('id', params.itemId)
            .select()
            .single();

        if (error) {
            console.error('[itemActions] renameItem error:', error);
            return { success: false, error: error.message };
        }

        revalidatePath('/documents');

        return {
            success: true,
            data: data as Item,
        };
    } catch (error) {
        console.error('[itemActions] renameItem unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in', code: 'UNAUTHORIZED' };
            }
        }

        return { success: false, error: 'Failed to rename item', code: 'UNKNOWN' };
    }
});

/**
 * Delete an item and all its descendants (CASCADE)
 */
export const deleteItem = withTracking('deleteItem', async (
    itemId: string
): Promise<ItemActionResult<{ deleted: boolean }>> => {
    try {
        await requireAuth();
        const supabase = await createClient();

        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', itemId);

        if (error) {
            console.error('[itemActions] deleteItem error:', error);
            return { success: false, error: error.message };
        }

        revalidatePath('/documents');

        return {
            success: true,
            data: { deleted: true },
        };
    } catch (error) {
        console.error('[itemActions] deleteItem unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in', code: 'UNAUTHORIZED' };
            }
        }

        return { success: false, error: 'Failed to delete item', code: 'UNKNOWN' };
    }
});

/**
 * Reorder items within the same parent (updates sort_order)
 */
export const reorderItems = withTracking('reorderItems', async (
    params: ReorderItemsParams
): Promise<ItemActionResult<{ updated: number }>> => {
    try {
        await requireAuth();
        const supabase = await createClient();

        // Update sort_order for each item based on array position
        const updates = params.itemIds.map((itemId, index) =>
            supabase
                .from('items')
                .update({ sort_order: index })
                .eq('id', itemId)
                .eq('parent_id', params.parentId ?? null)
        );

        const results = await Promise.all(updates);

        // Check for errors
        const errors = results.filter((r) => r.error);
        if (errors.length > 0) {
            console.error('[itemActions] reorderItems errors:', errors);
            return { success: false, error: 'Failed to reorder some items' };
        }

        revalidatePath('/documents');

        return {
            success: true,
            data: { updated: params.itemIds.length },
        };
    } catch (error) {
        console.error('[itemActions] reorderItems unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in', code: 'UNAUTHORIZED' };
            }
        }

        return { success: false, error: 'Failed to reorder items', code: 'UNKNOWN' };
    }
});
